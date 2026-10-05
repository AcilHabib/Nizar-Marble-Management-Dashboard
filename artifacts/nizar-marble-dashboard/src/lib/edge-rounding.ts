import { formatCurrency, formatNumber } from '@/lib/format';

export function normalizeEdgeMeters(raw: number[]): number[] {
  return raw.filter((m) => Number.isFinite(m) && m > 0);
}

export function computeEdgeRoundingTotal(
  pricePerMeter: number,
  meters: number[],
): number {
  const price = Math.max(0, Number(pricePerMeter) || 0);
  const totalM = normalizeEdgeMeters(meters).reduce((sum, m) => sum + m, 0);
  return Math.round(price * totalM);
}

function edgeMeterPart(meters: number[]): string {
  return normalizeEdgeMeters(meters)
    .map((m) => `${formatNumber(m, 2)} m`)
    .join(' + ');
}

export function formatEdgeRoundingSummary(
  pricePerMeter: number,
  meters: number[],
  totalPrice: number,
  lang: 'ar' | 'fr',
): string {
  const active = normalizeEdgeMeters(meters);
  if (totalPrice <= 0 || pricePerMeter <= 0 || active.length === 0) {
    return '—';
  }
  const meterPart = edgeMeterPart(meters);
  if (lang === 'ar') {
    return `${formatNumber(pricePerMeter)} د.ج/م × (${meterPart}) = ${formatNumber(totalPrice)} د.ج`;
  }
  return `${formatNumber(pricePerMeter)} DA/m × (${meterPart}) = ${formatNumber(totalPrice)} DA`;
}

export function formatEdgeRoundingBreakdown(
  pricePerMeter: number,
  meters: number[],
  lang: 'ar' | 'fr',
): string | null {
  const active = normalizeEdgeMeters(meters);
  if (pricePerMeter <= 0 || active.length === 0) return null;
  const meterPart = edgeMeterPart(meters);
  if (lang === 'ar') {
    return `${formatNumber(pricePerMeter)} د.ج/م × (${meterPart})`;
  }
  return `${formatNumber(pricePerMeter)} DA/m × (${meterPart})`;
}
