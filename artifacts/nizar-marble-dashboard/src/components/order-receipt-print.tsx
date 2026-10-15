import type { Deposit, Order } from '@/lib/api';
import { depositSignedAmount } from '@/lib/api';
import { formatEdgeRoundingBreakdown } from '@/lib/edge-rounding';
import { formatCurrency, formatNumber } from '@/lib/format';
import {
  formatReceiptDate,
  translateOrderStatus,
  translatePaymentMethod,
} from '@/lib/receipt-i18n';
import {
  formatReceiptDimensions,
  formatReceiptSurface,
  pieceAmount,
  pieceUnitPrice,
} from '@/lib/receipt-format';
import { resolveMarbleImageUrl } from '@/lib/marble-image';

const logoUrl = `${import.meta.env.BASE_URL}nizar-marble-logo.png`;

const t = {
  receipt: 'Reçu',
  order: 'Commande',
  customer: 'Client',
  phone: 'Téléphone',
  date: 'Date',
  staff: 'Responsable',
  status: 'Statut',
  marble: 'Marbre',
  dimensions: 'Dimensions',
  surface: 'Surface',
  qty: 'Qté',
  amount: 'Montant',
  slicesSubtotal: 'Sous-total pièces',
  edgeRounding: 'Finition des chants',
  pauseFee: 'la pause',
  levierFee: 'le levier',
  unitPrice: 'Prix / m²',
  total: 'Total',
  rounded: 'Arrondi',
  paid: 'Payé',
  remaining: 'Restant',
  payments: 'Paiements',
  refund: 'Remboursement',
  commercial: 'N° commercial',
};

export function OrderReceiptPrint({
  order,
  deposits,
  paid,
  marbleImagesByKind,
}: {
  order: Order;
  deposits: Deposit[];
  paid: number;
  marbleImagesByKind: Record<string, string>;
}) {
  const lang = 'fr' as const;
  const remaining = Math.max(order.total - paid, 0);
  const calculatedTotal =
    (order.linesSubtotal ?? 0) +
    (order.edgeRoundingPrice ?? 0) +
    (order.pausePrice ?? 0) +
    (order.levierPrice ?? 0);
  const roundingAdjust = calculatedTotal > 0 ? order.total - calculatedTotal : 0;
  const pieces = order.pieces.length > 0 ? order.pieces : [];
  const orderRef = order.orderNumber || order.id;
  const statusText = translateOrderStatus(order.status, lang);
  const orderDateText = formatReceiptDate(order.date, lang, order.orderDate);
  const edgeRoundingDetail = formatEdgeRoundingBreakdown(
    order.edgeRoundingPricePerM ?? 0,
    order.edgeRoundingMeters ?? [],
    lang,
    order.edgeRoundingKinds ?? [],
  );
  const primaryKind = pieces[0]?.kind ?? order.kind.split('،')[0]?.trim() ?? order.kind;
  const kindImage = marbleImagesByKind[primaryKind] ?? marbleImagesByKind[order.kind];

  return (
    <article className="order-receipt-print receipt-fr" dir="ltr">
      <header className="receipt-header receipt-header--fr">
        <div className="receipt-brand-block">
          <h1 className="receipt-brand-title">S.A.R.L NEZZAR</h1>
          <p className="receipt-brand-sub">Marbre, granit, quartz</p>
        </div>
        <div className="receipt-logo-block">
          <img src={logoUrl} alt="" className="receipt-header-logo" />
          <p className="receipt-logo-name">NEZZAR MARBRE</p>
        </div>
      </header>

      <div className="receipt-owners">
        <p className="receipt-owner-left">
          <strong>Sahnoun Nazar</strong> — 0550718589
        </p>
        <p className="receipt-owner-right">
          <strong>Antar Nazar</strong> — 0550718568
        </p>
        <p className="receipt-owner-center">
          <strong>{t.commercial}</strong> — 0563542842
        </p>
      </div>

      <div className="receipt-title-row">
        <h2 className="receipt-title">
          {t.receipt} · {t.order} {orderRef}
        </h2>
        <p className="receipt-meta digits-latin">{orderDateText}</p>
      </div>

      <div className="receipt-summary-with-image">
        {kindImage ? (
          <img
            src={resolveMarbleImageUrl(kindImage)}
            alt=""
            className="receipt-marble-thumb"
          />
        ) : null}
        <dl className="receipt-info-grid">
          <div>
            <dt>{t.customer}</dt>
            <dd>{order.customer}</dd>
          </div>
          <div>
            <dt>{t.phone}</dt>
            <dd className="digits-latin">{order.customerPhone || '—'}</dd>
          </div>
          <div>
            <dt>{t.date}</dt>
            <dd className="digits-latin">{orderDateText}</dd>
          </div>
          <div>
            <dt>{t.staff}</dt>
            <dd>{order.staff}</dd>
          </div>
          <div>
            <dt>{t.status}</dt>
            <dd>{statusText}</dd>
          </div>
          <div>
            <dt>{t.marble}</dt>
            <dd>{order.kind}</dd>
          </div>
        </dl>
      </div>

      <table className="receipt-table">
        <thead>
          <tr>
            <th>{t.marble}</th>
            <th>{t.dimensions}</th>
            <th>{t.surface}</th>
            <th>{t.qty}</th>
            <th>{t.unitPrice}</th>
            <th>{t.amount}</th>
          </tr>
        </thead>
        <tbody>
          {pieces.map((row, i) => (
            <tr key={i}>
              <td>{row.kind}</td>
              <td className="digits-latin">{formatReceiptDimensions(row)}</td>
              <td className="digits-latin">{formatReceiptSurface(row)}</td>
              <td className="digits-latin">{formatNumber(row.qty)}</td>
              <td className="digits-latin">{formatCurrency(pieceUnitPrice(row), lang)}</td>
              <td className="digits-latin">{formatCurrency(pieceAmount(row), lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-totals">
        {(order.linesSubtotal > 0 ||
          order.edgeRoundingPrice > 0 ||
          (order.pausePrice ?? 0) > 0 ||
          (order.levierPrice ?? 0) > 0) && (
          <>
            <div className="receipt-total-row">
              <span>{t.slicesSubtotal}</span>
              <span className="digits-latin">
                {formatCurrency(order.linesSubtotal ?? order.total, lang)}
              </span>
            </div>
            {order.edgeRoundingPrice > 0 && (
              <div className="receipt-total-row receipt-total-row--stack">
                <span>{t.edgeRounding}</span>
                <span className="digits-latin text-end">
                  {edgeRoundingDetail && (
                    <span className="receipt-total-detail block">
                      {edgeRoundingDetail}
                    </span>
                  )}
                  {formatCurrency(order.edgeRoundingPrice, lang)}
                </span>
              </div>
            )}
            {(order.pausePrice ?? 0) > 0 && (
              <div className="receipt-total-row">
                <span>{t.pauseFee}</span>
                <span className="digits-latin">
                  {formatCurrency(order.pausePrice ?? 0, lang)}
                </span>
              </div>
            )}
            {(order.levierPrice ?? 0) > 0 && (
              <div className="receipt-total-row">
                <span>{t.levierFee}</span>
                <span className="digits-latin">
                  {formatCurrency(order.levierPrice ?? 0, lang)}
                </span>
              </div>
            )}
            {roundingAdjust !== 0 && (
              <div className="receipt-total-row">
                <span>{t.rounded}</span>
                <span className="digits-latin">{formatCurrency(roundingAdjust, lang)}</span>
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
            {deposits.map((d) => {
              const signed = depositSignedAmount(d);
              const isRefund = d.depositKind === 'refund';
              return (
                <li key={d.id} className="digits-latin">
                  {formatReceiptDate(d.date, lang, d.depositDate)} —{' '}
                  {isRefund
                    ? t.refund
                    : translatePaymentMethod(d.method, lang)}{' '}
                  — {formatCurrency(signed, lang)}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
