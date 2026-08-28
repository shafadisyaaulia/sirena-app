import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">{children}</h3>;
}

export function StatValue({ children }: { children: React.ReactNode }) {
  return <p className="text-2xl font-bold text-sirena-navy">{children}</p>;
}
