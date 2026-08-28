import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

/** RT-1/RT-2: daftar penandaan event Recovery Support, untuk BPBD. */
export async function GET() {
  const flags = await prisma.recoveryFlag.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { twinRun: true, acknowledgedBy: true },
  });
  return NextResponse.json(flags);
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["ACKNOWLEDGED", "FORWARDED_TO_BPBD", "CLOSED"]),
  notes: z.string().optional(),
});

/** RT-3: mencatat waktu antara penandaan dan tindak lanjut (acknowledge) untuk pelaporan kinerja. */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN" && role !== "BPBD" && role !== "OPERATOR") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.recoveryFlag.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      acknowledgedAt: new Date(),
      acknowledgedById: (session.user as any).id,
    },
  });

  await writeAuditLog({
    actorId: (session.user as any).id,
    action: "RECOVERY_FLAG_UPDATED",
    entity: "RecoveryFlag",
    entityId: updated.id,
    detail: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}
