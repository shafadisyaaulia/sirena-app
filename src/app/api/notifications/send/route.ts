import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  severity: z.enum(["NORMAL", "WASPADA", "SIAGA", "AWAS"]),
  title: z.string().min(3),
  message: z.string().min(3),
});

/** Pengiriman notifikasi manual oleh operator/BPBD (di luar trigger otomatis Digital Twin). */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN" && role !== "OPERATOR" && role !== "BPBD") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const notification = await dispatchNotification(parsed.data);
  return NextResponse.json(notification);
}

export async function GET() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { deliveries: true },
  });
  return NextResponse.json(notifications);
}
