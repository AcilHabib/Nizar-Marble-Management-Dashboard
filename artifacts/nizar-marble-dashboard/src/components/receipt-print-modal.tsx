import { Printer, X } from 'lucide-react';
import { useState } from 'react';

export type ReceiptDocLang = 'ar' | 'fr';

export function ReceiptPrintModal({
  uiLang,
  onClose,
  onPrint,
}: {
  uiLang: 'ar' | 'fr';
  onClose: () => void;
  onPrint: (docLang: ReceiptDocLang) => void;
}) {
  const [docLang, setDocLang] = useState<ReceiptDocLang>('ar');

  const t =
    uiLang === 'ar'
      ? {
          title: 'طباعة الإيصال',
          hint: 'اختر لغة وثيقة الإيصال قبل الطباعة.',
          ar: 'العربية',
          fr: 'Français',
          cancel: 'إلغاء',
          print: 'طباعة',
        }
      : {
          title: 'Imprimer le reçu',
          hint: 'Choisissez la langue du reçu avant l’impression.',
          ar: 'Arabe',
          fr: 'Français',
          cancel: 'Annuler',
          print: 'Imprimer',
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17212B]/35 p-4 backdrop-blur-[2px]">
      <div
        className="fade-up w-full max-w-md rounded-[13px] bg-[#F8F8F6] p-5 shadow-2xl"
        dir={uiLang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{t.title}</h2>
          <button
            type="button"
            data-testid="button-close-receipt-print-modal"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#8B949A] hover:bg-[#E7E5E0]"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-[#5F6B76]">{t.hint}</p>
        <div className="mb-6 flex gap-2">
          {(['ar', 'fr'] as const).map((code) => (
            <button
              key={code}
              type="button"
              data-testid={`button-receipt-lang-${code}`}
              onClick={() => setDocLang(code)}
              className={`flex-1 rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                docLang === code
                  ? 'border-[#3A3D3F] bg-[#3A3D3F] text-white'
                  : 'border-[#E7E5E0] bg-white text-[#3A3D3F] hover:border-[#CFC3AE]'
              }`}
            >
              {code === 'ar' ? t.ar : t.fr}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-[#E7E5E0] px-3.5 py-2.5 text-xs font-semibold"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            data-testid="button-confirm-receipt-print"
            onClick={() => onPrint(docLang)}
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#3A3D3F] px-3.5 py-2.5 text-xs font-semibold text-white"
          >
            <Printer size={14} />
            {t.print}
          </button>
        </div>
      </div>
    </div>
  );
}
