import { prisma } from "@/lib/prisma";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { AcknowledgeFlagButton } from "@/components/AcknowledgeFlagButton";
import { SendNotificationForm } from "@/components/SendNotificationForm";
import { BellRing, ShieldAlert, Radio, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [notifications, flags] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { deliveries: true },
    }),
    prisma.recoveryFlag.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { acknowledgedBy: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-slate-50 text-slate-800 p-6 md:p-10 space-y-8 font-sans">
      {/* Header Section */}
      <div className="border-b border-teal-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-teal-300 bg-teal-50 text-teal-800 text-sm font-bold mb-2">
            <Activity className="w-4 h-4 text-teal-600 animate-pulse" />
            Sistem Kebencanaan &amp; Mitigasi Real-Time
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Pusat Notifikasi &amp; Pemulihan Kebencanaan
          </h1>
          <p className="text-base text-slate-700 font-medium mt-1.5">
            Penyebaran Peringatan Dini Multi-Kanal (FN-1–FN-7) &amp; Penanganan Respon Pemulihan (RT-1–RT-3)
          </p>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-teal-200 shadow-sm text-sm font-semibold text-slate-700">
          <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
          Status Multi-Kanal: <span className="font-extrabold text-teal-700">Terhubung</span>
        </div>
      </div>

      {/* Card Section: Kirim Peringatan Manual */}
      <div className="bg-white border border-teal-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl">
            <Radio className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Inisiasi Peringatan Manual</h2>
            <p className="text-sm text-slate-700 font-medium">
              Sebarkan sinyal darurat terverifikasi ke seluruh kanal komunikasi publik dan tim lapangan.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100">
          <SendNotificationForm />
        </div>
      </div>

      {/* Card Section: Peringatan Terkirim */}
      <div className="bg-white border border-teal-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl">
              <BellRing className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Riwayat Peringatan Terkirim</h2>
              <p className="text-sm text-slate-700 font-medium">Log penyebaran pesan darurat ke kanal komunikasi terhubung</p>
            </div>
          </div>
          <span className="text-sm font-bold text-teal-800 bg-teal-50 border border-teal-200 px-4 py-2 rounded-full">
            {notifications.length} Riwayat
          </span>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
              <p className="text-sm text-slate-500 font-medium">Belum ada riwayat peringatan yang dikirimkan.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="p-5 rounded-2xl bg-white border border-teal-200 hover:border-teal-400 hover:shadow-md transition-all space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={n.severity} />
                    <h3 className="font-bold text-base text-slate-900">{n.title}</h3>
                  </div>
                  <time className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    {new Date(n.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>

                {/* Message Body - Ukuran teks diperbesar & dipertegas */}
                <p className="text-sm md:text-base text-slate-800 font-medium leading-relaxed">
                  {n.message}
                </p>

                {/* Delivery Badges */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 mr-1">Kanal Terkirim:</span>
                  {n.deliveries.map((d) => {
                    const channelNames: Record<string, string> = {
                      APP: "Aplikasi SIRENA",
                      WA: "WhatsApp Gateway",
                      USSD: "USSD Darurat",
                      SMS: "Broadcast SMS",
                    };

                    const channelLabel = channelNames[d.channel] || d.channel;

                    return (
                      <span
                        key={d.id}
                        className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl border flex items-center gap-2 shadow-2xs ${
                          d.status === "SENT" || d.status === "DELIVERED"
                            ? "border-emerald-300 text-emerald-900 bg-emerald-50"
                            : d.status === "FAILED"
                            ? "border-rose-300 text-rose-900 bg-rose-50"
                            : "border-slate-300 text-slate-800 bg-slate-100"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            d.status === "SENT" || d.status === "DELIVERED"
                              ? "bg-emerald-600 animate-pulse"
                              : d.status === "FAILED"
                              ? "bg-rose-600"
                              : "bg-slate-500"
                          }`}
                        />
                        <span className="font-bold">{channelLabel}</span>
                        <span className="opacity-40">|</span>
                        <span className="text-xs font-bold uppercase tracking-wide">
                          {d.status === "SENT" ? "Terkirim" : d.status === "DELIVERED" ? "Diterima" : "Gagal"}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Table Section: Penandaan Event Recovery */}
      <div className="bg-white border border-teal-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl">
            <ShieldAlert className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Penandaan Event Recovery Support</h2>
            <p className="text-sm text-slate-700 font-medium">
              Pengelolaan status peristiwa darurat dan konfirmasi verifikasi tindakan petugas
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-teal-200 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-teal-200 bg-teal-50/80 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-4 px-4">Waktu Kejadian</th>
                <th className="py-4 px-4">Tingkat Keparahan</th>
                <th className="py-4 px-4">Ringkasan Pemicu IoT</th>
                <th className="py-4 px-4">Status &amp; Verifikator</th>
                <th className="py-4 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100 text-sm text-slate-800 font-medium">
              {flags.map((f) => (
                <tr key={f.id} className="hover:bg-teal-50/30 transition-colors">
                  <td className="py-4 px-4 text-slate-700 font-semibold whitespace-nowrap">
                    {new Date(f.createdAt).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td className="py-4 px-4 text-slate-900 font-bold max-w-xs leading-relaxed">
                    {f.triggerReading}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-extrabold text-slate-900">{f.status}</span>
                    {f.acknowledgedBy && (
                      <span className="block text-xs text-teal-800 font-bold mt-1">
                        Oleh: {f.acknowledgedBy.name || f.acknowledgedBy.email}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <AcknowledgeFlagButton flagId={f.id} currentStatus={f.status} />
                  </td>
                </tr>
              ))}
              {flags.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                    Belum ada penandaan peristiwa pemulihan aktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}