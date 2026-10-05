export function normalizeEdgeMeters(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => Number(v))
    .filter((m) => Number.isFinite(m) && m > 0);
}

export function computeEdgeRoundingTotal(
  pricePerMeter: number,
  meters: number[],
): number {
  const price = Math.max(0, Number(pricePerMeter) || 0);
  const totalM = normalizeEdgeMeters(meters).reduce((sum, m) => sum + m, 0);
  return Math.round(price * totalM);
}

export function formatOrderEdgesSummary(
  pricePerMeter: number,
  meters: number[],
  totalPrice: number,
): string {
  const active = normalizeEdgeMeters(meters);
  if (totalPrice <= 0 || pricePerMeter <= 0 || active.length === 0) {
    return "—";
  }
  const meterPart = active.map((m) => `${m} م`).join(" + ");
  return `${pricePerMeter} د.ج/م × (${meterPart}) = ${totalPrice} د.ج`;
}
