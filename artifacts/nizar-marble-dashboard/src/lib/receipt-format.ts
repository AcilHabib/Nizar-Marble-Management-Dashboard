import type { OrderPiece } from '@/lib/api';
import { formatNumber } from '@/lib/format';

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

/** Area of one piece. Quantity is shown in its own column. */
export function pieceSurfaceSqm(row: OrderPiece): number {
  const len = row.cutLengthM ?? 0;
  const wid = row.cutWidthM ?? 0;
  if (len > 0 && wid > 0) return len * wid;
  const parts = row.dims
    .replace(/\s*m\s*$/i, '')
    .split(/×|x|X/)
    .map((p) => parseFloat(p.trim()))
    .filter((n) => Number.isFinite(n));
  if (parts.length >= 2) return parts[0] * parts[1];
  return 0;
}

export function pieceUnitPrice(row: OrderPiece): number {
  if (row.sellingPerSqm && row.sellingPerSqm > 0) return row.sellingPerSqm;
  return row.price > 0 ? row.price : 0;
}

/** Line amount: stored total, or length × width × quantity × price per m². */
export function pieceAmount(row: OrderPiece): number {
  if (typeof row.lineTotal === 'number' && row.lineTotal > 0) return row.lineTotal;
  const area = pieceSurfaceSqm(row);
  const unit = pieceUnitPrice(row);
  const qty = Math.max(row.qty || 1, 1);
  if (area > 0 && unit > 0) return Math.round(area * qty * unit);
  return Math.round((row.qty || 0) * (row.price || 0));
}

export function formatReceiptSurface(row: OrderPiece): string {
  const sqm = pieceSurfaceSqm(row);
  if (!(sqm > 0)) return '—';
  const text = sqm.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  return `${text} m²`;
}
