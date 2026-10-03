import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Minus, Plus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  api,
  type MarbleKind,
  type MarbleSlice,
  type OrderCutLine,
} from '@/lib/api';
import {
  formatAreaSqm,
  formatCurrency,
  formatNumber,
} from '@/lib/format';

type Lang = 'ar' | 'fr';

const labels = {
  ar: {
    customer: 'العميل',
    newCustomer: 'عميل جديد',
    fullName: 'الاسم الكامل',
    phone: 'الهاتف',
    address: 'العنوان',
    saveCustomer: 'حفظ العميل',
    cuts: 'قطع الطلب',
    addCut: 'إضافة قطعة',
    marbleKind: 'نوع الرخام',
    inventorySlice: 'شريحة المخزون',
    cutLength: 'طول القطع (م)',
    cutWidth: 'عرض القطع (م)',
    qty: 'الكمية',
    lineTotal: 'سعر البيع',
    available: 'متاح',
    edgeRounding: 'تشطيب الحواف (يدوي)',
    slicesSubtotal: 'مجموع القطع',
    orderTotal: 'إجمالي الطلب',
    cancel: 'إلغاء',
    save: 'حفظ الطلب',
    selectCustomer: 'اختر عميلاً',
    selectKind: 'اختر نوع الرخام',
    selectSlice: 'اختر شريحة',
    sliceExhausted:
      'مساحة هذه الشريحة في المخزون غير كافية. اختر شريحة أخرى أو قلّل الأبعاد/الكمية.',
    noSlices: 'لا توجد شرائح متاحة لهذا النوع',
  },
  fr: {
    customer: 'Client',
    newCustomer: 'Nouveau client',
    fullName: 'Nom complet',
    phone: 'Téléphone',
    address: 'Adresse',
    saveCustomer: 'Enregistrer',
    cuts: 'Pièces à découper',
    addCut: 'Ajouter une pièce',
    marbleKind: 'Type de marbre',
    inventorySlice: 'Dalle en stock',
    cutLength: 'Longueur coupe (m)',
    cutWidth: 'Largeur coupe (m)',
    qty: 'Quantité',
    lineTotal: 'Prix vente',
    available: 'Dispo',
    edgeRounding: 'Finition des chants (manuel)',
    slicesSubtotal: 'Sous-total pièces',
    orderTotal: 'Total commande',
    cancel: 'Annuler',
    save: 'Enregistrer',
    selectCustomer: 'Choisir un client',
    selectKind: 'Choisir le type',
    selectSlice: 'Choisir la dalle',
    sliceExhausted:
      'Surface insuffisante sur cette dalle. Choisissez une autre dalle ou réduisez dimensions/quantité.',
    noSlices: 'Aucune dalle disponible pour ce type',
  },
};

type DraftLine = {
  kindId: string;
  sliceId: string;
  cutLengthM: number;
  cutWidthM: number;
  qty: number;
};

const emptyLine = (): DraftLine => ({
  kindId: '',
  sliceId: '',
  cutLengthM: 0.5,
  cutWidthM: 0.5,
  qty: 1,
});

function Modal({
  title,
  onClose,
  children,
  wide,
  layer = 'base',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  layer?: 'base' | 'stack';
}) {
  const z = layer === 'stack' ? 'z-[100]' : 'z-50';
  return createPortal(
    <div className={`fixed inset-0 ${z} flex items-end justify-center bg-[#17212B]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4`}>
      <div className={`fade-up max-h-[90vh] w-full overflow-y-auto rounded-t-[16px] bg-[#F8F8F6] p-5 shadow-2xl sm:rounded-[13px] md:p-6 ${wide ? 'max-w-[720px]' : 'max-w-[500px]'}`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-[#8B949A] hover:bg-[#E7E5E0]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function QuantityStepper({
  value,
  onChange,
  testId,
}: {
  value: number;
  onChange: (n: number) => void;
  testId: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[#E7E5E0] bg-white p-0.5">
      <button type="button" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#F1EEE8] disabled:opacity-40">
        <Minus size={14} />
      </button>
      <span data-testid={testId} className="digits-latin mono min-w-[2rem] text-center text-xs font-bold">{formatNumber(value)}</span>
      <button type="button" onClick={() => onChange(value + 1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#F1EEE8]">
        <Plus size={14} />
      </button>
    </div>
  );
}

function lineArea(line: DraftLine) {
  return line.cutLengthM * line.cutWidthM * line.qty;
}

function draftUsageForSlice(lines: DraftLine[], sliceId: string, skipIndex?: number) {
  return lines.reduce((sum, line, i) => {
    if (i === skipIndex || line.sliceId !== sliceId) return sum;
    return sum + lineArea(line);
  }, 0);
}

function computeLinePrice(line: DraftLine, slice?: MarbleSlice) {
  if (!slice) return 0;
  return Math.round(lineArea(line) * slice.sellingPerSqm);
}

export function OrderCreateForm({
  lang,
  title,
  onClose,
  onSuccess,
}: {
  lang: Lang;
  title: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const t = labels[lang];
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [customerModal, setCustomerModal] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [edgeRoundingPrice, setEdgeRoundingPrice] = useState(0);
  const [submitError, setSubmitError] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers,
  });

  const { data: kinds = [] } = useQuery({
    queryKey: ['marble-kinds', 'order'],
    queryFn: () => api.getMarbleKinds({ visible: 'true' }),
  });

  const kindIds = [...new Set(lines.map((l) => l.kindId).filter(Boolean))];
  const sliceQueries = useQuery({
    queryKey: ['order-slices', kindIds],
    queryFn: async () => {
      const map = new Map<string, MarbleSlice[]>();
      for (const id of kindIds) {
        const { slices } = await api.getMarbleKind(id);
        map.set(
          id,
          slices.filter((s) => s.availableNetAreaSqm > 0.0001),
        );
      }
      return map;
    },
    enabled: kindIds.length > 0,
  });

  const slicesByKind = sliceQueries.data ?? new Map<string, MarbleSlice[]>();

  const sliceById = useMemo(() => {
    const m = new Map<string, MarbleSlice>();
    for (const slices of slicesByKind.values()) {
      for (const s of slices) m.set(s.id, s);
    }
    return m;
  }, [slicesByKind]);

  const createCustomer = useMutation({
    mutationFn: api.createCustomer,
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setCustomerId(c.id);
      setCustomerModal(false);
    },
  });

  const createOrder = useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      qc.invalidateQueries({ queryKey: ['marble-kinds'] });
      kindIds.forEach((id) => qc.invalidateQueries({ queryKey: ['marble-kind', id] }));
      onSuccess?.();
      onClose();
    },
    onError: (err: Error) => setSubmitError(err.message),
  });

  const linesSubtotal = lines.reduce(
    (sum, line) => sum + computeLinePrice(line, sliceById.get(line.sliceId)),
    0,
  );
  const orderTotal = linesSubtotal + edgeRoundingPrice;

  const warnings = lines.map((line, index) => {
    if (!line.sliceId) return null;
    const slice = sliceById.get(line.sliceId);
    if (!slice) return t.sliceExhausted;
    const needed = draftUsageForSlice(lines, line.sliceId);
    const available = slice.availableNetAreaSqm;
    if (needed > available + 1e-6) return t.sliceExhausted;
    return null;
  });

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.kindId !== undefined && patch.kindId !== line.kindId) {
          next.sliceId = '';
        }
        return next;
      }),
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!customerId) {
      setSubmitError(t.selectCustomer);
      return;
    }
    if (warnings.some(Boolean)) {
      setSubmitError(t.sliceExhausted);
      return;
    }
    const payload: OrderCutLine[] = lines.map((l) => ({
      sliceId: l.sliceId,
      cutLengthM: l.cutLengthM,
      cutWidthM: l.cutWidthM,
      qty: l.qty,
    }));
    if (payload.some((l) => !l.sliceId)) {
      setSubmitError(t.selectSlice);
      return;
    }
    createOrder.mutate({
      customerId,
      lines: payload,
      edgeRoundingPrice,
    });
  };

  return (
    <Modal title={title} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-xs font-semibold">
            {t.customer}
            <select
              data-testid="select-order-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs outline-none focus:border-[#CFC3AE]"
            >
              <option value="">{t.selectCustomer}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} — {c.phone}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            data-testid="button-new-customer"
            onClick={() => setCustomerModal(true)}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#E7E5E0] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#3A3D3F] hover:border-[#CFC3AE]"
          >
            <Plus size={13} /> {t.newCustomer}
          </button>
        </div>

        <div className="rounded-lg border border-[#E7E5E0] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold">{t.cuts}</h3>
            <button
              type="button"
              data-testid="button-add-cut"
              onClick={() => setLines([...lines, emptyLine()])}
              className="inline-flex items-center gap-1 rounded-md bg-[#F1EEE8] px-2.5 py-2 text-[10px] font-bold text-[#6E665B] hover:bg-[#E5DED2]"
            >
              <Plus size={13} /> {t.addCut}
            </button>
          </div>
          <div className="space-y-4">
            {lines.map((line, index) => {
              const slices = line.kindId ? slicesByKind.get(line.kindId) ?? [] : [];
              const slice = sliceById.get(line.sliceId);
              const linePrice = computeLinePrice(line, slice);
              const warn = warnings[index];
              return (
                <div key={index} className="rounded-lg border border-[#F0EEE9] bg-[#FBFAF8] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="mono digits-latin text-[10px] text-[#9B8C77]">
                      #{formatNumber(index + 1)}
                    </span>
                    {lines.length > 1 && (
                      <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== index))} className="text-[#D95C55]">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-[10px] font-semibold">
                      {t.marbleKind}
                      <select
                        value={line.kindId}
                        onChange={(e) => updateLine(index, { kindId: e.target.value })}
                        className="mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                      >
                        <option value="">{t.selectKind}</option>
                        {kinds.map((k: MarbleKind) => (
                          <option key={k.id} value={k.id}>
                            {k.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[10px] font-semibold">
                      {t.inventorySlice}
                      <select
                        value={line.sliceId}
                        disabled={!line.kindId}
                        onChange={(e) => updateLine(index, { sliceId: e.target.value })}
                        className="mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px] disabled:opacity-50"
                      >
                        <option value="">{t.selectSlice}</option>
                        {slices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {formatNumber(s.lengthM, 2)}×{formatNumber(s.widthM, 2)}×
                            {formatNumber(s.thicknessM, 3)} m — {t.available}{' '}
                            {formatAreaSqm(s.availableNetAreaSqm)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {line.kindId && slices.length === 0 && (
                      <p className="sm:col-span-2 text-[10px] text-[#D99A32]">{t.noSlices}</p>
                    )}
                    <label className="text-[10px] font-semibold">
                      {t.cutLength}
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={line.cutLengthM}
                        onChange={(e) =>
                          updateLine(index, { cutLengthM: Number(e.target.value) })
                        }
                        className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                      />
                    </label>
                    <label className="text-[10px] font-semibold">
                      {t.cutWidth}
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={line.cutWidthM}
                        onChange={(e) =>
                          updateLine(index, { cutWidthM: Number(e.target.value) })
                        }
                        className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                      />
                    </label>
                    <div className="flex items-end justify-between gap-2 sm:col-span-2">
                      <span className="text-[10px] font-semibold">{t.qty}</span>
                      <QuantityStepper
                        testId={`input-cut-qty-${index}`}
                        value={line.qty}
                        onChange={(qty) => updateLine(index, { qty })}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E5E0] pt-3 text-[11px]">
                    <span className="text-[#5F6B76]">{t.lineTotal}</span>
                    <b className="mono digits-latin">{formatCurrency(linePrice, lang)}</b>
                  </div>
                  {warn && (
                    <div className="mt-2 flex items-start gap-2 rounded-md border border-[#F5DFC4] bg-[#FCF4E5] px-3 py-2 text-[10px] text-[#9A6B22]">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      {warn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <label className="block text-xs font-semibold">
          {t.edgeRounding}
          <input
            data-testid="input-edge-rounding"
            type="number"
            min={0}
            value={edgeRoundingPrice || ''}
            onChange={(e) => setEdgeRoundingPrice(Number(e.target.value) || 0)}
            className="digits-latin mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs"
          />
        </label>

        <div className="space-y-2 rounded-lg border border-[#E7E5E0] bg-white p-4 text-xs">
          <div className="flex justify-between text-[#5F6B76]">
            <span>{t.slicesSubtotal}</span>
            <b className="mono digits-latin">{formatCurrency(linesSubtotal, lang)}</b>
          </div>
          <div className="flex justify-between text-[#5F6B76]">
            <span>{t.edgeRounding}</span>
            <b className="mono digits-latin">{formatCurrency(edgeRoundingPrice, lang)}</b>
          </div>
          <div className="flex justify-between border-t border-[#E7E5E0] pt-2 text-sm font-bold">
            <span>{t.orderTotal}</span>
            <b data-testid="text-order-total" className="mono digits-latin">
              {formatCurrency(orderTotal, lang)}
            </b>
          </div>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 rounded-lg border border-[#F0C5C2] bg-[#FBEDEC] px-3 py-2 text-[11px] text-[#D95C55]">
            <AlertCircle size={14} className="mt-0.5" />
            {submitError}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[8px] border border-[#E7E5E0] px-3.5 py-2.5 text-xs font-semibold">
            {t.cancel}
          </button>
          <button
            type="submit"
            data-testid="button-submit-order"
            disabled={createOrder.isPending}
            className="rounded-[8px] bg-[#3A3D3F] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#17212B] disabled:opacity-50"
          >
            {t.save}
          </button>
        </div>
      </form>

      {customerModal && (
        <Modal title={t.newCustomer} onClose={() => setCustomerModal(false)} layer="stack">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createCustomer.mutate({
                fullName: String(fd.get('fullName')),
                phone: String(fd.get('phone')),
                address: String(fd.get('address')),
              });
            }}
            className="space-y-4"
          >
            <label className="block text-xs font-semibold">
              {t.fullName}
              <input name="fullName" required className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] px-3 text-xs" />
            </label>
            <label className="block text-xs font-semibold">
              {t.phone}
              <input name="phone" required className="digits-latin mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] px-3 text-xs" />
            </label>
            <label className="block text-xs font-semibold">
              {t.address}
              <input name="address" required className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] px-3 text-xs" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCustomerModal(false)} className="rounded-[8px] border border-[#E7E5E0] px-3 py-2 text-xs font-semibold">
                {t.cancel}
              </button>
              <button type="submit" className="rounded-[8px] bg-[#3A3D3F] px-3 py-2 text-xs font-semibold text-white">
                {t.saveCustomer}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
}
