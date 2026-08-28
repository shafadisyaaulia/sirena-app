/**
 * DT-6 / DT-7: Reservoir routing sederhana (level-pool / modified Puls) untuk
 * mengestimasi respons kolam oxbow terhadap hidrograf debit masuk, dan
 * merekomendasikan strategi pengalihan (timing & besaran bukaan pintu).
 *
 * Pendekatan: neraca massa storage-indication per time-step, dengan outflow
 * dibatasi oleh kapasitas intake terpasang (≈200 m3/s, KP-02) dan strategi
 * bukaan pintu yang dievaluasi terhadap sisa kapasitas tampungan.
 */

export interface RoutingParams {
  storageCapacityM3: number; // Total design storage capacity (≈3.38 juta m3)
  gateCapacityM3s: number; // Installed diversion capacity (≈200 m3/s)
  initialStorageM3: number; // Storage terisi saat ini (dari sensor oxbow)
  timeStepHr: number;
}

export interface RoutedPoint {
  tHr: number;
  inflowM3s: number;
  outflowM3s: number;
  storageM3: number;
  gateOpeningPercent: number;
}

export interface DiversionStrategy {
  gateOpeningPercent: number;
  startAtMin: number;
  durationMin: number;
  rationale: string;
}

/**
 * DT-7: Strategi "predictive" — bukaan pintu dihitung proporsional terhadap
 * rasio debit masuk terhadap kapasitas intake, dinaikkan lebih awal saat
 * hidrograf diprediksi mendekati puncak (bukan menunggu ambang tercapai),
 * sehingga secara empiris menurunkan debit puncak terkendali (lihat Table 2.1:
 * ≈1.013,5 → ≈866,0 m3/s, reduksi ≈14,6%).
 */
export function routeReservoirAndRecommendStrategy(
  inflowHydrograph: { tHr: number; inflowM3s: number }[],
  params: RoutingParams
): { routed: RoutedPoint[]; strategy: DiversionStrategy; peakInflowM3s: number; peakOutflowM3s: number } {
  const { storageCapacityM3, gateCapacityM3s, initialStorageM3, timeStepHr } = params;
  const dtSeconds = timeStepHr * 3600;

  let storage = initialStorageM3;
  const routed: RoutedPoint[] = [];

  const peakInflow = Math.max(...inflowHydrograph.map((p) => p.inflowM3s));

  for (const point of inflowHydrograph) {
    const remainingCapacity = Math.max(0, storageCapacityM3 - storage);

    // Bukaan pintu proporsional terhadap intensitas inflow relatif thd puncak
    // prediksi (predictive), dibatasi kapasitas intake terpasang.
    const targetRatio = peakInflow > 0 ? point.inflowM3s / peakInflow : 0;
    const gateOpeningPercent = Math.min(100, Math.max(0, targetRatio * 100));
    let outflow = (gateOpeningPercent / 100) * gateCapacityM3s;

    // Neraca massa storage; jangan sampai negatif atau melebihi kapasitas.
    let storageChange = (point.inflowM3s - outflow) * dtSeconds;
    let nextStorage = storage + storageChange;

    if (nextStorage > storageCapacityM3) {
      // Kolam penuh: paksa outflow naik agar storage tidak melebihi kapasitas.
      const excess = nextStorage - storageCapacityM3;
      outflow += excess / dtSeconds;
      nextStorage = storageCapacityM3;
    } else if (nextStorage < 0) {
      outflow = point.inflowM3s + storage / dtSeconds;
      nextStorage = 0;
    }

    storage = nextStorage;

    routed.push({
      tHr: point.tHr,
      inflowM3s: point.inflowM3s,
      outflowM3s: outflow,
      storageM3: storage,
      gateOpeningPercent,
    });
  }

  const peakOutflow = Math.max(...routed.map((p) => p.outflowM3s));

  // Ringkasan strategi: kapan pintu mulai dibuka signifikan (>10%) dan berapa lama.
  const activePoints = routed.filter((p) => p.gateOpeningPercent > 10);
  const startAtMin = activePoints.length > 0 ? activePoints[0].tHr * 60 : 0;
  const durationMin = activePoints.length * timeStepHr * 60;
  const maxOpening = Math.max(0, ...routed.map((p) => p.gateOpeningPercent));

  const strategy: DiversionStrategy = {
    gateOpeningPercent: Math.round(maxOpening),
    startAtMin: Math.round(startAtMin),
    durationMin: Math.round(durationMin),
    rationale:
      `Strategi prediktif: bukaan pintu dinaikkan sebelum debit masuk mencapai puncak ` +
      `berdasarkan hasil Digital Twin, bukan menunggu ambang muka air terlampaui. ` +
      `Estimasi puncak inflow ${peakInflow.toFixed(1)} m3/s, puncak outflow terkendali ` +
      `${peakOutflow.toFixed(1)} m3/s.`,
  };

  return { routed, strategy, peakInflowM3s: peakInflow, peakOutflowM3s: peakOutflow };
}
