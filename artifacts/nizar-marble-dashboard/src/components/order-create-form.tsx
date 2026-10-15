import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
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
type EdgeKind = 'linear' | '45';
type EdgeDraft = { kind: '' | EdgeKind; meters: number };

function isPaperFile(file: File) {
  if (file.type.startsWith('image/') || file.type === 'application/pdf') return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|pdf)$/i.test(file.name);
}

function paperKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

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
    edgeType: 'نوع الحافة',
    edgeLinear: 'خطي',
    edge45: '45 درجة',
    edgeTypeHint: 'اختر نوع الحافة قبل إدخال الطول.',
    lengthMeters: 'الطول (م)',
    addLength: 'إضافة طول',
    edgeRoundingTotal: 'مجموع تشطيب الحواف',
    needEdgeType: 'اختر نوع الحافة: خطي أو 45 درجة',
    needEdgeLength: 'أدخل طول الحافة',
    feeAmount: 'المبلغ (د.ج)',
    slicesSubtotal: 'مجموع القطع',
    orderTotal: 'إجمالي الطلب',
    keepPrice: 'السعر المحسوب',
    roundPrice: 'سعر مدوّر',
    roundAmount: 'المبلغ المدوّر (د.ج)',
    needRounded: 'أدخل السعر المدوّر',
    dimensionPaper: 'ورقة المقاسات',
    paperHint: 'صورة أو PDF للورقة التي كتب عليها الزبون المقاسات.',
    choosePaper: 'اختيار ملف',
    paperType: 'يُقبل الصور وملفات PDF فقط.',
    paperFailed: 'تم حفظ الطلب، وتعذر حفظ ورقة المقاسات. أعد المحاولة.',
    cancel: 'إلغاء',
    save: 'حفظ الطلب',
    selectCustomer: 'اختر عميلاً',
    selectKind: 'اختر نوع الرخام',
    selectSlice: 'اختر شريحة',
    noSlices: 'لا توجد شرائح متاحة. يمكنك إنشاء القطعة بدون شريحة.',
    needThickness: 'أدخل سماكة القطعة',
    needSize: 'أدخل الطول والعرض لكل قطعة',
    enterHint: 'Enter ينقل المؤشر: السماكة، ثم الطول، ثم العرض، ثم قطعة جديدة بنفس السماكة.',
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
    edgeType: 'Type de chant',
    edgeLinear: 'Linéaire',
    edge45: '45 degrés',
    edgeTypeHint: 'Choisissez le type de chant avant d’entrer la longueur.',
    lengthMeters: 'Longueur (m)',
    addLength: 'Ajouter une longueur',
    edgeRoundingTotal: 'Total finition chants',
    needEdgeType: 'Choisissez le type de chant : linéaire ou 45 degrés',
    needEdgeLength: 'Indiquez la longueur du chant',
    feeAmount: 'Montant (DA)',
    slicesSubtotal: 'Sous-total pièces',
    orderTotal: 'Total commande',
    keepPrice: 'Prix calculé',
    roundPrice: 'Prix arrondi',
    roundAmount: 'Montant arrondi (DA)',
    needRounded: 'Indiquez le prix arrondi',
    dimensionPaper: 'Feuille des mesures',
    paperHint: 'Photo ou PDF de la feuille où le client a noté les dimensions.',
    choosePaper: 'Choisir un fichier',
    paperType: 'Images et PDF uniquement.',
    paperFailed: 'La commande est enregistrée, mais la feuille n’a pas pu être enregistrée. Réessayez.',
    cancel: 'Annuler',
    save: 'Enregistrer',
    selectCustomer: 'Choisir un client',
    selectKind: 'Choisir le type',
    selectSlice: 'Choisir la dalle',
    noSlices: 'Aucune dalle disponible. Vous pouvez créer la pièce sans dalle.',
    needThickness: 'Indiquez l’épaisseur',
    needSize: 'Indiquez la longueur et la largeur de chaque pièce',
    enterHint: 'Entrée avance : épaisseur, longueur, largeur, puis une nouvelle pièce de la même épaisseur.',
  },
};

type SizeDraft = {
  key: string;
  cutLengthM: number | '';
  cutWidthM: number | '';
  qty: number;
};

type DraftGroup = {
  key: string;
  kindId: string;
  useSlice: boolean;
  sliceId: string;
  thicknessM: number | '';
  specialPrice: boolean;
  unitPrice: number | '';
  unitPriceTouched: boolean;
  sizes: SizeDraft[];
};

let draftKey = 0;
function nextKey() {
  draftKey += 1;
  return `d${draftKey}`;
}

function emptySize(): SizeDraft {
  return { key: nextKey(), cutLengthM: '', cutWidthM: '', qty: 1 };
}

const emptyGroup = (): DraftGroup => ({
  key: nextKey(),
  kindId: '',
  useSlice: false,
  sliceId: '',
  thicknessM: '',
  specialPrice: true,
  unitPrice: '',
  unitPriceTouched: false,
  sizes: [emptySize()],
});

function asNumber(value: number | '') {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function sizeComplete(size: SizeDraft) {
  return asNumber(size.cutLengthM) > 0 && asNumber(size.cutWidthM) > 0;
}

function sizeBlank(size: SizeDraft) {
  return size.cutLengthM === '' && size.cutWidthM === '';
}

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

function sizeArea(size: SizeDraft) {
  return asNumber(size.cutLengthM) * asNumber(size.cutWidthM) * size.qty;
}

function availableSlices(slice: MarbleSlice) {
  if (typeof slice.availableSliceCount === 'number') return slice.availableSliceCount;
  if (slice.areaOneSqm > 0) {
    return Math.floor(slice.availableNetAreaSqm / slice.areaOneSqm + 1e-6);
  }
  return 0;
}

function slicesNeeded(groups: DraftGroup[], sliceId: string) {
  return groups.reduce((sum, group) => {
    if (!group.useSlice || group.sliceId !== sliceId) return sum;
    return sum + group.sizes.reduce((qty, size) => qty + size.qty, 0);
  }, 0);
}

function cutFits(size: SizeDraft, slice: MarbleSlice) {
  const length = asNumber(size.cutLengthM);
  const width = asNumber(size.cutWidthM);
  const fitsOrientation =
    (length <= slice.lengthM + 1e-6 && width <= slice.widthM + 1e-6) ||
    (length <= slice.widthM + 1e-6 && width <= slice.lengthM + 1e-6);
  const pieceArea = length * width;
  return fitsOrientation && pieceArea <= slice.areaOneSqm + 1e-6;
}

function unitPriceFor(group: DraftGroup, slice?: MarbleSlice) {
  if (!group.useSlice) return Math.max(0, Math.round(asNumber(group.unitPrice)));
  if (!slice) return 0;
  if (group.specialPrice) return Math.max(0, Math.round(asNumber(group.unitPrice)));
  return slice.sellingPerSqm;
}

function computeSizePrice(group: DraftGroup, size: SizeDraft, slice?: MarbleSlice) {
  if (!sizeComplete(size)) return 0;
  if (group.useSlice && !slice) return 0;
  return Math.round(sizeArea(size) * unitPriceFor(group, slice));
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
  const [groups, setGroups] = useState<DraftGroup[]>([emptyGroup()]);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [edgePricePerM, setEdgePricePerM] = useState(0);
  const [edgeRows, setEdgeRows] = useState<EdgeDraft[]>([{ kind: '', meters: 0 }]);
  const [pausePrice, setPausePrice] = useState(0);
  const [levierPrice, setLevierPrice] = useState(0);
  const [roundPrice, setRoundPrice] = useState(false);
  const [roundedAmount, setRoundedAmount] = useState<number | ''>('');
  const [roundedTouched, setRoundedTouched] = useState(false);
  const [paperFiles, setPaperFiles] = useState<File[]>([]);
  const [paperError, setPaperError] = useState('');
  const savedOrderNumber = useRef<string | null>(null);
  const paperPreviews = useMemo(
    () =>
      paperFiles.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      })),
    [paperFiles],
  );
  useEffect(() => {
    return () => {
      for (const preview of paperPreviews) {
        if (preview.url) URL.revokeObjectURL(preview.url);
      }
    };
  }, [paperPreviews]);
  const [submitError, setSubmitError] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers,
  });

  const { data: kinds = [] } = useQuery({
    queryKey: ['marble-kinds', 'order'],
    queryFn: () => api.getMarbleKinds({ visible: 'true' }),
  });

  const kindIds = [...new Set(groups.map((group) => group.kindId).filter(Boolean))];
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

  useEffect(() => {
    const loaded = sliceQueries.data;
    if (!loaded) return;
    setGroups((prev) => {
      let changed = false;
      const next = prev.map((group) => {
        if (group.useSlice || group.unitPriceTouched || asNumber(group.unitPrice) > 0 || !group.kindId) {
          return group;
        }
        const price = loaded.get(group.kindId)?.[0]?.sellingPerSqm ?? 0;
        if (price <= 0) return group;
        changed = true;
        return { ...group, unitPrice: price };
      });
      return changed ? next : prev;
    });
  }, [sliceQueries.data]);

  useEffect(() => {
    if (!pendingFocus) return;
    const field = document.querySelector<HTMLInputElement>(`[data-focus="${pendingFocus}"]`);
    if (!field) return;
    field.focus();
    setPendingFocus(null);
  }, [pendingFocus, groups]);

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
    mutationFn: async (body: Parameters<typeof api.createOrder>[0]) => {
      let orderNumber = savedOrderNumber.current;
      if (!orderNumber) {
        const order = await api.createOrder(body);
        orderNumber = order.orderNumber;
        savedOrderNumber.current = orderNumber;
      }
      if (paperFiles.length > 0) {
        try {
          await api.uploadOrderPapers(orderNumber, paperFiles);
        } catch {
          throw new Error(t.paperFailed);
        }
      }
    },
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

  const linesSubtotal = groups.reduce((sum, group) => {
    const slice = sliceById.get(group.sliceId);
    return sum + group.sizes.reduce((sizeSum, size) => sizeSum + computeSizePrice(group, size, slice), 0);
  }, 0);
  const edgeRoundingPrice = computeEdgeRoundingTotal(
    edgePricePerM,
    edgeRows.filter((row) => row.kind).map((row) => row.meters),
  );
  const orderTotal = linesSubtotal + edgeRoundingPrice + pausePrice + levierPrice;
  const payableTotal = roundPrice
    ? roundedAmount === ''
      ? null
      : Math.max(0, Math.round(Number(roundedAmount)))
    : orderTotal;

  useEffect(() => {
    if (!roundPrice || roundedTouched) return;
    setRoundedAmount(orderTotal);
  }, [roundPrice, roundedTouched, orderTotal]);

  const warnings = groups.map((group) => {
    if (!group.useSlice) {
      if (group.sizes.some((size) => !sizeBlank(size) && !sizeComplete(size))) return t.needSize;
      if (group.kindId && group.sizes.some(sizeComplete) && asNumber(group.thicknessM) <= 0) {
        return t.needThickness;
      }
      return null;
    }
    if (!group.sliceId) return null;
    const slice = sliceById.get(group.sliceId);
    const size = group.sizes[0];
    if (!slice || !size) return t.notEnoughSlices;
    if (sizeComplete(size) && !cutFits(size, slice)) return t.cutDoesNotFit;
    const needed = slicesNeeded(groups, group.sliceId);
    if (needed > availableSlices(slice)) return t.notEnoughSlices;
    return null;
  });

  const updateGroup = (index: number, patch: Partial<DraftGroup>) => {
    setGroups((prev) =>
      prev.map((group, i) => {
        if (i !== index) return group;
        const next = { ...group, ...patch };
        if (patch.kindId !== undefined && patch.kindId !== group.kindId) {
          next.sliceId = '';
          next.unitPriceTouched = false;
          if (!next.useSlice) {
            const price = slicesByKind.get(String(patch.kindId))?.[0]?.sellingPerSqm ?? 0;
            if (price > 0) next.unitPrice = price;
          }
        }
        if (patch.useSlice === false) {
          next.sliceId = '';
          next.specialPrice = true;
        }
        if (patch.useSlice === true) {
          next.specialPrice = false;
          next.sizes = next.sizes.slice(0, 1);
        }
        return next;
      }),
    );
  };

  const updateSize = (groupIndex: number, sizeIndex: number, patch: Partial<SizeDraft>) => {
    setGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          sizes: group.sizes.map((size, j) => (j === sizeIndex ? { ...size, ...patch } : size)),
        };
      }),
    );
  };

  const addSize = (groupIndex: number, sizeIndex: number, width: number | '') => {
    const size = emptySize();
    setGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        const sizes = group.sizes.map((row, j) => (j === sizeIndex ? { ...row, cutWidthM: width } : row));
        return { ...group, sizes: [...sizes, size] };
      }),
    );
    setPendingFocus(`length-${size.key}`);
  };

  const removeSize = (groupIndex: number, sizeIndex: number) => {
    setGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex || group.sizes.length < 2) return group;
        return { ...group, sizes: group.sizes.filter((_, j) => j !== sizeIndex) };
      }),
    );
  };

  const moveTo = (event: KeyboardEvent<HTMLInputElement>, focusId: string) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    setPendingFocus(focusId);
  };

  const onWidthEnter = (event: KeyboardEvent<HTMLInputElement>, groupIndex: number, sizeIndex: number) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const group = groups[groupIndex];
    if (!group || group.useSlice) return;
    const next = group.sizes[sizeIndex + 1];
    if (next) {
      setPendingFocus(`length-${next.key}`);
      return;
    }
    const size = group.sizes[sizeIndex];
    const width = event.currentTarget.value === '' ? '' : Number(event.currentTarget.value);
    if (!size || asNumber(size.cutLengthM) <= 0 || asNumber(width) <= 0) return;
    addSize(groupIndex, sizeIndex, width);
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
    if (groups.some((group) => !group.kindId)) {
      setSubmitError(t.selectKind);
      return;
    }
    if (groups.some((group) => group.useSlice && !group.sliceId)) {
      setSubmitError(t.selectSlice);
      return;
    }
    if (groups.some((group) => !group.useSlice && asNumber(group.thicknessM) <= 0)) {
      setSubmitError(t.needThickness);
      return;
    }
    const payload: OrderCutLine[] = [];
    for (const group of groups) {
      const sizes = group.sizes.filter((size) => !sizeBlank(size));
      if (sizes.length === 0 || sizes.some((size) => !sizeComplete(size))) {
        setSubmitError(t.needSize);
        return;
      }
      for (const size of sizes) {
        payload.push(
          group.useSlice
            ? {
                sliceId: group.sliceId,
                cutLengthM: asNumber(size.cutLengthM),
                cutWidthM: asNumber(size.cutWidthM),
                qty: size.qty,
                ...(group.specialPrice
                  ? { sellingPerSqm: Math.max(0, Math.round(asNumber(group.unitPrice))) }
                  : {}),
              }
            : {
                kindId: group.kindId,
                cutLengthM: asNumber(size.cutLengthM),
                cutWidthM: asNumber(size.cutWidthM),
                thicknessM: asNumber(group.thicknessM),
                qty: size.qty,
                sellingPerSqm: Math.max(0, Math.round(asNumber(group.unitPrice))),
              },
        );
      }
    }
    if (edgeRows.some((row) => row.meters > 0 && !row.kind)) {
      setSubmitError(t.needEdgeType);
      return;
    }
    if (edgeRows.some((row) => row.kind && !(row.meters > 0))) {
      setSubmitError(t.needEdgeLength);
      return;
    }
    if (roundPrice && roundedAmount === '') {
      setSubmitError(t.needRounded);
      return;
    }
    const finishedEdges = edgeRows.filter((row) => row.kind && row.meters > 0);
    createOrder.mutate({
      customerId,
      lines: payload,
      edgeRoundingPricePerM: edgePricePerM,
      edgeRoundingMeters: finishedEdges.map((row) => row.meters),
      edgeRoundingKinds: finishedEdges.map((row) => row.kind),
      pausePrice,
      levierPrice,
      ...(roundPrice ? { roundedTotal: Math.max(0, Math.round(Number(roundedAmount))) } : {}),
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
              onClick={() => setGroups([...groups, emptyGroup()])}
              className="inline-flex items-center gap-1 rounded-md bg-[#F1EEE8] px-2.5 py-2 text-[10px] font-bold text-[#6E665B] hover:bg-[#E5DED2]"
            >
              <Plus size={13} /> {t.addCut}
            </button>
          </div>
          <div className="space-y-4">
            {groups.map((group, index) => {
              const slices = group.kindId ? slicesByKind.get(group.kindId) ?? [] : [];
              const stockSlices = slices.filter((s) => availableSlices(s) > 0);
              const slice = group.useSlice ? sliceById.get(group.sliceId) : undefined;
              const warn = warnings[index];
              const suggestedPrice = slices[0]?.sellingPerSqm ?? 0;
              const groupTotal = group.sizes.reduce(
                (sum, size) => sum + computeSizePrice(group, size, slice),
                0,
              );
              const firstSize = group.sizes[0];
              return (
                <div key={group.key} className="rounded-lg border border-[#F0EEE9] bg-[#FBFAF8] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="mono digits-latin text-[10px] text-[#9B8C77]">
                      #{formatNumber(index + 1)}
                    </span>
                    {groups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setGroups(groups.filter((_, i) => i !== index))}
                        className="text-[#D95C55]"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-[10px] font-semibold sm:col-span-2">
                      {t.marbleKind}
                      <select
                        value={group.kindId}
                        onChange={(e) => updateGroup(index, { kindId: e.target.value })}
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
                          onClick={() => updateGroup(index, { useSlice: true, specialPrice: false })}
                          className={`rounded px-2 py-2 text-[10px] font-bold ${
                            group.useSlice ? 'bg-white text-[#3A3D3F] shadow-sm' : 'text-[#6E665B]'
                          }`}
                        >
                          {t.useRealSlice}
                        </button>
                        <button
                          type="button"
                          data-testid={`button-without-slice-${index}`}
                          onClick={() =>
                            updateGroup(index, {
                              useSlice: false,
                              sliceId: '',
                              specialPrice: true,
                              unitPrice: asNumber(group.unitPrice) || suggestedPrice || '',
                            })
                          }
                          className={`rounded px-2 py-2 text-[10px] font-bold ${
                            !group.useSlice ? 'bg-white text-[#3A3D3F] shadow-sm' : 'text-[#6E665B]'
                          }`}
                        >
                          {t.withoutSlice}
                        </button>
                      </div>
                    </div>
                    {group.useSlice ? (
                      <label className="text-[10px] font-semibold sm:col-span-2">
                        {t.inventorySlice}
                        <select
                          value={group.sliceId}
                          disabled={!group.kindId}
                          onChange={(e) => {
                            const sliceId = e.target.value;
                            const next = stockSlices.find((s) => s.id === sliceId);
                            updateGroup(index, {
                              sliceId,
                              unitPrice: next?.sellingPerSqm ?? '',
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
                          data-focus={`thickness-${group.key}`}
                          type="number"
                          min={0.001}
                          step="0.001"
                          value={group.thicknessM}
                          onChange={(e) =>
                            updateGroup(index, {
                              thicknessM: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          onKeyDown={(e) => firstSize && moveTo(e, `length-${firstSize.key}`)}
                          className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                        />
                      </label>
                    )}
                    {group.useSlice && group.kindId && !sliceQueries.isFetching && stockSlices.length === 0 && (
                      <p className="sm:col-span-2 text-[10px] text-[#D99A32]">{t.noSlices}</p>
                    )}
                    {!group.useSlice && (
                      <p className="sm:col-span-2 text-[10px] leading-relaxed text-[#8B949A]">{t.enterHint}</p>
                    )}
                    {group.sizes.map((size, sizeIndex) => {
                      const piecePrice = computeSizePrice(group, size, slice);
                      const nextSize = group.sizes[sizeIndex + 1];
                      return (
                        <div key={size.key} className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                          {!group.useSlice && (
                            <div className="flex items-center justify-between sm:col-span-2">
                              <span className="mono digits-latin text-[10px] text-[#9B8C77]">
                                #{formatNumber(sizeIndex + 1)}
                              </span>
                              {group.sizes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSize(index, sizeIndex)}
                                  className="text-[#D95C55]"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          )}
                          <label className="text-[10px] font-semibold">
                            {t.cutLength}
                            <input
                              data-testid={`input-cut-length-${index}-${sizeIndex}`}
                              data-focus={`length-${size.key}`}
                              type="number"
                              min={0.01}
                              step="0.01"
                              value={size.cutLengthM}
                              onChange={(e) =>
                                updateSize(index, sizeIndex, {
                                  cutLengthM: e.target.value === '' ? '' : Number(e.target.value),
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.preventDefault();
                                if (!group.useSlice) moveTo(e, `width-${size.key}`);
                              }}
                              className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                            />
                          </label>
                          <label className="text-[10px] font-semibold">
                            {t.cutWidth}
                            <input
                              data-testid={`input-cut-width-${index}-${sizeIndex}`}
                              data-focus={`width-${size.key}`}
                              type="number"
                              min={0.01}
                              step="0.01"
                              value={size.cutWidthM}
                              onChange={(e) =>
                                updateSize(index, sizeIndex, {
                                  cutWidthM: e.target.value === '' ? '' : Number(e.target.value),
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.preventDefault();
                                if (group.useSlice) return;
                                if (nextSize) moveTo(e, `length-${nextSize.key}`);
                                else onWidthEnter(e, index, sizeIndex);
                              }}
                              className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                            />
                          </label>
                          <div className="flex items-end justify-between gap-2 sm:col-span-2">
                            <span className="text-[10px] font-semibold">{t.qty}</span>
                            <QuantityStepper
                              testId={`input-cut-qty-${index}-${sizeIndex}`}
                              value={size.qty}
                              onChange={(qty) => updateSize(index, sizeIndex, { qty })}
                            />
                          </div>
                          {sizeComplete(size) && (
                            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              <span className="digits-latin text-[10px] text-[#8B949A]">
                                {formatNumber(asNumber(size.cutLengthM), 2)} ×{' '}
                                {formatNumber(asNumber(size.cutWidthM), 2)} × {formatNumber(size.qty)} ×{' '}
                                {formatNumber(unitPriceFor(group, slice))}
                              </span>
                              <b className="mono digits-latin">{formatCurrency(piecePrice, lang)}</b>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {slice && (
                    <p className="mt-3 text-[10px] leading-relaxed text-[#9A6B22]">{t.remainderWasted}</p>
                  )}
                  {!group.useSlice && group.kindId && (
                    <p className="mt-3 text-[10px] leading-relaxed text-[#5F6B76]">{t.noInventory}</p>
                  )}
                  <div className="mt-3 space-y-2 border-t border-[#E7E5E0] pt-3 text-[11px]">
                    {group.useSlice && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[#5F6B76]">{t.autoUnitPrice}</span>
                        <b className="mono digits-latin">
                          {slice ? formatCurrency(slice.sellingPerSqm, lang) : '—'}
                          <span className="ms-1 font-medium text-[#8B949A]">/ m²</span>
                        </b>
                      </div>
                    )}
                    {group.useSlice && (
                      <label className="flex items-center gap-2 text-[10px] font-semibold text-[#3A3D3F]">
                        <input
                          type="checkbox"
                          data-testid={`checkbox-special-price-${index}`}
                          checked={group.specialPrice}
                          disabled={!slice}
                          onChange={(e) =>
                            updateGroup(index, {
                              specialPrice: e.target.checked,
                              unitPrice: slice?.sellingPerSqm ?? group.unitPrice,
                            })
                          }
                        />
                        {t.specialUnitPrice}
                      </label>
                    )}
                    {(group.specialPrice || !group.useSlice) && (
                      <label className="block text-[10px] font-semibold">
                        {t.unitPrice}
                        <input
                          data-testid={`input-unit-price-${index}`}
                          type="number"
                          min={0}
                          step={1}
                          value={group.unitPrice}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault();
                          }}
                          onChange={(e) =>
                            updateGroup(index, {
                              unitPrice: e.target.value === '' ? '' : Number(e.target.value),
                              unitPriceTouched: true,
                            })
                          }
                          className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                        />
                      </label>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[#5F6B76]">{t.lineTotal}</span>
                      <b className="mono digits-latin">{formatCurrency(groupTotal, lang)}</b>
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
          <h3 className="text-xs font-bold">{t.dimensionPaper}</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-[#8B949A]">{t.paperHint}</p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#F1EEE8] px-3 py-2 text-[11px] font-bold text-[#6E665B] hover:bg-[#E5DED2]">
            <input
              data-testid="input-order-paper"
              type="file"
              accept="image/*,application/pdf,.pdf"
              multiple
              className="sr-only"
              onChange={(e) => {
                const incoming = [...(e.target.files ?? [])];
                e.target.value = '';
                if (incoming.some((file) => !isPaperFile(file))) setPaperError(t.paperType);
                else setPaperError('');
                setPaperFiles((prev) => {
                  const next = [...prev];
                  for (const file of incoming) {
                    if (!isPaperFile(file)) continue;
                    if (next.some((existing) => paperKey(existing) === paperKey(file))) continue;
                    next.push(file);
                  }
                  return next.slice(0, 8);
                });
              }}
            />
            {t.choosePaper}
          </label>
          {paperError && <p className="mt-2 text-[10px] text-[#D95C55]">{paperError}</p>}
          {paperPreviews.length > 0 && (
            <div className="mt-3 space-y-2">
              {paperPreviews.map((preview) => (
                <div key={preview.key} className="flex items-center gap-3 rounded-md border border-[#F0EEE9] bg-[#FBFAF8] p-2">
                  {preview.url ? (
                    <img src={preview.url} alt="" className="h-14 w-14 rounded object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded bg-white text-[10px] font-bold text-[#6E665B]">
                      PDF
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[11px]">{preview.file.name}</span>
                  <button
                    type="button"
                    onClick={() => setPaperFiles((files) => files.filter((file) => paperKey(file) !== preview.key))}
                    className="text-[#D95C55]"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              onClick={() => setEdgeRows([...edgeRows, { kind: '', meters: 0 }])}
              className="inline-flex items-center gap-1 rounded-md bg-[#F1EEE8] px-2.5 py-2 text-[10px] font-bold text-[#6E665B] hover:bg-[#E5DED2]"
            >
              <Plus size={13} /> {t.addLength}
            </button>
          </div>
          <p className="mb-3 text-[10px] leading-relaxed text-[#8B949A]">{t.edgeTypeHint}</p>
          <div className="space-y-2">
            {edgeRows.map((row, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <span className="mono digits-latin text-[10px] font-semibold text-[#9B8C77]">
                    #{formatNumber(index + 1)}
                  </span>
                  <div className="mt-1 grid grid-cols-[auto_1fr] gap-2">
                    <div className="grid grid-cols-2 gap-1 rounded-md bg-[#F1EEE8] p-1">
                      {([
                        ['linear', t.edgeLinear],
                        ['45', t.edge45],
                      ] as const).map(([kind, label]) => (
                        <button
                          key={kind}
                          type="button"
                          data-testid={`button-edge-kind-${kind}-${index}`}
                          onClick={() =>
                            setEdgeRows(
                              edgeRows.map((item, i) => (i === index ? { ...item, kind } : item)),
                            )
                          }
                          className={`rounded px-2 py-1.5 text-[10px] font-bold ${
                            row.kind === kind ? 'bg-white text-[#3A3D3F] shadow-sm' : 'text-[#6E665B]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <input
                      data-testid={`input-edge-meters-${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={!row.kind}
                      value={row.meters || ''}
                      onChange={(e) =>
                        setEdgeRows(
                          edgeRows.map((item, i) =>
                            i === index ? { ...item, meters: Number(e.target.value) || 0 } : item,
                          ),
                        )
                      }
                      placeholder={row.kind ? t.lengthMeters : t.edgeType}
                      className="digits-latin h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px] disabled:bg-[#F6F5F2] disabled:text-[#B0B6BB]"
                    />
                  </div>
                </div>
                {edgeRows.length > 1 && (
                  <button
                    type="button"
                    data-testid={`button-remove-edge-length-${index}`}
                    onClick={() => setEdgeRows(edgeRows.filter((_, i) => i !== index))}
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

        <div className="grid gap-3 rounded-lg border border-[#E7E5E0] bg-white p-4 sm:grid-cols-2">
          <label className="block text-[10px] font-semibold">
            la pause
            <input
              data-testid="input-pause-fee"
              type="number"
              min={0}
              step={1}
              value={pausePrice || ''}
              onChange={(e) => setPausePrice(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              placeholder={t.feeAmount}
              className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
            />
          </label>
          <label className="block text-[10px] font-semibold">
            le levier
            <input
              data-testid="input-levier-fee"
              type="number"
              min={0}
              step={1}
              value={levierPrice || ''}
              onChange={(e) => setLevierPrice(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              placeholder={t.feeAmount}
              className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
            />
          </label>
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
          <div className="flex justify-between text-[#5F6B76]">
            <span>la pause</span>
            <b className="mono digits-latin">{formatCurrency(pausePrice, lang)}</b>
          </div>
          <div className="flex justify-between text-[#5F6B76]">
            <span>le levier</span>
            <b className="mono digits-latin">{formatCurrency(levierPrice, lang)}</b>
          </div>
          <div className="border-t border-[#E7E5E0] pt-3">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-[#F1EEE8] p-1">
              <button
                type="button"
                data-testid="button-keep-price"
                onClick={() => {
                  setRoundPrice(false);
                  setRoundedTouched(false);
                  setRoundedAmount('');
                }}
                className={`rounded px-2 py-2 text-[10px] font-bold ${
                  !roundPrice ? 'bg-white text-[#3A3D3F] shadow-sm' : 'text-[#6E665B]'
                }`}
              >
                {t.keepPrice}
              </button>
              <button
                type="button"
                data-testid="button-round-price"
                onClick={() => setRoundPrice(true)}
                className={`rounded px-2 py-2 text-[10px] font-bold ${
                  roundPrice ? 'bg-white text-[#3A3D3F] shadow-sm' : 'text-[#6E665B]'
                }`}
              >
                {t.roundPrice}
              </button>
            </div>
            {roundPrice && (
              <label className="mt-3 block text-[10px] font-semibold">
                {t.roundAmount}
                <input
                  data-testid="input-rounded-total"
                  type="number"
                  min={0}
                  step={1}
                  value={roundedAmount}
                  onChange={(e) => {
                    setRoundedTouched(true);
                    setRoundedAmount(e.target.value === '' ? '' : Number(e.target.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                  className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                />
              </label>
            )}
          </div>
          <div className="flex justify-between border-t border-[#E7E5E0] pt-2 text-sm font-bold">
            <span>{t.orderTotal}</span>
            <b data-testid="text-order-total" className="mono digits-latin">
              {payableTotal === null ? '—' : formatCurrency(payableTotal, lang)}
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
