import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  api,
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
  normalizeOrderStatus,
} from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { statusLabelFr } from '@/lib/order-status';

type Lang = 'ar' | 'fr';

function orderDate(date: string, lang: Lang) {
  return lang === 'ar' ? date : date;
}

export function OrderTableRow({
  order,
  lang,
  labels,
}: {
  order: Order;
  lang: Lang;
  labels: {
    order: string;
    paid: string;
    remaining: string;
    delete: string;
    confirmDelete: string;
  };
}) {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [navigating, setNavigating] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (body: { status?: OrderStatus; orderNumber?: string }) =>
      api.updateOrder(order.orderNumber, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (updated.orderNumber !== order.orderNumber) {
        qc.removeQueries({ queryKey: ['order', order.orderNumber] });
        setLocation(`/orders/${updated.orderNumber}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteOrder(order.orderNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const goDetail = () => {
    setNavigating(true);
    setLocation(`/orders/${order.orderNumber}`);
  };

  const remaining =
    order.remaining ?? Math.max(order.total - order.paid, 0);

  return (
    <tr
      key={order.orderNumber}
      data-testid={`row-order-${order.orderNumber}`}
      className="border-t border-[#F0EEE9] transition hover:bg-[#FBFAF8]"
    >
      <td className="px-5 py-3">
        <input
          data-testid={`input-order-number-${order.orderNumber}`}
          defaultValue={order.orderNumber}
          className="digits-latin w-full min-w-[120px] rounded-md border border-transparent bg-transparent px-1 py-1 text-xs font-bold outline-none focus:border-[#CFC3AE]"
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next && next !== order.orderNumber) {
              updateMutation.mutate({ orderNumber: next });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
      </td>
      <td
        className="cursor-pointer px-5 py-4 font-medium"
        onClick={goDetail}
      >
        {order.customer}
        {navigating && (
          <Loader2 className="ms-2 inline h-3 w-3 animate-spin text-[#9B8C77]" />
        )}
      </td>
      <td className="cursor-pointer px-5 py-4 text-[#5F6B76]" onClick={goDetail}>
        {orderDate(order.date, lang)}
      </td>
      <td className="cursor-pointer px-5 py-4" onClick={goDetail}>
        {order.kind}
      </td>
      <td className="cursor-pointer px-5 py-4 text-[#5F6B76]" onClick={goDetail}>
        {order.staff}
      </td>
      <td className="mono cursor-pointer px-5 py-4" onClick={goDetail}>
        {formatCurrency(order.total, lang)}
      </td>
      <td className="mono px-5 py-4 text-[#2E9B68]">
        {formatCurrency(order.paid, lang)}
      </td>
      <td className="mono px-5 py-4 text-[#D95C55]">
        {formatCurrency(remaining, lang)}
      </td>
      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
        <select
          data-testid={`select-order-status-${order.orderNumber}`}
          value={normalizeOrderStatus(order.status) as string}
          disabled={updateMutation.isPending}
          onChange={(e) =>
            updateMutation.mutate({
              status: e.target.value as OrderStatus,
            })
          }
          className="max-w-[130px] rounded-md border border-[#E7E5E0] bg-white px-2 py-1.5 text-[10px] font-semibold"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {lang === 'ar' ? s : statusLabelFr(s)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-5 py-3 text-end">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/orders/${order.orderNumber}`}
            onClick={(e) => e.stopPropagation()}
            data-testid={`link-order-${order.orderNumber}`}
            className="text-[11px] font-semibold text-[#9B8C77] hover:text-[#3A3D3F]"
          >
            →
          </Link>
          <button
            type="button"
            data-testid={`button-delete-order-${order.orderNumber}`}
            title={labels.delete}
            disabled={deleteMutation.isPending}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(labels.confirmDelete)) {
                deleteMutation.mutate();
              }
            }}
            className="rounded p-1.5 text-[#D95C55] hover:bg-[#FBEDEC] disabled:opacity-50"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
