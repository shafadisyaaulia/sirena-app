import { prisma } from "@/lib/prisma";
import { channelsForSeverity, Severity } from "./thresholds";
import { sendWhatsAppMessage } from "./whatsapp";
import { sendUssdBroadcast } from "./ussd";
import { writeAuditLog } from "@/lib/audit";

export interface DispatchNotificationInput {
  severity: Severity;
  title: string;
  message: string;
  twinRunId?: string;
  recoveryFlagId?: string;
}

/**
 * FN-6/FN-7: mengirim peringatan ke semua kanal relevan (App selalu aktif via
 * polling/websocket klien; WhatsApp & USSD dipanggil di sini) dan mencatat
 * status pengiriman per kanal untuk audit. Keandalan (§9): kegagalan satu
 * kanal tidak menggagalkan kanal lain (redundansi FN-6); percobaan ulang
 * sederhana disediakan oleh caller/cron (lihat src/workers).
 */
export async function dispatchNotification(input: DispatchNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      severity: input.severity,
      title: input.title,
      message: input.message,
      twinRunId: input.twinRunId,
      recoveryFlagId: input.recoveryFlagId,
    },
  });

  const channels = channelsForSeverity(input.severity);
  const households = await prisma.household.findMany({ where: { isActive: true } });

  // Kanal APP: dicatat sebagai "SENT" langsung (klien mengambil via polling/
  // websocket endpoint /api/notifications/stream — lihat app/api).
  if (channels.includes("APP")) {
    await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: "APP",
        recipientAddress: "broadcast:app",
        status: "SENT",
        sentAt: new Date(),
      },
    });
  }

  for (const household of households) {
    if (channels.includes("WHATSAPP")) {
      await sendToChannelWithLogging(
        notification.id,
        "WHATSAPP",
        household.id,
        household.phone,
        () => sendWhatsAppMessage(household.phone, `${input.title}\n\n${input.message}`)
      );
    }
    if (channels.includes("USSD")) {
      await sendToChannelWithLogging(
        notification.id,
        "USSD",
        household.id,
        household.phone,
        () => sendUssdBroadcast(household.phone, `${input.title}: ${input.message}`)
      );
    }
  }

  await writeAuditLog({
    action: "NOTIFICATION_DISPATCHED",
    entity: "Notification",
    entityId: notification.id,
    detail: { severity: input.severity, channels, recipientCount: households.length },
  });

  return notification;
}

async function sendToChannelWithLogging(
  notificationId: string,
  channel: "WHATSAPP" | "USSD",
  householdId: string,
  address: string,
  send: () => Promise<unknown>
) {
  try {
    await send();
    await prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel,
        recipientHouseholdId: householdId,
        recipientAddress: address,
        status: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (err: any) {
    await prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel,
        recipientHouseholdId: householdId,
        recipientAddress: address,
        status: "FAILED",
        errorMessage: String(err?.message ?? err),
      },
    });
  }
}
