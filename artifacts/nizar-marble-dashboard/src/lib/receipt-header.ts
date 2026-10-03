const STORAGE_KEY = 'nizar-marble-receipt-header';

export type ReceiptHeaderLines = [string, string, string];

export function loadReceiptHeaderLines(): ReceiptHeaderLines {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ['', '', ''];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return ['', '', ''];
    return [
      String(parsed[0] ?? ''),
      String(parsed[1] ?? ''),
      String(parsed[2] ?? ''),
    ];
  } catch {
    return ['', '', ''];
  }
}

export function saveReceiptHeaderLines(lines: ReceiptHeaderLines) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}
