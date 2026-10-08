import type { MarbleSlice } from "@workspace/db";
import { sliceRowMetrics, type WasteRect } from "./slice-math";

export function sliceNetAreaOne(
  slice: Pick<MarbleSlice, "lengthM" | "widthM" | "thicknessM" | "wastes">,
): number {
  const wastes = (slice.wastes ?? []) as WasteRect[];
  return sliceRowMetrics({ ...slice, wastes, sliceCount: 1, purchasePerSqm: 0, sellingPerSqm: 0 })
    .areaOneSqm;
}

export function sliceTotalNetAreaSqm(
  slice: Pick<
    MarbleSlice,
    | "lengthM"
    | "widthM"
    | "thicknessM"
    | "wastes"
    | "sliceCount"
    | "consumedNetAreaSqm"
  >,
): number {
  const one = sliceNetAreaOne(slice);
  return one * slice.sliceCount;
}

type SliceStock = Pick<
  MarbleSlice,
  | "lengthM"
  | "widthM"
  | "thicknessM"
  | "wastes"
  | "sliceCount"
  | "consumedNetAreaSqm"
> & { consumedSliceCount?: number | null };

/** Whole slabs already taken by orders, including older area-only consumption. */
export function sliceConsumedWholeCount(slice: SliceStock): number {
  const reserved = Math.max(0, Math.round(slice.consumedSliceCount ?? 0));
  const one = sliceNetAreaOne(slice);
  const consumedArea = Math.max(0, slice.consumedNetAreaSqm ?? 0);
  const accounted = one > 0 ? reserved * one : 0;
  const legacyArea = Math.max(0, consumedArea - accounted);
  const legacySlices =
    one > 1e-9 && legacyArea > Math.max(1e-4, one * 1e-4)
      ? Math.ceil(legacyArea / one - 1e-6)
      : 0;
  return reserved + legacySlices;
}

export function sliceAvailableCount(slice: SliceStock): number {
  return Math.max(0, slice.sliceCount - sliceConsumedWholeCount(slice));
}

export function sliceAvailableNetAreaSqm(slice: SliceStock): number {
  const one = sliceNetAreaOne(slice);
  return Math.round(sliceAvailableCount(slice) * one * 10000) / 10000;
}

export function cutAreaSqm(cutLengthM: number, cutWidthM: number, qty: number) {
  return cutLengthM * cutWidthM * qty;
}

export function cutFitsOnSlice(
  cutLengthM: number,
  cutWidthM: number,
  slice: Pick<MarbleSlice, "lengthM" | "widthM" | "thicknessM" | "wastes">,
): boolean {
  const fitsOrientation =
    (cutLengthM <= slice.lengthM + 1e-6 && cutWidthM <= slice.widthM + 1e-6) ||
    (cutLengthM <= slice.widthM + 1e-6 && cutWidthM <= slice.lengthM + 1e-6);
  if (!fitsOrientation) return false;
  return cutLengthM * cutWidthM <= sliceNetAreaOne(slice) + 1e-6;
}
