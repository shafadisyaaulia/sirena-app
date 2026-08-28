"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface GateProps {
  gate: {
    id: string;
    currentOpeningPercent: number;
  };
}

export function ActuateGateForm({ gate }: GateProps) {
  const router = useRouter();
  const [opening, setOpening] = useState(gate.currentOpeningPercent);
  const [loading, setLoading] = useState(false);

  // Menyinkronkan state slider saat data dari Server Component berubah
  useEffect(() => {
    setOpening(gate.currentOpeningPercent);
  }, [gate.currentOpeningPercent]);

  const handleActuate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gates/actuate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateId: gate.id,
          openingPercent: opening,
          mode: "MANUAL_IN_THE_LOOP",
          triggerReason: "Penyesuaian manual operator dari dashboard",
        }),
      });

      if (res.ok) {
        // Memicu re-fetch Server Component untuk memperbarui tampilan UI & 3D secara seamless
        router.refresh();
      } else {
        const json = await res.json();
        alert(
          json.error
            ? typeof json.error === "string"
              ? json.error
              : JSON.stringify(json.error)
            : "Gagal menyimpan perubahan bukaan."
        );
      }
    } catch (err) {
      console.error("Gagal melakukan aktuasi pintu air:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
      <input
        type="range"
        min="0"
        max="100"
        value={opening}
        onChange={(e) => setOpening(Number(e.target.value))}
        className="w-full accent-teal-600 cursor-pointer"
      />
      <button
        onClick={handleActuate}
        disabled={loading || opening === gate.currentOpeningPercent}
        className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-all whitespace-nowrap"
      >
        {loading ? "Menyimpan..." : "Set Bukaan"}
      </button>
    </div>
  );
}