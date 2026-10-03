import type { Deposit, Order, OrderPiece } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { ReceiptHeaderLines } from '@/lib/receipt-header';

const logoUrl = `${import.meta.env.BASE_URL}nizar-marble-logo.png`;

function lineTotal(row: OrderPiece) {
  return row.lineTotal && row.lineTotal > 0 ? row.lineTotal : row.qty * row.price;
}

type Lang = 'ar' | 'fr';

const labels = {
  ar: {
    receipt: 'إيصال',
    order: 'طلب',
    customer: 'العميل',
    date: 'التاريخ',
    staff: 'المسؤول',
    status: 'الحالة',
    marble: 'الرخام',
    dimensions: 'الأبعاد',
    qty: 'الكمية',
    amount: 'المبلغ',
    slicesSubtotal: 'مجموع القطع',
    edgeRounding: 'تشطيب الحواف',
    total: 'الإجمالي',
    paid: 'المدفوع',
    remaining: 'المتبقي',
    payments: 'الدفعات',
  },
  fr: {
    receipt: 'Reçu',
    order: 'Commande',
    customer: 'Client',
    date: 'Date',
    staff: 'Responsable',
    status: 'Statut',
    marble: 'Marbre',
    dimensions: 'Dimensions',
    qty: 'Qté',
    amount: 'Montant',
    slicesSubtotal: 'Sous-total pièces',
    edgeRounding: 'Finition des chants',
    total: 'Total',
    paid: 'Payé',
    remaining: 'Restant',
    payments: 'Paiements',
  },
};

export function OrderReceiptPrint({
  lang,
  order,
  deposits,
  paid,
  headerLines,
  statusLabel,
  formatDate,
}: {
  lang: Lang;
  order: Order;
  deposits: Deposit[];
  paid: number;
  headerLines: ReceiptHeaderLines;
  statusLabel: string;
  formatDate: (d: string) => string;
}) {
  const t = labels[lang];
  const remaining = Math.max(order.total - paid, 0);
  const pieces = order.pieces.length > 0 ? order.pieces : [];

  return (
    <article className="order-receipt-print" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="receipt-header" dir="ltr">
        <img src={logoUrl} alt="" className="receipt-header-logo" />
        <div className="receipt-header-text">
          {headerLines.map((line, i) =>
            line.trim() ? <p key={i}>{line}</p> : null,
          )}
        </div>
      </header>

      <div className="receipt-title-row">
        <h1 className="receipt-title">
          {t.receipt} · {t.order} {order.id}
        </h1>
        <p className="receipt-meta digits-latin">{formatDate(order.date)}</p>
      </div>

      <dl className="receipt-info-grid">
        <div>
          <dt>{t.customer}</dt>
          <dd>{order.customer}</dd>
        </div>
        <div>
          <dt>{t.staff}</dt>
          <dd>{order.staff}</dd>
        </div>
        <div>
          <dt>{t.status}</dt>
          <dd>{statusLabel}</dd>
        </div>
        <div>
          <dt>{t.marble}</dt>
          <dd>{order.kind}</dd>
        </div>
      </dl>

      <table className="receipt-table">
        <thead>
          <tr>
            <th>{t.marble}</th>
            <th>{t.dimensions}</th>
            <th>{t.qty}</th>
            <th>{t.amount}</th>
          </tr>
        </thead>
        <tbody>
          {pieces.map((row, i) => (
            <tr key={i}>
              <td>{row.kind}</td>
              <td className="digits-latin">{row.dims}</td>
              <td className="digits-latin">{formatNumber(row.qty)}</td>
              <td className="digits-latin">{formatCurrency(lineTotal(row), lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-totals">
        {(order.linesSubtotal > 0 || order.edgeRoundingPrice > 0) && (
          <>
            <div className="receipt-total-row">
              <span>{t.slicesSubtotal}</span>
              <span className="digits-latin">
                {formatCurrency(order.linesSubtotal ?? order.total, lang)}
              </span>
            </div>
            {order.edgeRoundingPrice > 0 && (
              <div className="receipt-total-row">
                <span>{t.edgeRounding}</span>
                <span className="digits-latin">
                  {formatCurrency(order.edgeRoundingPrice, lang)}
                </span>
              </div>
            )}
          </>
        )}
        <div className="receipt-total-row receipt-total-row--strong">
          <span>{t.total}</span>
          <span className="digits-latin">{formatCurrency(order.total, lang)}</span>
        </div>
        <div className="receipt-total-row">
          <span>{t.paid}</span>
          <span className="digits-latin">{formatCurrency(paid, lang)}</span>
        </div>
        <div className="receipt-total-row">
          <span>{t.remaining}</span>
          <span className="digits-latin">{formatCurrency(remaining, lang)}</span>
        </div>
      </div>

      {deposits.length > 0 && (
        <section className="receipt-payments">
          <h2>{t.payments}</h2>
          <ul>
            {deposits.map((d) => (
              <li key={d.id} className="digits-latin">
                {formatDate(d.date)} — {d.method} —{' '}
                {formatCurrency(d.amount, lang)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
