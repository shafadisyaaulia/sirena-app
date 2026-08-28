/**
 * FN-6 / Aksesibilitas (§9): kanal USSD agar warga tanpa smartphone tetap
 * terjangkau. Gateway USSD lokal dikontrak terpisah (PRD §10) — sesuaikan
 * endpoint & payload dengan spesifikasi provider yang dipilih.
 */
export async function sendUssdBroadcast(toPhone: string, message: string) {
  const baseUrl = process.env.USSD_GATEWAY_BASE_URL;
  const apiKey = process.env.USSD_GATEWAY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Gateway USSD belum dikonfigurasi di .env");
  }

  // Pesan USSD idealnya singkat (≤160 karakter) — potong bila perlu.
  const truncated = message.length > 160 ? `${message.slice(0, 157)}...` : message;

  const res = await fetch(`${baseUrl}/broadcast`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone: toPhone, message: truncated }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gagal mengirim USSD: ${res.status} ${errorBody}`);
  }

  return res.json();
}
