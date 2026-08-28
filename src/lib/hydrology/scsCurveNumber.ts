/**
 * DT-4: Hujan efektif per blok waktu via metode SCS Curve Number.
 * CN adalah parameter yang dapat dikonfigurasi (HydrologyParameterSet.curveNumberCN)
 * agar dapat dikalibrasi ulang seiring data tutupan lahan membaik (lihat PRD §13).
 */

export interface ScsCnResult {
  /** Hujan efektif kumulatif tiap blok waktu (mm) */
  cumulativeEffectiveRainfallMm: number[];
  /** Hujan efektif inkremental tiap blok waktu (mm) — dipakai sebagai input Nakayasu */
  incrementalEffectiveRainfallMm: number[];
  potentialMaxRetentionMm: number; // S
  initialAbstractionMm: number; // Ia
}

/**
 * Q = (P - Ia)^2 / (P - Ia + S),  Ia = 0.2 S,  S = 25400/CN - 254
 * P = hujan kumulatif hingga blok ke-i (mm)
 */
export function scsCurveNumberEffectiveRainfall(
  incrementalRainfallMm: number[],
  curveNumberCN: number
): ScsCnResult {
  const S = 25400 / curveNumberCN - 254; // mm
  const Ia = 0.2 * S;

  const cumulativeRainfall: number[] = [];
  incrementalRainfallMm.reduce((acc, v, i) => {
    const next = acc + v;
    cumulativeRainfall[i] = next;
    return next;
  }, 0);

  const cumulativeEffective = cumulativeRainfall.map((P) => {
    if (P <= Ia) return 0;
    const numerator = Math.pow(P - Ia, 2);
    const denominator = P - Ia + S;
    return denominator > 0 ? numerator / denominator : 0;
  });

  const incrementalEffective = cumulativeEffective.map((v, i) =>
    i === 0 ? v : Math.max(0, v - cumulativeEffective[i - 1])
  );

  return {
    cumulativeEffectiveRainfallMm: cumulativeEffective,
    incrementalEffectiveRainfallMm: incrementalEffective,
    potentialMaxRetentionMm: S,
    initialAbstractionMm: Ia,
  };
}
