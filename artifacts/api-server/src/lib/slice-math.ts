export type WasteRect = { lengthM: number; widthM: number };

export function areaSqmPerSlice(lengthM: number, widthM: number): number {
  return lengthM * widthM;
}

export function wasteAreaSqm(wastes: WasteRect[] | undefined | null): number {
  if (!wastes?.length) return 0;
  return wastes.reduce((sum, w) => sum + w.lengthM * w.widthM, 0);
}

export function sliceRowMetrics(slice: {
  lengthM: number;
  widthM: number;
  thicknessM: number;
  sliceCount: number;
  purchasePerSqm: number;
  sellingPerSqm: number;
  wastes?: WasteRect[] | null;
}) {
  const grossOne = areaSqmPerSlice(slice.lengthM, slice.widthM);
  const wasteOne = wasteAreaSqm(slice.wastes);
  const netOne = Math.max(0, grossOne - wasteOne);
  const totalArea = netOne * slice.sliceCount;
  return {
    grossAreaOneSqm: grossOne,
    wasteAreaOneSqm: wasteOne,
    areaOneSqm: netOne,
    totalAreaSqm: totalArea,
    purchaseTotal: Math.round(totalArea * slice.purchasePerSqm),
    sellingTotal: Math.round(totalArea * slice.sellingPerSqm),
  };
}

export function dimensionsKey(
  lengthM: number,
  widthM: number,
  thicknessM: number,
  wastes: WasteRect[] = [],
): string {
  const wasteKey = [...wastes]
    .sort((a, b) => a.lengthM - b.lengthM || a.widthM - b.widthM)
    .map((w) => `${w.lengthM}x${w.widthM}`)
    .join(",");
  return `${lengthM}|${widthM}|${thicknessM}|${wasteKey}`;
}
