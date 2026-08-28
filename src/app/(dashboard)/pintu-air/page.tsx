import nextDynamic from "next/dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/Card";
import { ActuateGateForm } from "@/components/ActuateGateForm";
import { History, Box } from "lucide-react";

// Konfigurasi Next.js Route Segment
export const dynamic = "force-dynamic";

// Dynamic Import untuk engine visualisasi 3D agar tidak di-render secara SSR
const DigitalTwinViewer = nextDynamic(
  () =>
    import("@/components/DigitalTwinViewer").then(
      (mod) => mod.DigitalTwinViewer || mod.default
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[450px] bg-[#060B10] rounded-2xl flex items-center justify-center text-slate-400 font-mono text-sm">
        Memuat Engine Visualisasi 3D Digital Twin...
      </div>
    ),
  }
);

export default async function GateControlPage() {
  // Fetch data paralel langsung dari PostgreSQL via Prisma
  const [gates, actuationEvents] = await Promise.all([
    prisma.gate.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.gateActuationEvent.findMany({
      orderBy: { timestamp: "desc" },
      take: 20,
      include: {
        gate: true,
        confirmedByUser: true,
      },
    }),
  ]);

  // Mengambil persentase bukaan dari pintu air pertama
  const activeGateOpening = gates[0]?.currentOpeningPercent ?? 50;

  return (
    <div className="space-y-6 text-slate-800 p-4 md:p-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Digital Twin &amp; Kontrol Pintu Air
        </h1>
        <p className="text-sm text-slate-500">
          Modul GA-1..GA-4: Visualisasi 3D real-time &amp; kontrol terintegrasi Sluice Intake / Flushing Gate.
        </p>
      </div>

      {/* Frame Visualisasi 3D Digital Twin */}
      <Card className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-teal-600" />
            <CardTitle className="text-base font-bold text-slate-800">
              Simulasi Visual 3D Sungai &amp; Gerbang Pintu Air
            </CardTitle>
          </div>
          <span className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-200 font-semibold">
            Status: Interaktif (3D Engine)
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl">
          {/* Meneruskan props score dan gateOpening agar sinkron dengan model 3D */}
          <DigitalTwinViewer score={activeGateOpening} gateOpening={activeGateOpening} />
        </div>
      </Card>

      {/* Grid Status & Form Kontrol Pintu Air Terpasang */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gates.map((gate) => (
          <Card key={gate.id} className="p-5 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">{gate.name}</h3>
                <p className="text-xs text-slate-500">
                  Tipe: {gate.type} | Lebar: {gate.widthM}m
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  gate.isManualOverride
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-teal-100 text-teal-800 border border-teal-200"
                }`}
              >
                {gate.isManualOverride ? "MANUAL OVERRIDE" : "AUTO ROUTING"}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Bukaan Pintu Saat Ini</span>
                <span className="text-teal-700 font-bold">{gate.currentOpeningPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${gate.currentOpeningPercent}%` }}
                />
              </div>
            </div>

            {/* Mengirim objek gate lengkap ke Client Component */}
            <ActuateGateForm gate={gate} />
          </Card>
        ))}

        {gates.length === 0 && (
          <Card className="col-span-1 md:col-span-2 p-6 text-center text-slate-400 border border-dashed border-slate-300 bg-white rounded-2xl">
            Belum ada data pintu air terdaftar di database.
          </Card>
        )}
      </div>

      {/* Log Riwayat Aktuasi Pintu Air (GA-4 Audit Log) */}
      <Card className="p-5 border border-slate-200 bg-white rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-teal-600" />
          <CardTitle className="text-base font-bold text-slate-800">
            Riwayat Aktuasi Pintu Air (GA-4 Audit Log)
          </CardTitle>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">Waktu</th>
                <th>Nama Pintu</th>
                <th>Mode</th>
                <th>Perubahan Bukaan</th>
                <th>Alasan Pemicu</th>
                <th>Eksekutor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actuationEvents.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-medium">
                    {new Date(event.timestamp).toLocaleString("id-ID")}
                  </td>
                  <td className="font-bold text-slate-900">{event.gate.name}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {event.mode}
                    </span>
                  </td>
                  <td>
                    <span className="text-slate-500">{event.openingPercentBefore}%</span> &rarr;{" "}
                    <span className="font-bold text-teal-700">{event.openingPercentAfter}%</span>
                  </td>
                  <td className="max-w-xs truncate">{event.triggerReason}</td>
                  <td>{event.confirmedByUser?.name ?? "Sistem Otomatis"}</td>
                </tr>
              ))}
              {actuationEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Belum ada riwayat aktuasi pintu air.
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