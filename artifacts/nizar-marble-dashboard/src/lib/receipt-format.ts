import type { OrderPiece } from '@/lib/api';
import { formatAreaSqm, formatNumber } from '@/lib/format';

export function formatReceiptDimensions(row: OrderPiece): string {
  const len = row.cutLengthM ?? 0;
  const wid = row.cutWidthM ?? 0;
  if (len > 0 && wid > 0) {
    return `${formatNumber(len, 2)}/${formatNumber(wid, 2)}`;
  }
  const parts = row.dims
    .replace(/\s*m\s*$/i, '')
    .split(/×|x|X/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return row.dims.replace(/×/g, '/');
}

export function pieceSurfaceSqm(row: OrderPiece): number {
  const len = row.cutLengthM ?? 0;
  const wid = row.cutWidthM ?? 0;
  if (len > 0 && wid > 0) {
    return len * wid * Math.max(row.qty, 1);
  }
  const parts = row.dims
    .replace(/\s*m\s*$/i, '')
    .split(/×|x|X/)
    .map((p) => parseFloat(p.trim()))
    .filter((n) => Number.isFinite(n));
  if (parts.length >= 2) {
    return parts[0] * parts[1] * Math.max(row.qty, 1);
  }
  return 0;
}

export function formatReceiptSurface(row: OrderPiece): string {
  const sqm = pieceSurfaceSqm(row);
  return sqm > 0 ? formatAreaSqm(sqm) : '—';
}
