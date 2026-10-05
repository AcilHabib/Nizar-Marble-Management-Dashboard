import { statusLabelFr, normalizeOrderStatus } from '@/lib/order-status';

type Lang = 'ar' | 'fr';

const PAYMENT_METHOD_FR: Record<string, string> = {
  'تحويل بنكي': 'Virement bancaire',
  'نقدي': 'Espèces',
  'بطاقة': 'Carte bancaire',
};

export function translatePaymentMethod(method: string, lang: Lang): string {
  if (lang === 'ar') return method;
  return PAYMENT_METHOD_FR[method] ?? method;
}

export function translateOrderStatus(status: string, lang: Lang): string {
  const s = normalizeOrderStatus(status);
  if (lang === 'ar') return String(s);
  return statusLabelFr(String(s));
}

export function formatReceiptDate(
  displayDate: string,
  lang: Lang,
  iso?: string,
): string {
  const raw = iso ?? displayDate;
  const d = iso ? new Date(iso) : new Date(displayDate);
  if (!Number.isNaN(d.getTime()) && iso) {
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  if (lang === 'fr') {
    return displayDate
      .replace('October', 'octobre')
      .replace('January', 'janvier')
      .replace('February', 'février')
      .replace('March', 'mars')
      .replace('April', 'avril')
      .replace('May', 'mai')
      .replace('June', 'juin')
      .replace('July', 'juillet')
      .replace('August', 'août')
      .replace('September', 'septembre')
      .replace('November', 'novembre')
      .replace('December', 'décembre');
  }
  return raw;
}

export function translateEdges(edges: string | null | undefined, lang: Lang): string {
  if (!edges || edges === '—') {
    return lang === 'fr' ? '—' : '—';
  }
  if (lang === 'ar') return edges;
  return edges.replace(/د\.ج/g, ' DA').replace(/—/g, '—');
}
