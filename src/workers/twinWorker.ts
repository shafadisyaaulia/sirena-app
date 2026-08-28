/**
 * Worker terpisah (dijalankan via `npm run worker:twin`, idealnya sebagai
 * proses/PM2/container long-running terpisah dari proses Next.js) yang
 * menjalankan siklus Sensing -> Prediction -> Decision-making secara
 * berkala (Chapter II.2.3 / PRD §7).
 *
 * Next.js API routes bersifat request-scoped dan tidak cocok untuk
 * scheduler jangka panjang, sehingga node-cron dijalankan di proses Node
 * mandiri ini.
 */
import cron from "node-cron";
import { runDigitalTwin } from "../lib/hydrology/digitalTwin";

const SCHEDULE = process.env.TWIN_CRON_SCHEDULE ?? "*/10 * * * *"; // tiap 10 menit

console.log(`[twinWorker] Menjadwalkan Digital Twin run dengan pola cron: ${SCHEDULE}`);

cron.schedule(SCHEDULE, async () => {
  console.log(`[twinWorker] Menjalankan Digital Twin run terjadwal @ ${new Date().toISOString()}`);
  try {
    const run = await runDigitalTwin({ trigger: "SCHEDULED" });
    console.log(
      `[twinWorker] Selesai. Puncak debit prediksi: ${run.peakDischargeM3s?.toFixed(1)} m3/s`
    );
  } catch (err) {
    console.error("[twinWorker] Gagal menjalankan Digital Twin:", err);
  }
});
