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
import { formatCurrency, formatNumber } from '@/lib/format';
import { computeEdgeRoundingTotal } from '@/lib/edge-rounding';

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
    source: 'مصدر القطعة',
    useRealSlice: 'من شريحة في المخزون',
    withoutSlice: 'بدون شريحة',
    inventorySlice: 'شريحة المخزون',
    cutLength: 'طول القطع (م)',
    cutWidth: 'عرض القطع (م)',
    thickness: 'السماكة (م)',
    noInventory: 'هذه القطعة لا تُخصم من المخزون.',
    qty: 'الكمية',
    lineTotal: 'سعر البيع',
    unitPrice: 'سعر المتر المربع',
    specialUnitPrice: 'سعر خاص لهذا الطلب',
    autoUnitPrice: 'سعر الشريحة',
    available: 'شرائح متبقية',
    remainderWasted:
      'باقي هذه الشريحة يُهدر. الطلب التالي يحتاج شريحة أخرى كاملة.',
    cutDoesNotFit:
      'مقاس القطع أكبر من الشريحة. اختر شريحة أكبر أو قلّل الأبعاد.',
    notEnoughSlices:
      'لا توجد شرائح كاملة كافية. كل قطعة تستهلك شريحة كاملة.',
    edgeRounding: 'تشطيب الحواف',
    pricePerMeter: 'سعر المتر (د.ج)',
    lengthMeters: 'الطول (م)',
    addLength: 'إضافة طول',
    edgeRoundingTotal: 'مجموع تشطيب الحواف',
    slicesSubtotal: 'مجموع القطع',
    orderTotal: 'إجمالي الطلب',
    cancel: 'إلغاء',
    save: 'حفظ الطلب',
    selectCustomer: 'اختر عميلاً',
    selectKind: 'اختر نوع الرخام',
    selectSlice: 'اختر شريحة',
    noSlices: 'لا توجد شرائح متاحة. يمكنك إنشاء القطعة بدون شريحة.',
    needThickness: 'أدخل سماكة القطعة',
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
    source: 'Origine de la pièce',
    useRealSlice: 'Depuis une dalle en stock',
    withoutSlice: 'Sans dalle',
    inventorySlice: 'Dalle en stock',
    cutLength: 'Longueur coupe (m)',
    cutWidth: 'Largeur coupe (m)',
    thickness: 'Épaisseur (m)',
    noInventory: 'Cette pièce ne sort pas du stock.',
    qty: 'Quantité',
    lineTotal: 'Prix vente',
    unitPrice: 'Prix au m²',
    specialUnitPrice: 'Prix spécial pour cette commande',
    autoUnitPrice: 'Prix de la dalle',
    available: 'Dalles restantes',
    remainderWasted:
      'Le reste de cette dalle est perdu. La commande suivante doit utiliser une autre dalle entière.',
    cutDoesNotFit:
      'La découpe ne tient pas sur la dalle. Choisissez une dalle plus grande ou réduisez les dimensions.',
    notEnoughSlices:
      'Pas assez de dalles entières. Chaque pièce consomme une dalle complète.',
    edgeRounding: 'Finition des chants',
    pricePerMeter: 'Prix au mètre (DA)',
    lengthMeters: 'Longueur (m)',
    addLength: 'Ajouter une longueur',
    edgeRoundingTotal: 'Total finition chants',
    slicesSubtotal: 'Sous-total pièces',
    orderTotal: 'Total commande',
    cancel: 'Annuler',
    save: 'Enregistrer',
    selectCustomer: 'Choisir un client',
    selectKind: 'Choisir le type',
    selectSlice: 'Choisir la dalle',
    noSlices: 'Aucune dalle disponible. Vous pouvez créer la pièce sans dalle.',
    needThickness: 'Indiquez l’épaisseur',
  },
};

type DraftLine = {
  kindId: string;
  useSlice: boolean;
  sliceId: string;
  cutLengthM: number;
  cutWidthM: number;
  thicknessM: number;
  qty: number;
  specialPrice: boolean;
  unitPrice: number;
};

const emptyLine = (): DraftLine => ({
  kindId: '',
  useSlice: true,
  sliceId: '',
  cutLengthM: 0.5,
  cutWidthM: 0.5,
  thicknessM: 0.02,
  qty: 1,
  specialPrice: false,
  unitPrice: 0,
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

function availableSlices(slice: MarbleSlice) {
  if (typeof slice.availableSliceCount === 'number') return slice.availableSliceCount;
  if (slice.areaOneSqm > 0) {
    return Math.floor(slice.availableNetAreaSqm / slice.areaOneSqm + 1e-6);
  }
  return 0;
}

function slicesNeeded(lines: DraftLine[], sliceId: string) {
  return lines.reduce(
    (sum, line) =>
      line.useSlice && line.sliceId === sliceId ? sum + line.qty : sum,
    0,
  );
}

function cutFits(line: DraftLine, slice: MarbleSlice) {
  const fitsOrientation =
    (line.cutLengthM <= slice.lengthM + 1e-6 && line.cutWidthM <= slice.widthM + 1e-6) ||
    (line.cutLengthM <= slice.widthM + 1e-6 && line.cutWidthM <= slice.lengthM + 1e-6);
  const pieceArea = line.cutLengthM * line.cutWidthM;
  return fitsOrientation && pieceArea <= slice.areaOneSqm + 1e-6;
}

function unitPriceFor(line: DraftLine, slice?: MarbleSlice) {
  if (!line.useSlice) return Math.max(0, Math.round(line.unitPrice));
  if (!slice) return 0;
  if (line.specialPrice) return Math.max(0, Math.round(line.unitPrice));
  return slice.sellingPerSqm;
}

function computeLinePrice(line: DraftLine, slice?: MarbleSlice) {
  if (line.useSlice && !slice) return 0;
  return Math.round(lineArea(line) * unitPriceFor(line, slice));
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
  const [edgePricePerM, setEdgePricePerM] = useState(0);
  const [edgeMeters, setEdgeMeters] = useState<number[]>([0]);
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
        map.set(id, slices);
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
  const edgeRoundingPrice = computeEdgeRoundingTotal(edgePricePerM, edgeMeters);
  const orderTotal = linesSubtotal + edgeRoundingPrice;

  const warnings = lines.map((line) => {
    if (!line.useSlice) {
      if (line.kindId && (!Number.isFinite(line.thicknessM) || line.thicknessM <= 0)) {
        return t.needThickness;
      }
      return null;
    }
    if (!line.sliceId) return null;
    const slice = sliceById.get(line.sliceId);
    if (!slice) return t.notEnoughSlices;
    if (!cutFits(line, slice)) return t.cutDoesNotFit;
    const needed = slicesNeeded(lines, line.sliceId);
    if (needed > availableSlices(slice)) return t.notEnoughSlices;
    return null;
  });

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.kindId !== undefined && patch.kindId !== line.kindId) {
          next.sliceId = '';
          if (!next.useSlice) {
            const price =
              slicesByKind.get(String(patch.kindId))?.[0]?.sellingPerSqm ?? 0;
            if (price > 0) next.unitPrice = price;
          }
        }
        if (patch.useSlice === false) {
          next.sliceId = '';
          next.specialPrice = true;
        }
        if (patch.useSlice === true) {
          next.specialPrice = false;
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
      setSubmitError(warnings.find(Boolean) ?? t.notEnoughSlices);
      return;
    }
    if (lines.some((l) => !l.kindId)) {
      setSubmitError(t.selectKind);
      return;
    }
    if (lines.some((l) => l.useSlice && !l.sliceId)) {
      setSubmitError(t.selectSlice);
      return;
    }
    if (lines.some((l) => !l.useSlice && l.thicknessM <= 0)) {
      setSubmitError(t.needThickness);
      return;
    }
    const payload: OrderCutLine[] = lines.map((l) =>
      l.useSlice
        ? {
            sliceId: l.sliceId,
            cutLengthM: l.cutLengthM,
            cutWidthM: l.cutWidthM,
            qty: l.qty,
            ...(l.specialPrice
              ? { sellingPerSqm: Math.max(0, Math.round(l.unitPrice)) }
              : {}),
          }
        : {
            kindId: l.kindId,
            cutLengthM: l.cutLengthM,
            cutWidthM: l.cutWidthM,
            thicknessM: l.thicknessM,
            qty: l.qty,
            sellingPerSqm: Math.max(0, Math.round(l.unitPrice)),
          },
    );
    createOrder.mutate({
      customerId,
      lines: payload,
      edgeRoundingPricePerM: edgePricePerM,
      edgeRoundingMeters: edgeMeters,
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
              const stockSlices = slices.filter((s) => availableSlices(s) > 0);
              const slice = line.useSlice ? sliceById.get(line.sliceId) : undefined;
              const linePrice = computeLinePrice(line, slice);
              const warn = warnings[index];
              const suggestedPrice = slices[0]?.sellingPerSqm ?? 0;
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
                    <label className="text-[10px] font-semibold sm:col-span-2">
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
                    <div className="text-[10px] font-semibold sm:col-span-2">
                      {t.source}
                      <div className="mt-1 grid grid-cols-2 gap-1 rounded-md bg-[#F1EEE8] p-1">
                        <button
                          type="button"
                          data-testid={`button-use-slice-${index}`}
                          onClick={() =>
                            updateLine(index, { useSlice: true, specialPrice: false })
                          }
                          className={`rounded px-2 py-2 text-[10px] font-bold ${
                            line.useSlice
                              ? 'bg-white text-[#3A3D3F] shadow-sm'
                              : 'text-[#6E665B]'
                          }`}
                        >
                          {t.useRealSlice}
                        </button>
                        <button
                          type="button"
                          data-testid={`button-without-slice-${index}`}
                          onClick={() =>
                            updateLine(index, {
                              useSlice: false,
                              sliceId: '',
                              specialPrice: true,
                              unitPrice: line.unitPrice || suggestedPrice,
                            })
                          }
                          className={`rounded px-2 py-2 text-[10px] font-bold ${
                            !line.useSlice
                              ? 'bg-white text-[#3A3D3F] shadow-sm'
                              : 'text-[#6E665B]'
                          }`}
                        >
                          {t.withoutSlice}
                        </button>
                      </div>
                    </div>
                    {line.useSlice ? (
                    <label className="text-[10px] font-semibold sm:col-span-2">
                      {t.inventorySlice}
                      <select
                        value={line.sliceId}
                        disabled={!line.kindId}
                        onChange={(e) => {
                          const sliceId = e.target.value;
                          const next = stockSlices.find((s) => s.id === sliceId);
                          updateLine(index, {
                            sliceId,
                            unitPrice: next?.sellingPerSqm ?? 0,
                            specialPrice: false,
                          });
                        }}
                        className="mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px] disabled:opacity-50"
                      >
                        <option value="">{t.selectSlice}</option>
                        {stockSlices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {formatNumber(s.lengthM, 2)}×{formatNumber(s.widthM, 2)}×
                            {formatNumber(s.thicknessM, 3)} m — {t.available}{' '}
                            {formatNumber(availableSlices(s))}
                          </option>
                        ))}
                      </select>
                    </label>
                    ) : (
                    <label className="text-[10px] font-semibold sm:col-span-2">
                      {t.thickness}
                      <input
                        data-testid={`input-thickness-${index}`}
                        type="number"
                        min={0.001}
                        step="0.001"
                        value={line.thicknessM || ''}
                        onChange={(e) =>
                          updateLine(index, { thicknessM: Number(e.target.value) })
                        }
                        className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                      />
                    </label>
                    )}
                    {line.useSlice && line.kindId && !sliceQueries.isFetching && stockSlices.length === 0 && (
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
                  {slice && (
                    <p className="mt-3 text-[10px] leading-relaxed text-[#9A6B22]">
                      {t.remainderWasted}
                    </p>
                  )}
                  {!line.useSlice && line.kindId && (
                    <p className="mt-3 text-[10px] leading-relaxed text-[#5F6B76]">
                      {t.noInventory}
                    </p>
                  )}
                  <div className="mt-3 space-y-2 border-t border-[#E7E5E0] pt-3 text-[11px]">
                    {line.useSlice && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[#5F6B76]">{t.autoUnitPrice}</span>
                      <b className="mono digits-latin">
                        {slice ? formatCurrency(slice.sellingPerSqm, lang) : '—'}
                        <span className="ms-1 font-medium text-[#8B949A]">/ m²</span>
                      </b>
                    </div>
                    )}
                    {line.useSlice && (
                    <label className="flex items-center gap-2 text-[10px] font-semibold text-[#3A3D3F]">
                      <input
                        type="checkbox"
                        data-testid={`checkbox-special-price-${index}`}
                        checked={line.specialPrice}
                        disabled={!slice}
                        onChange={(e) =>
                          updateLine(index, {
                            specialPrice: e.target.checked,
                            unitPrice: slice?.sellingPerSqm ?? line.unitPrice,
                          })
                        }
                      />
                      {t.specialUnitPrice}
                    </label>
                    )}
                    {(line.specialPrice || !line.useSlice) && (
                      <label className="block text-[10px] font-semibold">
                        {t.unitPrice}
                        <input
                          data-testid={`input-unit-price-${index}`}
                          type="number"
                          min={0}
                          step={1}
                          value={line.unitPrice || ''}
                          onChange={(e) =>
                            updateLine(index, { unitPrice: Number(e.target.value) || 0 })
                          }
                          className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                        />
                      </label>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[#5F6B76]">{t.lineTotal}</span>
                      <b className="mono digits-latin">{formatCurrency(linePrice, lang)}</b>
                    </div>
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

        <div className="rounded-lg border border-[#E7E5E0] bg-white p-4">
          <h3 className="mb-4 text-xs font-bold">{t.edgeRounding}</h3>
          <label className="mb-4 block text-[10px] font-semibold">
            {t.pricePerMeter}
            <input
              data-testid="input-edge-price-per-meter"
              type="number"
              min={0}
              step={1}
              value={edgePricePerM || ''}
              onChange={(e) => setEdgePricePerM(Number(e.target.value) || 0)}
              className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
            />
          </label>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#5F6B76]">
              {t.lengthMeters}
            </span>
            <button
              type="button"
              data-testid="button-add-edge-length"
              onClick={() => setEdgeMeters([...edgeMeters, 0])}
              className="inline-flex items-center gap-1 rounded-md bg-[#F1EEE8] px-2.5 py-2 text-[10px] font-bold text-[#6E665B] hover:bg-[#E5DED2]"
            >
              <Plus size={13} /> {t.addLength}
            </button>
          </div>
          <div className="space-y-2">
            {edgeMeters.map((meters, index) => (
              <div key={index} className="flex items-end gap-2">
                <label className="flex-1 text-[10px] font-semibold">
                  <span className="mono digits-latin text-[#9B8C77]">
                    #{formatNumber(index + 1)}
                  </span>
                  <input
                    data-testid={`input-edge-meters-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={meters || ''}
                    onChange={(e) =>
                      setEdgeMeters(
                        edgeMeters.map((v, i) =>
                          i === index ? Number(e.target.value) || 0 : v,
                        ),
                      )
                    }
                    className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                  />
                </label>
                {edgeMeters.length > 1 && (
                  <button
                    type="button"
                    data-testid={`button-remove-edge-length-${index}`}
                    onClick={() =>
                      setEdgeMeters(edgeMeters.filter((_, i) => i !== index))
                    }
                    className="mb-1 text-[#D95C55]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-[#E7E5E0] pt-3 text-[11px]">
            <span className="text-[#5F6B76]">{t.edgeRoundingTotal}</span>
            <b
              data-testid="text-edge-rounding-total"
              className="mono digits-latin"
            >
              {formatCurrency(edgeRoundingPrice, lang)}
            </b>
          </div>
        </div>

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
