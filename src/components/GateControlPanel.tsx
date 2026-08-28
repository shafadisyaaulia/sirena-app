"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface GateDto {
  id: string;
  name: string;
  type: string;
  widthM: number;
  openingHeightM: number;
  currentOpeningPercent: number;
}

export function ActuateGateForm({ gate }: { gate: GateDto }) {
  const router = useRouter();
  const [opening, setOpening] = useState(gate.currentOpeningPercent);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(mode: "MANUAL" | "MANUAL_IN_THE_LOOP") {
    if (!reason.trim()) {
      setError("Alasan aktuasi wajib diisi untuk keperluan audit (GA-4).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gates/actuate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateId: gate.id,
          openingPercent: opening,
          mode,
          triggerReason: reason,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Gagal mengaktuasi pintu");
      }

      setReason("");
      router.refresh();
    } catch (err: any) {
      setError(String(err.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <div>
        <div className="flex justify-between text-xs font-semibold mb-1">
          <span className="text-slate-600">Atur Bukaan Target</span>
          <span className="text-teal-700 font-bold">{opening}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={opening}
          onChange={(e) => setOpening(Number(e.target.value))}
          className="w-full accent-teal-600 cursor-pointer"
        />
      </div>

      <input
        type="text"
        placeholder="Alasan aktuasi (wajib untuk log audit)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          disabled={loading}
          onClick={() => submit("MANUAL_IN_THE_LOOP")}
          className="flex-1 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700 transition disabled:opacity-50"
        >
          Konfirmasi & Eksekusi
        </button>
        <button
          disabled={loading}
          onClick={() => submit("MANUAL")}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          Override (GA-3)
        </button>
      </div>
    </div>
  );
}