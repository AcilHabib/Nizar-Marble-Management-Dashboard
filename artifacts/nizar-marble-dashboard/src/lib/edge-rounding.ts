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

function edgeRows(meters: number[], kinds: string[] = []) {
  return meters
    .map((metersValue, index) => ({
      metersValue,
      kind: kinds[index] === 'linear' || kinds[index] === '45' ? kinds[index] : '',
    }))
    .filter((row) => Number.isFinite(row.metersValue) && row.metersValue > 0);
}

function edgeMeterPart(meters: number[], kinds: string[], lang: 'ar' | 'fr'): string {
  const rows = edgeRows(meters, kinds);
  const lengthText = (value: number) => `${formatNumber(value, 2)} m`;
  if (!rows.some((row) => row.kind)) {
    return `(${rows.map((row) => lengthText(row.metersValue)).join(' + ')})`;
  }
  return (['linear', '45'] as const)
    .flatMap((kind) => {
      const group = rows.filter((row) => row.kind === kind);
      if (group.length === 0) return [];
      const name = kind === 'linear' ? (lang === 'ar' ? 'خطي' : 'Linéaire') : '45°';
      return [`${name} (${group.map((row) => lengthText(row.metersValue)).join(' + ')})`];
    })
    .join(' + ');
}

export function formatEdgeRoundingSummary(
  pricePerMeter: number,
  meters: number[],
  totalPrice: number,
  lang: 'ar' | 'fr',
  kinds: string[] = [],
): string {
  const active = edgeRows(meters, kinds);
  if (totalPrice <= 0 || pricePerMeter <= 0 || active.length === 0) {
    return '—';
  }
  const meterPart = edgeMeterPart(meters, kinds, lang);
  if (lang === 'ar') {
    return `${formatNumber(pricePerMeter)} د.ج/م × ${meterPart} = ${formatNumber(totalPrice)} د.ج`;
  }
  return `${formatNumber(pricePerMeter)} DA/m × ${meterPart} = ${formatNumber(totalPrice)} DA`;
}

export function formatEdgeRoundingBreakdown(
  pricePerMeter: number,
  meters: number[],
  lang: 'ar' | 'fr',
  kinds: string[] = [],
): string | null {
  const active = edgeRows(meters, kinds);
  if (pricePerMeter <= 0 || active.length === 0) return null;
  const meterPart = edgeMeterPart(meters, kinds, lang);
  if (lang === 'ar') {
    return `${formatNumber(pricePerMeter)} د.ج/م × ${meterPart}`;
  }
  return `${formatNumber(pricePerMeter)} DA/m × ${meterPart}`;
}
