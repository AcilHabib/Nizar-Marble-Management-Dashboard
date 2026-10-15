export type EdgeKind = "linear" | "45";

export function normalizeEdgeMeters(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => Number(v))
    .filter((m) => Number.isFinite(m) && m > 0);
}

export function normalizeEdgeEntries(
  metersRaw: unknown,
  kindsRaw: unknown,
): { meters: number[]; kinds: EdgeKind[] } | null {
  const meters = Array.isArray(metersRaw) ? metersRaw : [];
  const kinds = Array.isArray(kindsRaw) ? kindsRaw : [];
  const count = Math.max(meters.length, kinds.length);
  const outMeters: number[] = [];
  const outKinds: EdgeKind[] = [];
  for (let i = 0; i < count; i += 1) {
    const metersValue = Number(meters[i]);
    const hasLength = Number.isFinite(metersValue) && metersValue > 0;
    const kind = kinds[i] === "linear" || kinds[i] === "45" ? kinds[i] : "";
    if (!hasLength && !kind) continue;
    if (!hasLength || !kind) return null;
    outMeters.push(metersValue);
    outKinds.push(kind);
  }
  return { meters: outMeters, kinds: outKinds };
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
  kinds: string[] = [],
): string {
  const active = meters
    .map((metersValue, index) => ({
      metersValue,
      kind: kinds[index] === "linear" || kinds[index] === "45" ? kinds[index] : "",
    }))
    .filter((row) => Number.isFinite(row.metersValue) && row.metersValue > 0);
  if (totalPrice <= 0 || pricePerMeter <= 0 || active.length === 0) {
    return "—";
  }
  const meterPart = active.some((row) => row.kind)
    ? (["linear", "45"] as const)
        .flatMap((kind) => {
          const group = active.filter((row) => row.kind === kind);
          if (group.length === 0) return [];
          const name = kind === "linear" ? "خطي" : "45°";
          return [`${name} (${group.map((row) => `${row.metersValue} م`).join(" + ")})`];
        })
        .join(" + ")
    : `(${active.map((row) => `${row.metersValue} م`).join(" + ")})`;
  return `${pricePerMeter} د.ج/م × ${meterPart} = ${totalPrice} د.ج`;
}
