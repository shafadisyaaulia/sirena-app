import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import type { EsgMetricSnapshot } from "@prisma/client";

/**
 * ESG-5: ekspor laporan (PDF/CSV) untuk evaluasi kinerja pemangku
 * kepentingan serta kolaborasi CSR/impact-financing.
 */
export function buildEsgCsv(snapshots: EsgMetricSnapshot[]): string {
  const rows = snapshots.map((s) => ({
    periode_mulai: s.periodStart.toISOString(),
    periode_selesai: s.periodEnd.toISOString(),
    air_dialihkan_m3: s.waterDivertedM3,
    air_bersih_m3: s.cleanWaterSuppliedM3,
    air_irigasi_m3: s.irrigationWaterSuppliedM3,
    lead_time_menit_rata2: s.avgWarningLeadTimeMin ?? "",
    tingkat_pemanfaatan: s.systemUtilizationRate ?? "",
    reduksi_risiko_banjir_persen: s.floodRiskReductionPct ?? "",
  }));
  return Papa.unparse(rows);
}

export function buildEsgPdf(snapshots: EsgMetricSnapshot[]): Buffer {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("SIRENA — Laporan ESG Dashboard", 14, 18);
  doc.setFontSize(10);
  doc.text("Oxbow Krueng Tamiang, Kec. Karang Baru, Kab. Aceh Tamiang", 14, 24);

  autoTable(doc, {
    startY: 30,
    head: [[
      "Periode",
      "Air Dialihkan (m3)",
      "Air Bersih (m3)",
      "Irigasi (m3)",
      "Lead Time (mnt)",
      "Pemanfaatan",
      "Reduksi Risiko (%)",
    ]],
    body: snapshots.map((s) => [
      `${s.periodStart.toISOString().slice(0, 10)} – ${s.periodEnd.toISOString().slice(0, 10)}`,
      s.waterDivertedM3.toFixed(0),
      s.cleanWaterSuppliedM3.toFixed(0),
      s.irrigationWaterSuppliedM3.toFixed(0),
      s.avgWarningLeadTimeMin?.toFixed(0) ?? "-",
      s.systemUtilizationRate ? `${(s.systemUtilizationRate * 100).toFixed(0)}%` : "-",
      s.floodRiskReductionPct?.toFixed(1) ?? "-",
    ]),
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export async function recordExport(params: {
  type: "PDF" | "CSV";
  periodStart: Date;
  periodEnd: Date;
  filePath: string;
  generatedBy?: string;
}) {
  return prisma.exportReport.create({ data: params });
}
