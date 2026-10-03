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

export function sliceAvailableNetAreaSqm(
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
  const total = sliceTotalNetAreaSqm(slice);
  const consumed = slice.consumedNetAreaSqm ?? 0;
  return Math.max(0, Math.round((total - consumed) * 10000) / 10000);
}

export function cutAreaSqm(cutLengthM: number, cutWidthM: number, qty: number) {
  return cutLengthM * cutWidthM * qty;
}
