export const ORDER_STATUSES = [
  'مؤكدة',
  'قيد التنفيذ',
  'جاهزة',
  'تم التسليم',
  'ملغاة',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const LEGACY: Record<string, OrderStatus> = {
  مؤكد: 'مؤكدة',
  ملغى: 'ملغاة',
  'قيد التنفيذ': 'قيد التنفيذ',
  'تم التسليم': 'تم التسليم',
};

export function normalizeOrderStatus(status: string): OrderStatus | string {
  return LEGACY[status] ?? status;
}

export function statusLabelFr(status: string): string {
  const s = normalizeOrderStatus(status);
  return (
    {
      مؤكدة: 'Confirmée',
      'قيد التنفيذ': 'En cours',
      جاهزة: 'Prête',
      'تم التسليم': 'Livrée',
      ملغاة: 'Annulée',
    } as Record<string, string>
  )[s] ?? String(s);
}

export function statusStyle(status: string) {
  const s = normalizeOrderStatus(status);
  return s === 'مؤكدة'
    ? { color: '#2E9B68', bg: '#EAF6EF' }
    : s === 'قيد التنفيذ'
      ? { color: '#D99A32', bg: '#FCF4E5' }
      : s === 'جاهزة'
        ? { color: '#4D8AC9', bg: '#EDF4FB' }
        : s === 'تم التسليم'
          ? { color: '#3A3D3F', bg: '#F1EEE8' }
          : { color: '#D95C55', bg: '#FBEDEC' };
}
