/**
 * FN-6: kanal WhatsApp. Implementasi contoh via Twilio WhatsApp API — ganti
 * dengan WhatsApp Business API resmi bila sudah dikontrak (lihat PRD §10).
 */
export async function sendWhatsAppMessage(toPhone: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    throw new Error("Kredensial WhatsApp (Twilio) belum dikonfigurasi di .env");
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: `whatsapp:${toPhone}`,
        Body: message,
      }),
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gagal mengirim WhatsApp: ${res.status} ${errorBody}`);
  }

  return res.json();
}
