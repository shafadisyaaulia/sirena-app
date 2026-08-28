import { Severity } from "@prisma/client";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    NORMAL: "bg-emerald-100 text-emerald-800 border-emerald-200",
    WASPADA: "bg-amber-100 text-amber-800 border-amber-200",
    SIAGA: "bg-orange-100 text-orange-800 border-orange-200",
    AWAS: "bg-red-100 text-red-800 border-red-200 animate-pulse",
  };

  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${styles[severity] || "bg-slate-100 text-slate-700"}`}>
      {severity}
    </span>
  );
}