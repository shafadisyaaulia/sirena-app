"use client";

import { useState } from "react";
import { RecoveryFlagStatus } from "@prisma/client";

export function AcknowledgeFlagButton({ flagId, currentStatus }: { flagId: string; currentStatus: RecoveryFlagStatus }) {
  const [loading, setLoading] = useState(false);

  if (currentStatus === "ACKNOWLEDGED" || currentStatus === "CLOSED") {
    return <span className="text-xs text-slate-400 font-medium">Selesai</span>;
  }

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      // Panggil API endpoint / server action untuk merubah status recovery flag
      await fetch(`/api/recovery-flags/${flagId}/acknowledge`, { method: "POST" });
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAcknowledge}
      disabled={loading}
      className="text-xs px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
    >
      {loading ? "Proses..." : "Konfirmasi (ACK)"}
    </button>
  );
}