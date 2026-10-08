import type { Prisma } from "@prisma/client";
import {
  cutAreaSqm,
  sliceAvailableCount,
  sliceAvailableNetAreaSqm,
  sliceNetAreaOne,
} from "./slice-availability";

type Tx = Prisma.TransactionClient;

export class SliceStockError extends Error {
  statusCode = 409;
}

export type ReservedPiece = {
  sliceId?: string | null;
  qty?: number | null;
  cutLengthM?: number | null;
  cutWidthM?: number | null;
  inventorySlices?: number | null;
  inventoryAreaSqm?: number | null;
};

export function reservationOf(
  piece: ReservedPiece,
): { sliceId: string; slices: number; area: number } | null {
  const sliceId = piece.sliceId ?? "";
  if (!sliceId) return null;
  const slices = Math.max(0, piece.inventorySlices ?? 0);
  const area = Math.max(0, piece.inventoryAreaSqm ?? 0);
  if (slices > 0 || area > 0) {
    return { sliceId, slices, area };
  }
  const cutLen = piece.cutLengthM ?? 0;
  const cutWid = piece.cutWidthM ?? 0;
  const qty = piece.qty ?? 1;
  if (cutLen <= 0 || cutWid <= 0) return null;
  return { sliceId, slices: 0, area: cutAreaSqm(cutLen, cutWid, qty) };
}

function groupReservations(pieces: ReservedPiece[]) {
  const grouped = new Map<string, { slices: number; area: number }>();
  for (const piece of pieces) {
    const reservation = reservationOf(piece);
    if (!reservation) continue;
    const current = grouped.get(reservation.sliceId) ?? { slices: 0, area: 0 };
    current.slices += reservation.slices;
    current.area += reservation.area;
    grouped.set(reservation.sliceId, current);
  }
  return grouped;
}

export async function consumeReservations(tx: Tx, pieces: ReservedPiece[]) {
  const grouped = groupReservations(pieces);
  for (const [sliceId, needed] of grouped) {
    const slice = await tx.marbleSlice.findUnique({
      where: { id: sliceId },
      include: { kind: true },
    });
    if (!slice) {
      const err = new Error(`Slice not found: ${sliceId}`);
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }
    if (needed.slices > 0 && needed.slices > sliceAvailableCount(slice)) {
      throw new SliceStockError(
        `Not enough whole slices for ${slice.kind.name}. Available ${sliceAvailableCount(slice)}, requested ${needed.slices}.`,
      );
    }
    if (
      needed.slices === 0 &&
      needed.area > sliceAvailableNetAreaSqm(slice) + 1e-6
    ) {
      throw new SliceStockError(
        `Not enough area left on ${slice.kind.name}.`,
      );
    }
    await tx.marbleSlice.update({
      where: { id: sliceId },
      data: {
        consumedSliceCount: (slice.consumedSliceCount ?? 0) + needed.slices,
        consumedNetAreaSqm: (slice.consumedNetAreaSqm ?? 0) + needed.area,
      },
    });
  }
}

export async function releaseReservations(tx: Tx, pieces: ReservedPiece[]) {
  const grouped = groupReservations(pieces);
  for (const [sliceId, needed] of grouped) {
    const slice = await tx.marbleSlice.findUnique({ where: { id: sliceId } });
    if (!slice) continue;
    await tx.marbleSlice.update({
      where: { id: sliceId },
      data: {
        consumedSliceCount: Math.max(
          0,
          (slice.consumedSliceCount ?? 0) - needed.slices,
        ),
        consumedNetAreaSqm: Math.max(
          0,
          (slice.consumedNetAreaSqm ?? 0) - needed.area,
        ),
      },
    });
  }
}

export function wholeSliceReservation(
  slice: Parameters<typeof sliceNetAreaOne>[0],
  qty: number,
) {
  const one = sliceNetAreaOne(slice);
  return {
    inventorySlices: qty,
    inventoryAreaSqm: one * qty,
  };
}
