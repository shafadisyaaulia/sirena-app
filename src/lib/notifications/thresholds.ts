/**
 * Evaluasi tingkat keparahan (Severity) berjenjang untuk mengurangi
 * alert fatigue (lihat PRD §11 Risiko & Mitigasi): tingkat rendah dikirim
 * ke kanal lebih sedikit/senyap, tingkat tinggi ke semua kanal (FN-6).
 */

export type Severity = "NORMAL" | "WASPADA" | "SIAGA" | "AWAS";

export interface SeverityInput {
  peakDischargeM3s: number;
  designCapacityM3s: number;
  oxbowLevelM?: number;
  operationalMaxLevelM: number;
}

export function evaluateSeverity(input: SeverityInput): Severity {
  const { peakDischargeM3s, designCapacityM3s, oxbowLevelM, operationalMaxLevelM } = input;

  const capacityRatio = designCapacityM3s > 0 ? peakDischargeM3s / designCapacityM3s : 0;
  const levelRatio =
    oxbowLevelM !== undefined && operationalMaxLevelM > 0
      ? oxbowLevelM / operationalMaxLevelM
      : 0;

  const worst = Math.max(capacityRatio, levelRatio);

  if (worst >= 1.0) return "AWAS";
  if (worst >= 0.85) return "SIAGA";
  if (worst >= 0.6) return "WASPADA";
  return "NORMAL";
}

/** Kanal yang dipakai per tingkat keparahan — makin tinggi, makin banyak kanal. */
export function channelsForSeverity(severity: Severity): ("APP" | "WHATSAPP" | "USSD")[] {
  switch (severity) {
    case "AWAS":
      return ["APP", "WHATSAPP", "USSD"];
    case "SIAGA":
      return ["APP", "WHATSAPP"];
    case "WASPADA":
      return ["APP"];
    default:
      return [];
  }
}
