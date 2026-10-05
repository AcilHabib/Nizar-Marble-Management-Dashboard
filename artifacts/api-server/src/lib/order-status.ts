export const ORDER_STATUSES = [
  "مؤكدة",
  "قيد التنفيذ",
  "جاهزة",
  "تم التسليم",
  "ملغاة",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

const LEGACY: Record<string, OrderStatusValue> = {
  مؤكد: "مؤكدة",
  "تم التسليم": "تم التسليم",
  ملغى: "ملغاة",
  "قيد التنفيذ": "قيد التنفيذ",
};

export function normalizeOrderStatus(status: string): OrderStatusValue | string {
  return LEGACY[status] ?? status;
}

export function isOrderStatus(status: string): status is OrderStatusValue {
  return (ORDER_STATUSES as readonly string[]).includes(status);
}
