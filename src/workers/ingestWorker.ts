/**
 * Worker polling data curah hujan BMKG (DT-1) dan satelit GPM/Himawari
 * sebagai pelengkap (DT-2). Jalankan via `npm run worker:ingest`.
 *
 * Catatan implementasi: endpoint BMKG/GPM/Himawari aktual perlu disesuaikan
 * dengan kontrak API resmi masing-masing penyedia (lihat README §6 —
 * bagian ini sengaja distrukturkan sebagai contoh yang dapat diganti).
 */
import cron from "node-cron";
import { prisma } from "../lib/prisma";

const SCHEDULE = process.env.INGEST_CRON_SCHEDULE ?? "*/5 * * * *"; // tiap 5 menit
const STALE_THRESHOLD_MIN = 30; // toleransi sebelum dianggap "hilang" -> fallback satelit

cron.schedule(SCHEDULE, async () => {
  console.log(`[ingestWorker] Polling data curah hujan @ ${new Date().toISOString()}`);

  const gauges = await prisma.rainGauge.findMany({ where: { isActive: true } });

  for (const gauge of gauges) {
    try {
      const latest = await fetchBmkgReading(gauge.stationCode);
      if (latest) {
        await prisma.rainReading.create({
          data: {
            gaugeId: gauge.id,
            timestamp: latest.timestamp,
            rainfallMm: latest.rainfallMm,
            source: "BMKG_STATION",
          },
        });
        continue;
      }
    } catch (err) {
      console.warn(`[ingestWorker] Gagal ambil data BMKG utk ${gauge.stationCode}:`, err);
    }

    // DT-2: fallback ke satelit jika stasiun darat tidak melapor.
    const lastReading = await prisma.rainReading.findFirst({
      where: { gaugeId: gauge.id },
      orderBy: { timestamp: "desc" },
    });
    const minutesSinceLast = lastReading
      ? (Date.now() - lastReading.timestamp.getTime()) / 60000
      : Infinity;

    if (minutesSinceLast > STALE_THRESHOLD_MIN) {
      try {
        const satellite = await fetchSatelliteReading(gauge.latitude, gauge.longitude);
        if (satellite) {
          await prisma.rainReading.create({
            data: {
              gaugeId: gauge.id,
              timestamp: satellite.timestamp,
              rainfallMm: satellite.rainfallMm,
              source: satellite.source,
            },
          });
          console.log(`[ingestWorker] Fallback satelit dipakai untuk stasiun ${gauge.stationCode}`);
        }
      } catch (err) {
        console.warn(`[ingestWorker] Fallback satelit gagal utk ${gauge.stationCode}:`, err);
      }
    }
  }
});

async function fetchBmkgReading(
  stationCode: string
): Promise<{ timestamp: Date; rainfallMm: number } | null> {
  const base = process.env.BMKG_API_BASE_URL;
  const apiKey = process.env.BMKG_API_KEY;
  if (!base) return null;

  const res = await fetch(`${base}/rainfall/${stationCode}/latest`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });
  if (!res.ok) return null;
  const json = await res.json();
  // Sesuaikan pemetaan field dengan skema respons BMKG aktual.
  return { timestamp: new Date(json.timestamp), rainfallMm: Number(json.rainfall_mm) };
}

async function fetchSatelliteReading(
  lat: number,
  lng: number
): Promise<{ timestamp: Date; rainfallMm: number; source: "SATELLITE_GPM" | "SATELLITE_HIMAWARI" } | null> {
  const base = process.env.GPM_HIMAWARI_API_BASE_URL;
  const apiKey = process.env.GPM_HIMAWARI_API_KEY;
  if (!base) return null;

  const res = await fetch(`${base}/rainfall?lat=${lat}&lng=${lng}`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });
  if (!res.ok) return null;
  const json = await res.json();
  return {
    timestamp: new Date(json.timestamp),
    rainfallMm: Number(json.rainfall_mm),
    source: json.source === "HIMAWARI" ? "SATELLITE_HIMAWARI" : "SATELLITE_GPM",
  };
}
