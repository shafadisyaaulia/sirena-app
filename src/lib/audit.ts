import { prisma } from "@/lib/prisma";

/**
 * Kebutuhan Non-Fungsional §9 — Auditabilitas: setiap proses prediksi,
 * aktuasi, dan peringatan harus tercatat cukup detail untuk tinjauan
 * pascakejadian dan pelaporan ESG.
 */
export async function writeAuditLog(params: {
  actorId?: string;
  action: string;
  entity: string;
  entityId: string;
  detail?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      detail: params.detail as any,
    },
  });
}
