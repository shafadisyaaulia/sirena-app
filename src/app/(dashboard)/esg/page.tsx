import { prisma } from "@/lib/prisma";
import { Card, CardTitle, StatValue } from "@/components/ui/Card";
import { formatNumber } from "@/lib/utils";
import { EsgTrendChart } from "@/components/charts/EsgTrendChart";
import { GenerateSnapshotButton } from "@/components/GenerateSnapshotButton";
import { ExportButtons } from "@/components/ExportButtons";
import { 
  ShieldCheck, 
  Droplets, 
  Sprout, 
  TrendingDown, 
  History, 
  LineChart,
  Award
} from "lucide-react";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function EsgPage() {
  const snapshots = await prisma.esgMetricSnapshot.findMany({
    orderBy: { periodStart: "asc" },
    take: 24,
  });

  const latest = snapshots[snapshots.length - 1];
  const totalDiverted = snapshots.reduce((sum, s) => sum + s.waterDivertedM3, 0);
  const totalCleanWater = snapshots.reduce((sum, s) => sum + s.cleanWaterSuppliedM3, 0);
  const totalIrrigation = snapshots.reduce((sum, s) => sum + s.irrigationWaterSuppliedM3, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6 text-slate-800 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-teal-100 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-100">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <span className="px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                Impact &amp; Sustainability
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                ESG Impact Dashboard
              </h1>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium pl-1">
            ESG-1..ESG-5 — Indikator terpublikasi &amp; dapat diaudit untuk mitra CSR / impact-financing.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <GenerateSnapshotButton />
          <ExportButtons />
        </div>
      </div>

      {/* Grid Statistik Metric ESG */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-teal-100 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-bold">Total Air Dialihkan</p>
            <Droplets className="w-5 h-5 text-teal-600" />
          </div>
          <StatValue className="text-2xl font-black text-slate-900">
            {formatNumber(totalDiverted / 1_000_000, 2)}{" "}
            <span className="text-xs font-normal text-slate-500">juta m³</span>
          </StatValue>
          <span className="inline-block px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-md text-[11px] font-semibold">
            Diversion Volume (ESG-1)
          </span>
        </Card>

        <Card className="bg-white border-teal-100 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-bold">Air Bersih Tersalurkan</p>
            <Award className="w-5 h-5 text-blue-500" />
          </div>
          <StatValue className="text-2xl font-black text-slate-900">
            {formatNumber(totalCleanWater / 1000, 1)}{" "}
            <span className="text-xs font-normal text-slate-500">ribu m³</span>
          </StatValue>
          <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[11px] font-semibold">
            Clean Water Supply (ESG-2)
          </span>
        </Card>

        <Card className="bg-white border-teal-100 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-bold">Air Irigasi Tersalurkan</p>
            <Sprout className="w-5 h-5 text-emerald-600" />
          </div>
          <StatValue className="text-2xl font-black text-slate-900">
            {formatNumber(totalIrrigation / 1000, 1)}{" "}
            <span className="text-xs font-normal text-slate-500">ribu m³</span>
          </StatValue>
          <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold">
            Irrigation Water (ESG-3)
          </span>
        </Card>

        <Card className="bg-white border-teal-100 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-bold">Reduksi Risiko (Terbaru)</p>
            <TrendingDown className="w-5 h-5 text-indigo-500" />
          </div>
          <StatValue className="text-2xl font-black text-slate-900">
            {latest?.floodRiskReductionPct != null ? `${formatNumber(latest.floodRiskReductionPct)}%` : "-"}
          </StatValue>
          <span className="inline-block px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[11px] font-semibold">
            Flood Risk Reduction (ESG-4)
          </span>
        </Card>
      </div>

      {/* Chart Tren Visualisasi */}
      <Card className="bg-white border-teal-100 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <LineChart className="w-5 h-5 text-teal-600" />
          <CardTitle className="text-base font-bold text-slate-800">
            Tren Waktu Tunggu Peringatan &amp; Tingkat Pemanfaatan
          </CardTitle>
        </div>

        {snapshots.length > 0 ? (
          <div className="pt-2">
            <EsgTrendChart
              data={snapshots.map((s) => ({
                periode: new Date(s.periodStart).toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
                leadTime: s.avgWarningLeadTimeMin ?? 0,
                utilisasi: (s.systemUtilizationRate ?? 0) * 100,
                reduksiRisiko: s.floodRiskReductionPct ?? 0,
              }))}
            />
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <p className="text-sm font-medium">
              Belum ada snapshot ESG yang tersimpan.
            </p>
            <p className="text-xs text-slate-400">
              Klik &quot;Buat Snapshot Periode Ini&quot; di bagian atas untuk mencetak metrics.
            </p>
          </div>
        )}
      </Card>

      {/* Tabel Audit Snapshot */}
      <Card className="bg-white border-teal-100 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <History className="w-5 h-5 text-teal-600" />
          <CardTitle className="text-base font-bold text-slate-800">
            Riwayat Snapshot (Auditable Log)
          </CardTitle>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                <th className="pb-3 px-2">Periode Operational</th>
                <th className="pb-3 px-2">Air Dialihkan (m³)</th>
                <th className="pb-3 px-2">Lead Time (mnt)</th>
                <th className="pb-3 px-2">Pemanfaatan</th>
                <th className="pb-3 px-2 text-right">Reduksi Risiko (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshots.length > 0 ? (
                snapshots
                  .slice()
                  .reverse()
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors text-slate-700 font-medium">
                      <td className="py-3 px-2 text-xs font-semibold text-slate-900">
                        {new Date(s.periodStart).toLocaleDateString("id-ID")} –{" "}
                        {new Date(s.periodEnd).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-2 font-mono text-slate-800">{formatNumber(s.waterDivertedM3)}</td>
                      <td className="py-3 px-2">{s.avgWarningLeadTimeMin != null ? `${formatNumber(s.avgWarningLeadTimeMin)} min` : "-"}</td>
                      <td className="py-3 px-2">
                        {s.systemUtilizationRate != null ? (
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold text-xs border border-teal-100">
                            {formatNumber(s.systemUtilizationRate * 100)}%
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-emerald-600">
                        {s.floodRiskReductionPct != null ? `${formatNumber(s.floodRiskReductionPct)}%` : "-"}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                    Tidak ada riwayat snapshot untuk ditampilkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}