/**
 * DT-5: Hidrograf banjir rencana via Hidrograf Satuan Sintetik Nakayasu.
 * Menghasilkan ordinat HSS lalu mengkonvolusikannya dengan hujan efektif
 * (dari SCS-CN) untuk menghasilkan hidrograf debit masuk (inflow hydrograph).
 */

export interface NakayasuParams {
  catchmentAreaKm2: number;
  riverLengthKm: number;
  /** Waktu konsentrasi / time of concentration (jam) — formula Tg, dapat dikalibrasi */
  tg: number;
  /** Koefisien puncak Nakayasu, umumnya 2 (kisaran 1.5–3 tergantung karakter DAS) */
  alpha: number;
  timeStepHr: number;
}

export interface UnitHydrographPoint {
  tHr: number;
  ordinateM3sPerMm: number; // m3/s per mm hujan efektif
}

/**
 * Parameter waktu HSS Nakayasu:
 *   Tr = 0.5*Tg .. Tg (waktu naik hujan satuan), disederhanakan Tr = 0.5*Tg
 *   Tp = Tg + 0.8*Tr  (time to peak)
 *   T0.3 = alpha * Tg (waktu turun ke 30% puncak)
 *   Qp = (A * Ro) / (3.6 * (0.3*Tp + T0.3))   [Ro = 1 mm untuk unit hydrograph]
 */
export function buildNakayasuUnitHydrograph(
  params: NakayasuParams,
  durationHr: number
): UnitHydrographPoint[] {
  const { catchmentAreaKm2, tg, alpha, timeStepHr } = params;

  const Tr = 0.5 * tg;
  const Tp = tg + 0.8 * Tr;
  const T03 = alpha * tg;
  const Ro = 1; // mm, definisi unit hydrograph

  const Qp = (catchmentAreaKm2 * Ro) / (3.6 * (0.3 * Tp + T03));

  const points: UnitHydrographPoint[] = [];
  const nSteps = Math.round(durationHr / timeStepHr);

  for (let i = 0; i <= nSteps; i++) {
    const t = i * timeStepHr;
    let Q: number;

    if (t <= Tp) {
      // Sisi naik: kurva parabolik pangkat 2.4
      Q = Tp > 0 ? Qp * Math.pow(t / Tp, 2.4) : 0;
    } else if (t <= Tp + T03) {
      // Sisi turun tahap 1: turun ke 0.3 Qp
      Q = Qp * Math.pow(0.3, (t - Tp) / T03);
    } else if (t <= Tp + T03 + 1.5 * T03) {
      // Sisi turun tahap 2: turun ke 0.3^1.5 dari Qp
      Q = Qp * Math.pow(0.3, ((t - Tp) + 0.5 * T03) / (1.5 * T03));
    } else {
      // Sisi turun tahap 3 (ekor resesi lambat)
      Q = Qp * Math.pow(0.3, ((t - Tp) + 1.5 * T03) / (2 * T03));
    }

    points.push({ tHr: t, ordinateM3sPerMm: Math.max(0, Q) });
  }

  return points;
}

/**
 * Konvolusi hujan efektif per blok waktu dengan HSS untuk menghasilkan
 * hidrograf debit masuk total (inflow hydrograph) dalam m3/s per time-step.
 */
export function convolveInflowHydrograph(
  effectiveRainfallMmPerStep: number[],
  unitHydrograph: UnitHydrographPoint[],
  timeStepHr: number
): { tHr: number; inflowM3s: number }[] {
  const nRain = effectiveRainfallMmPerStep.length;
  const nUH = unitHydrograph.length;
  const nOut = nRain + nUH - 1;

  const outflow = new Array(nOut).fill(0);

  for (let i = 0; i < nRain; i++) {
    const rainDepth = effectiveRainfallMmPerStep[i];
    if (rainDepth === 0) continue;
    for (let j = 0; j < nUH; j++) {
      outflow[i + j] += rainDepth * unitHydrograph[j].ordinateM3sPerMm;
    }
  }

  return outflow.map((inflowM3s, idx) => ({
    tHr: idx * timeStepHr,
    inflowM3s,
  }));
}

/** Mencari debit puncak dan waktu puncak dari hidrograf hasil konvolusi. */
export function findPeak(hydrograph: { tHr: number; inflowM3s: number }[]) {
  return hydrograph.reduce(
    (peak, pt) => (pt.inflowM3s > peak.inflowM3s ? pt : peak),
    { tHr: 0, inflowM3s: 0 }
  );
}
