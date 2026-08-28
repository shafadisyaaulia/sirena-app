import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h3 className={cn("text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1", className)}>
      {children}
    </h3>
  );
}

export function StatValue({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn("text-2xl font-bold text-sirena-navy", className)}>
      {children}
    </p>
  );
}