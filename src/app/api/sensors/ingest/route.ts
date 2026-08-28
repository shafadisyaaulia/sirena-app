import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * FN-1: menerima pembacaan muka air dari 3 titik (hulu, hilir, oxbow) dan
 * curah hujan dari stasiun BMKG. Dipanggil oleh data-logger IoT di lapangan
 * atau job polling BMKG/satelit (lihat src/workers/ingestWorker.ts).
 *
 * Autentikasi sederhana via header X-Sensor-Token (bandingkan dengan
 * SENSOR_INGEST_TOKEN) — untuk produksi, pertimbangkan mTLS atau token
 * per-perangkat yang tersimpan di tabel terpisah.
 */
const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("water_level"),
    sensorId: z.string(),
    timestamp: z.string().datetime(),
    levelM: z.number(),
  }),
  z.object({
    type: z.literal("rainfall"),
    gaugeId: z.string(),
    timestamp: z.string().datetime(),
    rainfallMm: z.number().nonnegative(),
    source: z.enum(["BMKG_STATION", "SATELLITE_GPM", "SATELLITE_HIMAWARI"]).default("BMKG_STATION"),
  }),
]);

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-sensor-token");
  if (!token || token !== process.env.SENSOR_INGEST_TOKEN) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.type === "water_level") {
    const sensor = await prisma.waterLevelSensor.findUnique({ where: { id: data.sensorId } });
    if (!sensor) return NextResponse.json({ error: "Sensor tidak ditemukan" }, { status: 404 });

    await prisma.$transaction([
      prisma.waterLevelReading.create({
        data: {
          sensorId: data.sensorId,
          timestamp: new Date(data.timestamp),
          levelM: data.levelM,
          isOnline: true,
        },
      }),
      prisma.waterLevelSensor.update({
        where: { id: data.sensorId },
        data: { lastSeenAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  // rainfall
  const gauge = await prisma.rainGauge.findUnique({ where: { id: data.gaugeId } });
  if (!gauge) return NextResponse.json({ error: "Stasiun tidak ditemukan" }, { status: 404 });

  await prisma.rainReading.create({
    data: {
      gaugeId: data.gaugeId,
      timestamp: new Date(data.timestamp),
      rainfallMm: data.rainfallMm,
      source: data.source,
    },
  });

  return NextResponse.json({ ok: true });
}
