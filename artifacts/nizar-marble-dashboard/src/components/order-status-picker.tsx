import {
  ORDER_STATUSES,
  type OrderStatus,
  normalizeOrderStatus,
} from '@/lib/api';
import { statusLabelFr, statusStyle } from '@/lib/order-status';

type Lang = 'ar' | 'fr';

function statusLabel(status: string, lang: Lang) {
  const s = normalizeOrderStatus(status);
  if (lang === 'ar') return String(s);
  return statusLabelFr(String(s));
}

export function OrderStatusPicker({
  value,
  lang,
  disabled,
  testId,
  onChange,
}: {
  value: string;
  lang: Lang;
  disabled?: boolean;
  testId?: string;
  onChange: (status: OrderStatus) => void;
}) {
  const current = normalizeOrderStatus(value);
  const s = statusStyle(String(current));

  return (
    <div className="relative inline-flex max-w-[160px]">
      <span
        className="pointer-events-none inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ color: s.color, background: s.bg }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: s.color }}
        />
        {statusLabel(String(current), lang)}
      </span>
      <select
        data-testid={testId}
        value={current as string}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as OrderStatus)}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label={lang === 'ar' ? 'الحالة' : 'Statut'}
      >
        {ORDER_STATUSES.map((st) => (
          <option key={st} value={st}>
            {lang === 'ar' ? st : statusLabelFr(st)}
          </option>
        ))}
      </select>
    </div>
  );
}
