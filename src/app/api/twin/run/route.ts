import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runDigitalTwin } from "@/lib/hydrology/digitalTwin";
import { prisma } from "@/lib/prisma";

/**
 * Memicu satu eksekusi Digital Twin. Dipanggil oleh:
 *  - node-cron scheduler (trigger=SCHEDULED, lihat src/workers/twinWorker.ts)
 *  - tombol "Jalankan Simulasi" di dashboard operator (trigger=MANUAL)
 *  - webhook rain-event dari ingest worker saat curah hujan melewati ambang
 *    pemicu awal (trigger=RAIN_EVENT)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN" && role !== "OPERATOR") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const run = await runDigitalTwin({
      trigger: "MANUAL",
      triggeredByUserId: (session.user as any).id,
    });
    return NextResponse.json(run);
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function GET() {
  // Endpoint ringan untuk polling status run terbaru dari dashboard.
  const latest = await prisma.digitalTwinRun.findFirst({
    orderBy: { startedAt: "desc" },
    include: { hydrograph: { orderBy: { tMinutes: "asc" } } },
  });
  return NextResponse.json(latest);
}

/**
 * Mereset riwayat simulasi di database agar tampilan status pipeline
 * kembali ke posisi awal (WAITING / IDLE).
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN" && role !== "OPERATOR") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    // Menghapus seluruh riwayat simulasi agar tidak ada status COMPLETED yang terbaca
    await prisma.digitalTwinRun.deleteMany({});
    
    return NextResponse.json({ 
      success: true, 
      message: "Seluruh data simulasi berhasil dibersihkan" 
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}