"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function GenerateSnapshotButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      await fetch("/api/esg/generate-snapshot", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
    >
      <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
      Buat Snapshot Periode Ini
    </button>
  );
}
