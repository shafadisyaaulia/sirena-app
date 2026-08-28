import { prisma } from "@/lib/prisma";
import { computeArealRainfallThiessen, StationRainfall } from "./thiessen";
import { mononobeAlternatingBlockHyetograph } from "./mononobeAbm";
import { scsCurveNumberEffectiveRainfall } from "./scsCurveNumber";
import {
  buildNakayasuUnitHydrograph,
  convolveInflowHydrograph,
  findPeak,
} from "./nakayasu";
import { routeReservoirAndRecommendStrategy } from "./reservoirRouting";
import { evaluateSeverity } from "@/lib/notifications/thresholds";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { writeAuditLog } from "@/lib/audit";

export interface RunDigitalTwinInput {
  trigger: "SCHEDULED" | "MANUAL" | "RAIN_EVENT";
  triggeredByUserId?: string;
}

/**
 * Orkestrator utama Digital Twin (DT-3 s.d. DT-8).
 * Alur: Thiessen -> Mononobe/ABM -> SCS-CN -> Nakayasu -> Reservoir Routing
 * -> bandingkan thd kapasitas -> simpan run + hidrograf -> evaluasi ambang
 * -> picu notifikasi/recovery flag bila perlu.
 */
export async function runDigitalTwin(input: RunDigitalTwinInput) {
  const parameterSet = await prisma.hydrologyParameterSet.findFirstOrThrow({
    where: { isActive: true },
  });

  const run = await prisma.digitalTwinRun.create({
    data: {
      status: "RUNNING",
      trigger: input.trigger,
      parameterSetId: parameterSet.id,
    },
  });

  try {
    // ---- 1) Sensing: ambil pembacaan hujan & muka air terbaru ----
    const gauges = await prisma.rainGauge.findMany({
      where: { isActive: true },
      include: { thiessenPolygons: true },
    });

    const latestReadings: StationRainfall[] = await Promise.all(
      gauges.map(async (g) => {
        const latest = await prisma.rainReading.findFirst({
          where: { gaugeId: g.id },
          orderBy: { timestamp: "desc" },
        });
        return {
          gaugeId: g.id,
          weight: g.thiessenPolygons?.weight ?? 0,
          rainfallMm: latest?.rainfallMm ?? null,
        };
      })
    );

    // DT-2: fallback ke satelit bila seluruh stasiun darat mati — diasumsikan
    // sudah diblend ke dalam `latestReadings` oleh job ingest satelit terpisah
    // (lihat src/workers/ingestWorker.ts) yang menulis RainSource.SATELLITE_*
    // ke RainReading saat stasiun darat tidak melapor > interval toleransi.
    const arealResult = computeArealRainfallThiessen(latestReadings);

    const oxbowSensor = await prisma.waterLevelSensor.findFirst({
      where: { location: "OXBOW", isActive: true },
    });
    const oxbowReading = oxbowSensor
      ? await prisma.waterLevelReading.findFirst({
          where: { sensorId: oxbowSensor.id },
          orderBy: { timestamp: "desc" },
        })
      : null;

    const degradedSensors: string[] = arealResult.missingGaugeIds;

    // ---- 2) Prediction: hyetograph -> hujan efektif -> HSS Nakayasu ----
    const hyetograph = mononobeAlternatingBlockHyetograph({
      r24: arealResult.arealRainfallMm,
      durationHr: parameterSet.stormDurationHr,
      timeStepHr: parameterSet.timeStepMin / 60,
    });

    const scsResult = scsCurveNumberEffectiveRainfall(
      hyetograph,
      parameterSet.curveNumberCN
    );

    const unitHydrograph = buildNakayasuUnitHydrograph(
      {
        catchmentAreaKm2: parameterSet.catchmentAreaKm2,
        riverLengthKm: parameterSet.riverLengthKm,
        tg: parameterSet.tg,
        alpha: parameterSet.alpha,
        timeStepHr: parameterSet.timeStepMin / 60,
      },
      parameterSet.stormDurationHr * 2 // ekor resesi diperpanjang
    );

    const inflowHydrograph = convolveInflowHydrograph(
      scsResult.incrementalEffectiveRainfallMm,
      unitHydrograph,
      parameterSet.timeStepMin / 60
    );

    const peak = findPeak(inflowHydrograph);

    // ---- 3) Decision-making: reservoir routing & strategi pengalihan ----
    const currentStorageM3 = estimateStorageFromLevel(
      oxbowReading?.levelM,
      parameterSet
    );

    const { routed, strategy, peakOutflowM3s } = routeReservoirAndRecommendStrategy(
      inflowHydrograph,
      {
        storageCapacityM3: parameterSet.storageCapacityM3,
        gateCapacityM3s: parameterSet.gateCapacityM3s,
        initialStorageM3: currentStorageM3,
        timeStepHr: parameterSet.timeStepMin / 60,
      }
    );

    const exceedsIntakeCapacity = peak.inflowM3s > parameterSet.gateCapacityM3s;

    // ---- Simpan hasil run (DT-8: auditable) ----
    await prisma.hydrographPoint.createMany({
      data: routed.map((p) => ({
        runId: run.id,
        tMinutes: Math.round(p.tHr * 60),
        inflowM3s: p.inflowM3s,
        outflowM3s: p.outflowM3s,
        storageM3: p.storageM3,
      })),
    });

    const updatedRun = await prisma.digitalTwinRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        arealRainfallMm: arealResult.arealRainfallMm,
        degradedSensors,
        peakDischargeM3s: peak.inflowM3s,
        timeToPeakMin: Math.round(peak.tHr * 60),
        storageUsedM3: currentStorageM3,
        storageAvailableM3: parameterSet.storageCapacityM3 - currentStorageM3,
        exceedsIntakeCapacity,
        diversionStrategy: strategy as any,
      },
    });

    await writeAuditLog({
      action: "TWIN_RUN_COMPLETED",
      entity: "DigitalTwinRun",
      entityId: run.id,
      detail: { peakInflowM3s: peak.inflowM3s, peakOutflowM3s, exceedsIntakeCapacity },
    });

    // ---- 4/5) Actuation & Dissemination trigger: evaluasi ambang ----
    const severity = evaluateSeverity({
      peakDischargeM3s: peak.inflowM3s,
      designCapacityM3s: parameterSet.gateCapacityM3s,
      oxbowLevelM: oxbowReading?.levelM,
      operationalMaxLevelM: parameterSet.operationalMaxLevelM,
    });

    let recoveryFlagId: string | undefined;

    // RT-1: penandaan event otomatis saat kondisi banjir melampaui tingkat
    // keparahan yang ditetapkan (AWAS).
    if (severity === "AWAS") {
      const flag = await prisma.recoveryFlag.create({
        data: {
          severity,
          triggerReading: `Debit puncak prediksi ${peak.inflowM3s.toFixed(0)} m3/s pada t+${Math.round(peak.tHr * 60)} menit; muka air oxbow ${oxbowReading?.levelM ?? "n/a"} mdpl.`,
          twinRunId: run.id,
        },
      });
      recoveryFlagId = flag.id;
    }

    if (severity !== "NORMAL") {
      await dispatchNotification({
        severity,
        title: `Status ${severity}: prediksi debit puncak ${peak.inflowM3s.toFixed(0)} m3/s`,
        message: strategy.rationale,
        twinRunId: run.id,
        recoveryFlagId,
      });
    }

    return updatedRun;
  } catch (err: any) {
    await prisma.digitalTwinRun.update({
      where: { id: run.id },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: String(err?.message ?? err) },
    });
    throw err;
  }
}

/**
 * Mengestimasi volume tersimpan di kolam dari elevasi muka air terbaca.
 * Simplifikasi linear antara elevasi dasar basin dan elevasi maksimum
 * operasional — ganti dengan kurva elevasi-storage hasil survei batimetri
 * (Chosyi, 2025) bila tersedia data lengkap per elevasi.
 */
function estimateStorageFromLevel(
  levelM: number | undefined,
  parameterSet: { operationalMaxLevelM: number; storageCapacityM3: number }
): number {
  if (levelM === undefined) return 0;
  const basinBaseElevation = 2.5; // dari Table 2.1: existing bathymetric survey range +2.5..+8.0
  const fraction = Math.min(
    1,
    Math.max(
      0,
      (levelM - basinBaseElevation) /
        (parameterSet.operationalMaxLevelM - basinBaseElevation)
    )
  );
  return fraction * parameterSet.storageCapacityM3;
}
