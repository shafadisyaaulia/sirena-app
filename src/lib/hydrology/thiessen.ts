/**
 * DT-1: Curah hujan wilayah via metode poligon Thiessen.
 *
 * Bobot tiap stasiun (weight) dihitung sekali di luar hot-path (mis. via GIS
 * offline / turf.js voronoi) dan disimpan di tabel ThiessenPolygon. Fungsi di
 * sini hanya mengaplikasikan bobot terhadap pembacaan hujan real-time,
 * sehingga tetap ringan dijalankan tiap kali Digital Twin di-run.
 */

export interface StationRainfall {
  gaugeId: string;
  /** Bobot Thiessen stasiun ini, 0..1 (dari ThiessenPolygon.weight) */
  weight: number;
  /** Curah hujan pada gauge ini untuk time-step tertentu (mm) */
  rainfallMm: number | null; // null = data hilang / sensor offline
}

export interface ArealRainfallResult {
  arealRainfallMm: number;
  usedFallback: boolean;
  missingGaugeIds: string[];
}

/**
 * Menghitung curah hujan wilayah tertimbang.
 * DT-2: bila satu/lebih stasiun tidak melapor, bobotnya dialihkan secara
 * proporsional ke stasiun yang tersedia (graceful degradation) — bukan
 * langsung gagal total. Jika SEMUA stasiun darat hilang, caller harus
 * memakai data satelit sebagai pengganti penuh (lihat satelliteFallback.ts).
 */
export function computeArealRainfallThiessen(
  stations: StationRainfall[]
): ArealRainfallResult {
  const missing = stations.filter((s) => s.rainfallMm === null);
  const available = stations.filter((s) => s.rainfallMm !== null);

  if (available.length === 0) {
    return { arealRainfallMm: 0, usedFallback: true, missingGaugeIds: missing.map((s) => s.gaugeId) };
  }

  const availableWeightSum = available.reduce((sum, s) => sum + s.weight, 0);
  if (availableWeightSum <= 0) {
    return { arealRainfallMm: 0, usedFallback: true, missingGaugeIds: missing.map((s) => s.gaugeId) };
  }

  // Redistribusi bobot secara proporsional agar total tetap 1.
  const arealRainfallMm = available.reduce((sum, s) => {
    const renormalizedWeight = s.weight / availableWeightSum;
    return sum + renormalizedWeight * (s.rainfallMm as number);
  }, 0);

  return {
    arealRainfallMm,
    usedFallback: missing.length > 0,
    missingGaugeIds: missing.map((s) => s.gaugeId),
  };
}
