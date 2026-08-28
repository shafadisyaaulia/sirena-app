import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z.object({
  gateId: z.string(),
  openingPercent: z.number().min(0).max(100),
  mode: z.enum(["AUTO", "MANUAL", "MANUAL_IN_THE_LOOP"]),
  triggerReason: z.string().min(3),
  twinRunId: z.string().optional(),
});

/**
 * GA-1..GA-4: mengaktifkan pintu air.
 *  - MANUAL / MANUAL_IN_THE_LOOP mensyaratkan sesi operator/admin (GA-2, GA-3).
 *  - AUTO hanya dipanggil oleh worker sistem (service-to-service, lihat
 *    catatan di bawah) — bukan dari klien browser — sampai fase otonom
 *    penuh tervalidasi (roadmap Tahap 6).
 *  - Setiap panggilan dicatat lengkap dengan before/after (GA-4).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (data.mode !== "AUTO") {
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "OPERATOR") {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
  } else {
    // Panggilan AUTO harus memakai token layanan internal, bukan sesi user.
    const internalToken = req.headers.get("x-internal-service-token");
    if (!internalToken || internalToken !== process.env.SENSOR_INGEST_TOKEN) {
      return NextResponse.json({ error: "Tidak diizinkan (service token)" }, { status: 403 });
    }
  }

  const gate = await prisma.gate.findUnique({ where: { id: data.gateId } });
  if (!gate) return NextResponse.json({ error: "Pintu tidak ditemukan" }, { status: 404 });

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.gateActuationEvent.create({
      data: {
        gateId: data.gateId,
        mode: data.mode,
        triggerReason: data.triggerReason,
        openingPercentBefore: gate.currentOpeningPercent,
        openingPercentAfter: data.openingPercent,
        twinRunId: data.twinRunId,
        confirmedByUserId: session ? (session.user as any).id : undefined,
      },
    });

    await tx.gate.update({
      where: { id: data.gateId },
      data: { currentOpeningPercent: data.openingPercent },
    });

    return created;
  });

  await writeAuditLog({
    actorId: session ? (session.user as any).id : undefined,
    action: "GATE_ACTUATED",
    entity: "Gate",
    entityId: data.gateId,
    detail: { mode: data.mode, openingPercent: data.openingPercent, reason: data.triggerReason },
  });

  return NextResponse.json(event);
}
export async function GET() {
  try {
    const gates = await prisma.gate.findMany({
      include: {
        events: {
          take: 5,
          orderBy: { timestamp: "desc" },
          include: {
            confirmedByUser: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: gates });
  } catch (error) {
    console.error("Gagal mengambil data pintu air:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pintu air" },
      { status: 500 }
    );
  }
}