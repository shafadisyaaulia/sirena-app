/**
 * DT-3: Hyetograph rencana — rumus Mononobe untuk kurva IDF sintetik,
 * disusun ke deret waktu hujan blok via Alternating Block Method (ABM).
 */

export interface MononobeParams {
  /** Curah hujan rencana harian (mm), dari areal rainfall / analisis frekuensi */
  r24: number;
  /** Durasi total badai rencana (jam) */
  durationHr: number;
  /** Panjang tiap blok waktu (jam), umumnya 1 jam atau sama dengan langkah waktu model */
  timeStepHr: number;
}

/**
 * Intensitas hujan Mononobe pada durasi t (jam):
 *   It = (R24 / 24) * (24 / t) ^ (2/3)
 */
export function mononobeIntensity(r24: number, tHr: number): number {
  if (tHr <= 0) return 0;
  return (r24 / 24) * Math.pow(24 / tHr, 2 / 3);
}

/**
 * Menghasilkan kurva kumulatif intensitas Mononobe pada setiap kelipatan
 * time step, lalu menyusunnya ke hyetograph blok via Alternating Block
 * Method: blok intensitas tertinggi diletakkan di tengah durasi badai,
 * sisanya disusun berselang-seling menurun ke kedua sisi.
 */
export function mononobeAlternatingBlockHyetograph(params: MononobeParams): number[] {
  const { r24, durationHr, timeStepHr } = params;
  const nSteps = Math.round(durationHr / timeStepHr);

  // 1) Kedalaman hujan kumulatif pada setiap t = k * timeStep
  const cumulativeDepth: number[] = [];
  for (let k = 1; k <= nSteps; k++) {
    const t = k * timeStepHr;
    const intensity = mononobeIntensity(r24, t); // mm/jam
    cumulativeDepth.push(intensity * t); // mm
  }

  // 2) Kedalaman inkremental tiap blok (selisih kumulatif berurutan)
  const incrementalDepth: number[] = cumulativeDepth.map((depth, i) =>
    i === 0 ? depth : depth - cumulativeDepth[i - 1]
  );

  // 3) Urutkan menurun, lalu susun ke pola alternating-block:
  //    blok terbesar di tengah, sisanya bergantian kiri-kanan.
  const sortedDesc = [...incrementalDepth].sort((a, b) => b - a);
  const hyetograph: number[] = new Array(nSteps).fill(0);
  const center = Math.floor((nSteps - 1) / 2);
  let left = center;
  let right = center + 1;
  let placeLeft = true;

  for (const depth of sortedDesc) {
    if (placeLeft) {
      hyetograph[left] = depth;
      left -= 1;
    } else {
      if (right < nSteps) {
        hyetograph[right] = depth;
        right += 1;
      } else if (left >= 0) {
        hyetograph[left] = depth;
        left -= 1;
      }
    }
    placeLeft = !placeLeft;
  }

  return hyetograph; // mm per time-step, panjang = nSteps
}
