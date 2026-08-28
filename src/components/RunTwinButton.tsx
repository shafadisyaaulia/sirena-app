"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";

export function RunTwinButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Jalankan Simulasi
  async function handleClick() {
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/twin/run", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Gagal menjalankan simulasi");
      }

      setSuccess(true);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setError(String(err.message ?? err));
    } finally {
      setIsLoading(false);
    }
  }

  // Reset Simulasi ke Status Awal (IDLE)
  async function handleReset() {
    setError(null);
    setSuccess(false);
    setIsResetting(true);

    try {
      const res = await fetch("/api/twin/run", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Gagal mereset simulasi");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setError(String(err.message ?? err));
    } finally {
      setIsResetting(false);
    }
  }

  const isWorking = isLoading || isPending || isResetting;

  return (
    <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
      <div className="flex items-center gap-2 w-full md:w-auto">
        {/* Tombol Reset (Menyatu tanpa buat file baru) */}
        <button
          type="button"
          onClick={handleReset}
          disabled={isWorking}
          title="Reset Status Simulasi"
          className="p-3.5 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw className={`w-5 h-5 ${isResetting ? "animate-spin text-teal-600" : ""}`} />
        </button>

        {/* Tombol Utama Simulasi */}
        <button
          onClick={handleClick}
          disabled={isWorking}
          className={`w-full md:w-auto px-6 py-3.5 rounded-2xl text-sm md:text-base font-extrabold flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-95 cursor-pointer ${
            isWorking
              ? "bg-slate-400 text-white cursor-not-allowed"
              : success
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
              : "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-teal-500/20"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Memproses Simulasi...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>Simulasi Selesai</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-white" />
              <span>Jalankan Simulasi Prediksi</span>
            </>
          )}
        </button>
      </div>

      {/* Indikator Progres */}
      {isLoading && (
        <span className="text-xs font-bold text-teal-700 flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          Menghitung ulang model hidrologi...
        </span>
      )}

      {/* Alert Error */}
      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}