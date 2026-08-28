import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "AWAS":
      return "bg-red-600 text-white";
    case "SIAGA":
      return "bg-orange-500 text-white";
    case "WASPADA":
      return "bg-yellow-400 text-black";
    default:
      return "bg-emerald-500 text-white";
  }
}
