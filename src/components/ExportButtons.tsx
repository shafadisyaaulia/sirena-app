"use client";

import { FileDown } from "lucide-react";

/** ESG-5: unduh laporan PDF/CSV untuk periode 90 hari terakhir. */
export function ExportButtons() {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <div className="flex gap-2">
      <a
        href={`/api/esg/export?from=${from}&to=${to}&format=pdf`}
        className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        <FileDown size={16} /> PDF
      </a>
      <a
        href={`/api/esg/export?from=${from}&to=${to}&format=csv`}
        className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        <FileDown size={16} /> CSV
      </a>
    </div>
  );
}
