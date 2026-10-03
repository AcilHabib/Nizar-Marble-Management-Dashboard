import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { saveReceiptHeaderLines, type ReceiptHeaderLines } from '@/lib/receipt-header';

const logoUrl = `${import.meta.env.BASE_URL}nizar-marble-logo.png`;

const copy = {
  ar: {
    title: 'رأس الإيصال',
    hint: '3 أسطر على يمين الشعار (تُحفظ على هذا الجهاز)',
    line: 'سطر',
    save: 'تم',
    cancel: 'إغلاق',
  },
  fr: {
    title: 'En-tête du reçu',
    hint: '3 lignes à droite du logo (enregistrées sur cet appareil)',
    line: 'Ligne',
    save: 'OK',
    cancel: 'Fermer',
  },
};

export function ReceiptHeaderSettingsModal({
  lang,
  lines,
  onChange,
  onClose,
}: {
  lang: 'ar' | 'fr';
  lines: ReceiptHeaderLines;
  onChange: (lines: ReceiptHeaderLines) => void;
  onClose: () => void;
}) {
  const t = copy[lang];
  const setLine = (index: 0 | 1 | 2, value: string) => {
    const next = [...lines] as ReceiptHeaderLines;
    next[index] = value;
    onChange(next);
    saveReceiptHeaderLines(next);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17212B]/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[13px] bg-[#F8F8F6] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{t.title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-[#8B949A] hover:bg-[#E7E5E0]">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-[10px] text-[#8B949A]">{t.hint}</p>
        <div className="mb-4 flex items-start gap-4 rounded-lg border border-[#E7E5E0] bg-white p-3" dir="ltr">
          <img src={logoUrl} alt="" className="h-12 w-auto shrink-0 object-contain" />
          <div className="min-w-0 flex-1 space-y-1 text-end text-[11px] text-[#5F6B76]">
            {lines.map((l, i) => (l.trim() ? <p key={i}>{l}</p> : null))}
            {!lines.some((l) => l.trim()) && <p className="text-[#C4C4C4]">—</p>}
          </div>
        </div>
        <div className="space-y-2">
          {([0, 1, 2] as const).map((i) => (
            <label key={i} className="block text-[10px] font-semibold text-[#5F6B76]">
              {t.line} {i + 1}
              <input
                data-testid={`input-receipt-header-line-${i + 1}`}
                type="text"
                maxLength={120}
                value={lines[i]}
                onChange={(e) => setLine(i, e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs text-[#17212B] outline-none focus:border-[#CFC3AE]"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            data-testid="button-close-receipt-header"
            onClick={onClose}
            className="rounded-[8px] bg-[#3A3D3F] px-4 py-2 text-xs font-semibold text-white"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
