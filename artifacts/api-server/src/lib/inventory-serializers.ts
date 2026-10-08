import type { MarbleKind, MarbleSlice, Supplier } from "@workspace/db";
import {
  sliceAvailableCount,
  sliceAvailableNetAreaSqm,
  sliceNetAreaOne,
} from "./slice-availability";
import { sliceRowMetrics, type WasteRect } from "./slice-math";

export type SupplierDto = {
  id: string;
  name: string;
  phone: string;
  address: string;
};

export function serializeSupplier(s: Supplier): SupplierDto {
  return { id: s.id, name: s.name, phone: s.phone, address: s.address };
}

export type MarbleSliceDto = {
  id: string;
  kindId: string;
  supplier: SupplierDto;
  lengthM: number;
  widthM: number;
  thicknessM: number;
  wastes: WasteRect[];
  sliceCount: number;
  purchasePerSqm: number;
  sellingPerSqm: number;
  grossAreaOneSqm: number;
  wasteAreaOneSqm: number;
  areaOneSqm: number;
  totalAreaSqm: number;
  purchaseTotal: number;
  sellingTotal: number;
  availableNetAreaSqm: number;
  availableSliceCount: number;
  createdAt: string;
};

export function serializeSlice(
  slice: MarbleSlice & { supplier: Supplier },
): MarbleSliceDto {
  const wastes = (slice.wastes ?? []) as WasteRect[];
  const metrics = sliceRowMetrics({ ...slice, wastes });
  return {
    id: slice.id,
    kindId: slice.kindId,
    supplier: serializeSupplier(slice.supplier),
    lengthM: slice.lengthM,
    widthM: slice.widthM,
    thicknessM: slice.thicknessM,
    wastes,
    sliceCount: slice.sliceCount,
    purchasePerSqm: slice.purchasePerSqm,
    sellingPerSqm: slice.sellingPerSqm,
    ...metrics,
    availableNetAreaSqm: sliceAvailableNetAreaSqm(slice),
    availableSliceCount: sliceAvailableCount(slice),
    createdAt: slice.createdAt.toISOString(),
  };
}

export type MarbleKindDto = {
  id: string;
  name: string;
  color: string;
  imageUrl: string;
  visible: boolean;
  tone: string;
  createdAt: string;
  updatedAt: string;
  sliceCount: number;
  totalAreaSqm: number;
  totalPurchaseValue: number;
  totalSellingValue: number;
  supplierIds: string[];
};

export function serializeKind(
  kind: MarbleKind & { slices: (MarbleSlice & { supplier: Supplier })[] },
): MarbleKindDto {
  let totalAreaSqm = 0;
  let totalPurchaseValue = 0;
  let totalSellingValue = 0;
  const supplierIds = new Set<string>();

  let availableSlices = 0;
  for (const slice of kind.slices) {
    const available = sliceAvailableCount(slice);
    const area = available * sliceNetAreaOne(slice);
    availableSlices += available;
    totalAreaSqm += area;
    totalPurchaseValue += Math.round(area * slice.purchasePerSqm);
    totalSellingValue += Math.round(area * slice.sellingPerSqm);
    supplierIds.add(slice.supplierId);
  }

  return {
    id: kind.id,
    name: kind.name,
    color: kind.color,
    imageUrl: kind.imageUrl ?? "",
    visible: kind.visible,
    tone: kind.tone,
    createdAt: kind.createdAt.toISOString(),
    updatedAt: kind.updatedAt.toISOString(),
    sliceCount: availableSlices,
    totalAreaSqm: Math.round(totalAreaSqm * 100) / 100,
    totalPurchaseValue,
    totalSellingValue,
    supplierIds: [...supplierIds],
  };
}

export function parseWastes(input: unknown): WasteRect[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((w) => {
      if (!w || typeof w !== "object") return null;
      const o = w as Record<string, unknown>;
      const lengthM = Number(o.lengthM);
      const widthM = Number(o.widthM);
      if (!Number.isFinite(lengthM) || !Number.isFinite(widthM)) return null;
      if (lengthM <= 0 || widthM <= 0) return null;
      return { lengthM, widthM };
    })
    .filter((w): w is WasteRect => w !== null);
}
