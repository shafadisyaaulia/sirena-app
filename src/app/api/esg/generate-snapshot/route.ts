import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aggregateEsgMetrics } from "@/lib/esg/aggregate";

/**
 * Membuat snapshot ESG untuk periode 30 hari terakhir. Untuk produksi,
 * jadwalkan ini via cron bulanan/mingguan (mis. tambahkan ke twinWorker.ts
 * atau worker terpisah `worker:esg`) alih-alih hanya tombol manual.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

  const snapshot = await aggregateEsgMetrics(periodStart, periodEnd);
  return NextResponse.json(snapshot);
}
