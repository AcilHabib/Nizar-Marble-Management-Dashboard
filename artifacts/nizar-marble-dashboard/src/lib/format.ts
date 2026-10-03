const LATN = 'en-US';

export function formatNumber(value: number, fractionDigits = 0) {
  return value.toLocaleString(LATN, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Algerian dinar — always Western digits */
export function formatCurrency(value: number, lang: 'ar' | 'fr' = 'ar') {
  const suffix = lang === 'fr' ? ' DA' : ' د.ج';
  return `${formatNumber(value)}${suffix}`;
}

export function formatAreaSqm(value: number) {
  return `${formatNumber(value, 2)} m²`;
}

export function isImageSource(value: string) {
  return (
    value.startsWith('blob:') ||
    value.startsWith('data:') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  );
}
