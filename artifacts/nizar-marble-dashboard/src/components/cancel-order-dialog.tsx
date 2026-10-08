import { X } from 'lucide-react';

type Lang = 'ar' | 'fr';

const labels = {
  ar: {
    title: 'إلغاء الطلب',
    hint: 'ماذا يحدث لشريحة الرخام المستخدمة في هذا الطلب؟',
    returnSlice: 'إرجاع الشريحة إلى المخزون',
    returnHint: 'يمكن استخدامها في طلب جديد',
    wasteSlice: 'إهدار الشريحة',
    wasteHint: 'لا تعود إلى المخزون',
    close: 'تراجع',
  },
  fr: {
    title: 'Annuler la commande',
    hint: 'Que devient la dalle utilisée pour cette commande ?',
    returnSlice: 'Remettre la dalle en stock',
    returnHint: 'Elle pourra servir à une nouvelle commande',
    wasteSlice: 'Perdre la dalle',
    wasteHint: 'Elle ne revient pas en stock',
    close: 'Retour',
  },
};

export function CancelOrderDialog({
  lang,
  pending,
  error,
  onClose,
  onChoose,
}: {
  lang: Lang;
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onChoose: (disposition: 'return' | 'waste') => void;
}) {
  const t = labels[lang];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17212B]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        className="fade-up w-full max-w-md rounded-t-[16px] bg-[#F8F8F6] p-5 shadow-2xl sm:rounded-[13px]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{t.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#8B949A] hover:bg-[#E7E5E0]"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-[#5F6B76]">{t.hint}</p>
        <div className="space-y-2">
          <button
            type="button"
            data-testid="button-cancel-return-slice"
            disabled={pending}
            onClick={() => onChoose('return')}
            className="w-full rounded-lg border border-[#BCE3C9] bg-[#EAF6EF] px-4 py-3 text-start disabled:opacity-50"
          >
            <span className="block text-xs font-bold text-[#2E9B68]">{t.returnSlice}</span>
            <span className="mt-1 block text-[10px] text-[#5F6B76]">{t.returnHint}</span>
          </button>
          <button
            type="button"
            data-testid="button-cancel-waste-slice"
            disabled={pending}
            onClick={() => onChoose('waste')}
            className="w-full rounded-lg border border-[#F0C5C2] bg-[#FBEDEC] px-4 py-3 text-start disabled:opacity-50"
          >
            <span className="block text-xs font-bold text-[#D95C55]">{t.wasteSlice}</span>
            <span className="mt-1 block text-[10px] text-[#5F6B76]">{t.wasteHint}</span>
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-[11px] text-[#D95C55]">{error}</p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-[#E7E5E0] px-3.5 py-2.5 text-xs font-semibold"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
