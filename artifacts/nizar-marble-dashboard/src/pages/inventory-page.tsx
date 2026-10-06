import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Scissors,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { EditableSliceRow } from '@/components/editable-slice-row';
import { PageLoading } from '@/components/page-loading';
import { resolveMarbleImageUrl, uploadMarbleImage } from '@/lib/marble-image';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'wouter';
import {
  api,
  type MarbleKind,
  type MarbleKindQuery,
  type MarbleSlice,
  type SliceWasteRect,
} from '@/lib/api';
import {
  formatAreaSqm,
  formatCurrency,
  formatNumber,
} from '@/lib/format';

type Lang = 'ar' | 'fr';

const labels = {
  ar: {
    catalogue: 'كتالوج الرخام',
    catalogueCount: 'أصناف مسجلة',
    addKind: 'إضافة نوع رخام',
    addSlice: 'إضافة شريحة',
    editKind: 'تعديل نوع الرخام',
    supplier: 'المورد',
    newSupplier: 'مورد جديد',
    supplierName: 'اسم المورد',
    phone: 'الهاتف',
    address: 'العنوان',
    saveSupplier: 'حفظ المورد',
    marbleType: 'نوع الرخام',
    color: 'اللون',
    visible: 'ظاهر',
    hidden: 'مخفي',
    purchaseTotal: 'إجمالي الشراء',
    sellingTotal: 'إجمالي البيع',
    slices: 'شرائح',
    length: 'الطول (م)',
    width: 'العرض (م)',
    thickness: 'السماكة (م)',
    sliceQty: 'عدد الشرائح',
    waste: 'الهدر',
    wasteTitle: 'تحديد منطقة الهدر',
    wasteHint: 'أبعاد الجزء غير القابل للبيع (يُخصم من مساحة الشريحة)',
    wasteLength: 'طول الهدر (م)',
    wasteWidth: 'عرض الهدر (م)',
    addWasteRect: 'إضافة منطقة',
    wasteArea: 'مساحة الهدر',
    netArea: 'المساحة الصافية',
    purchasePerSqm: 'سعر الشراء / م²',
    sellingPerSqm: 'سعر البيع / m²',
    cancel: 'إلغاء',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    cancelEdit: 'إلغاء',
    filter: 'تصفية',
    all: 'الكل',
    newest: 'الأحدث',
    oldest: 'الأقدم',
    byName: 'بالاسم',
    bySupplier: 'المورد',
    minPrice: 'أدنى سعر شراء',
    maxPrice: 'أقصى سعر شراء',
    apply: 'تطبيق',
    back: 'رجوع للكتالوج',
    dimensions: 'الأبعاد (م)',
    count: 'العدد',
    area: 'المساحة',
    image: 'صورة',
    chooseImage: 'اختر صورة',
    imageReady: 'تم اختيار الصورة',
    successKind: 'تم حفظ نوع الرخام',
    successSlice: 'تمت إضافة الشريحة',
    confirmDelete: 'حذف هذا النوع وجميع شرائحه؟',
  },
  fr: {
    catalogue: 'Catalogue marbre',
    catalogueCount: 'types enregistrés',
    addKind: 'Ajouter un type',
    addSlice: 'Ajouter une dalle',
    editKind: 'Modifier le type',
    supplier: 'Fournisseur',
    newSupplier: 'Nouveau fournisseur',
    supplierName: 'Nom du fournisseur',
    phone: 'Téléphone',
    address: 'Adresse',
    saveSupplier: 'Enregistrer',
    marbleType: 'Type de marbre',
    color: 'Couleur',
    visible: 'Visible',
    hidden: 'Masqué',
    purchaseTotal: 'Total achat',
    sellingTotal: 'Total vente',
    slices: 'Dalles',
    length: 'Longueur (m)',
    width: 'Largeur (m)',
    thickness: 'Épaisseur (m)',
    sliceQty: 'Nombre de dalles',
    waste: 'Perte',
    wasteTitle: 'Zone de perte',
    wasteHint: 'Partie non vendable (déduite de la surface de la dalle)',
    wasteLength: 'Longueur perte (m)',
    wasteWidth: 'Largeur perte (m)',
    addWasteRect: 'Ajouter une zone',
    wasteArea: 'Surface perte',
    netArea: 'Surface nette',
    purchasePerSqm: 'Prix achat / m²',
    sellingPerSqm: 'Prix vente / m²',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    cancelEdit: 'Annuler',
    filter: 'Filtrer',
    all: 'Tous',
    newest: 'Plus récent',
    oldest: 'Plus ancien',
    byName: 'Par nom',
    bySupplier: 'Fournisseur',
    minPrice: 'Prix min',
    maxPrice: 'Prix max',
    apply: 'Appliquer',
    back: 'Retour au catalogue',
    dimensions: 'Dimensions (m)',
    count: 'Quantité',
    area: 'Surface',
    image: 'Image',
    chooseImage: 'Choisir une image',
    imageReady: 'Image sélectionnée',
    successKind: 'Type enregistré',
    successSlice: 'Dalle ajoutée',
    confirmDelete: 'Supprimer ce type et toutes ses dalles ?',
  },
};

function Btn({
  children,
  onClick,
  variant = 'dark',
  type = 'button',
  testId,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'dark' | 'outline' | 'danger';
  type?: 'button' | 'submit';
  testId: string;
}) {
  const styles =
    variant === 'dark'
      ? 'bg-[#3A3D3F] text-[#F8F8F6] hover:bg-[#17212B]'
      : variant === 'danger'
        ? 'bg-[#FBEDEC] text-[#D95C55] hover:bg-[#f5e0de]'
        : 'border border-[#E7E5E0] bg-white text-[#3A3D3F] hover:border-[#CFC3AE]';
  return (
    <button
      type={type}
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[8px] px-3.5 py-2.5 text-xs font-semibold transition ${styles}`}
    >
      {children}
    </button>
  );
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
  const node = (
    <div
      className={`fixed inset-0 ${z} flex items-end justify-center bg-[#17212B]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className={`fade-up max-h-[90vh] w-full overflow-y-auto rounded-t-[16px] bg-[#F8F8F6] p-5 shadow-2xl sm:rounded-[13px] md:p-6 ${wide ? 'max-w-[680px]' : 'max-w-[500px]'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            data-testid="button-close-modal"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#8B949A] hover:bg-[#E7E5E0]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
  return createPortal(node, document.body);
}

function formatDimM(value: number) {
  return formatNumber(value, value >= 1 ? 2 : 3);
}

function QuantityStepper({
  value,
  onChange,
  min = 1,
  testId,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  testId: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[#E7E5E0] bg-white p-0.5">
      <button
        type="button"
        data-testid={`${testId}-minus`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[#5F6B76] hover:bg-[#F1EEE8] disabled:opacity-40"
      >
        <Minus size={14} />
      </button>
      <span
        data-testid={testId}
        className="digits-latin mono min-w-[2rem] text-center text-xs font-bold text-[#3A3D3F]"
      >
        {formatNumber(value)}
      </span>
      <button
        type="button"
        data-testid={`${testId}-plus`}
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[#5F6B76] hover:bg-[#F1EEE8]"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  placeholder,
  min,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  min?: number;
  step?: string;
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <input
        data-testid={`input-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="digits-latin mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs font-normal outline-none focus:border-[#CFC3AE]"
      />
    </label>
  );
}

function SupplierSelect({
  lang,
  value,
  onChange,
  onNew,
}: {
  lang: Lang;
  value: string;
  onChange: (id: string) => void;
  onNew: () => void;
}) {
  const t = labels[lang];
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: api.getSuppliers,
  });
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold">
        {t.supplier}
        <select
          data-testid="select-supplier"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs outline-none focus:border-[#CFC3AE]"
        >
          <option value="">—</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <Btn testId="button-new-supplier" variant="outline" onClick={onNew}>
        <Plus size={13} /> {t.newSupplier}
      </Btn>
    </div>
  );
}

export function InventoryList({ lang }: { lang: Lang }) {
  const t = labels[lang];
  const qc = useQueryClient();
  const [filters, setFilters] = useState<MarbleKindQuery>({
    visible: 'all',
    sort: 'newest',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [kindModal, setKindModal] = useState<'create' | MarbleKind | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [notice, setNotice] = useState('');

  const { data: kinds = [], isLoading, error } = useQuery({
    queryKey: ['marble-kinds', filters],
    queryFn: () => api.getMarbleKinds(filters),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: api.getSuppliers,
  });

  const saveKind = useMutation({
    mutationFn: async (payload: {
      id?: string;
      name: string;
      color: string;
      imageUrl: string;
      visible: boolean;
    }) =>
      payload.id
        ? api.updateMarbleKind(payload.id, {
            name: payload.name,
            color: payload.color,
            imageUrl: payload.imageUrl,
            visible: payload.visible,
          })
        : api.createMarbleKind({
            name: payload.name,
            color: payload.color,
            imageUrl: payload.imageUrl,
            visible: payload.visible,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marble-kinds'] });
      setKindModal(null);
      setImagePreview('');
      setNotice(t.successKind);
      setTimeout(() => setNotice(''), 2800);
    },
  });

  const deleteKind = useMutation({
    mutationFn: api.deleteMarbleKind,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marble-kinds'] }),
  });

  const onSubmitKind = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const editing = kindModal !== 'create' && kindModal ? kindModal : null;
    let imageUrl = editing?.imageUrl || '';
    if (imageFile) {
      imageUrl = await uploadMarbleImage(imageFile);
    } else if (
      imagePreview &&
      !imagePreview.startsWith('blob:') &&
      imagePreview.startsWith('http')
    ) {
      imageUrl = imagePreview;
    }
    saveKind.mutate({
      id: editing?.id,
      name: String(fd.get('name')),
      color: String(fd.get('color')),
      imageUrl,
      visible: fd.get('visible') === 'true',
    });
  };

  if (error) {
    return (
      <div className="py-16 text-center text-sm text-[#D95C55]">
        {error.message}
      </div>
    );
  }

  return (
    <>
      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#BCE3C9] bg-[#EAF6EF] px-4 py-3 text-xs font-semibold text-[#2E9B68]">
          <CheckCircle2 size={16} />
          {notice}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#5F6B76]">
          {kinds.length} {t.catalogueCount}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="button-inventory-filter"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E7E5E0] px-3 py-2 text-[11px] text-[#5F6B76]"
          >
            <SlidersHorizontal size={14} /> {t.filter}
          </button>
          <Btn testId="button-add-kind" onClick={() => setKindModal('create')}>
            <Plus size={14} /> {t.addKind}
          </Btn>
        </div>
      </div>
      {showFilters && (
        <div className="mb-4 grid gap-3 rounded-lg border border-[#E7E5E0] bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-[10px] font-semibold">
            {t.visible}
            <select
              value={filters.visible ?? 'all'}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  visible: e.target.value as MarbleKindQuery['visible'],
                }))
              }
              className="mt-1 h-9 w-full rounded-md border border-[#E7E5E0] px-2 text-xs"
            >
              <option value="all">{t.all}</option>
              <option value="true">{t.visible}</option>
              <option value="false">{t.hidden}</option>
            </select>
          </label>
          <label className="text-[10px] font-semibold">
            {t.filter}
            <select
              value={filters.sort ?? 'newest'}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  sort: e.target.value as MarbleKindQuery['sort'],
                }))
              }
              className="mt-1 h-9 w-full rounded-md border border-[#E7E5E0] px-2 text-xs"
            >
              <option value="newest">{t.newest}</option>
              <option value="oldest">{t.oldest}</option>
              <option value="name">{t.byName}</option>
            </select>
          </label>
          <label className="text-[10px] font-semibold">
            {t.bySupplier}
            <select
              value={filters.supplierId ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  supplierId: e.target.value || undefined,
                }))
              }
              className="mt-1 h-9 w-full rounded-md border border-[#E7E5E0] px-2 text-xs"
            >
              <option value="">{t.all}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[10px] font-semibold">
            {t.minPrice}
            <input
              data-testid="input-minPriceFilter"
              name="minPriceFilter"
              type="number"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              placeholder="0"
              className="mt-1 h-9 w-full rounded-md border border-[#E7E5E0] px-2 text-xs"
            />
          </label>
          <label className="text-[10px] font-semibold">
            {t.maxPrice}
            <input
              data-testid="input-maxPriceFilter"
              name="maxPriceFilter"
              type="number"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              placeholder="0"
              className="mt-1 h-9 w-full rounded-md border border-[#E7E5E0] px-2 text-xs"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-5">
            <Btn
              testId="button-apply-filters"
              onClick={() => {
                setFilters((f) => ({
                  ...f,
                  minPrice: minPriceInput ? Number(minPriceInput) : undefined,
                  maxPrice: maxPriceInput ? Number(maxPriceInput) : undefined,
                }));
              }}
            >
              {t.apply}
            </Btn>
          </div>
        </div>
      )}
      {isLoading ? (
        <PageLoading label={lang === 'ar' ? 'جاري التحميل...' : 'Chargement…'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kinds.map((kind) => (
            <div
              key={kind.id}
              data-testid={`card-kind-${kind.id}`}
              className="group overflow-hidden rounded-[10px] border border-[#E7E5E0] bg-white transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Link href={`/inventory/${kind.id}`}>
                <div
                  className={`marble-surface ${kind.tone === 'dark' ? 'dark' : ''} relative h-36 cursor-pointer`}
                >
                  {resolveMarbleImageUrl(kind.imageUrl) && (
                    <img
                      src={resolveMarbleImageUrl(kind.imageUrl)}
                      alt={kind.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute start-3 top-3 rounded-md bg-white/80 px-2 py-1 text-[10px] font-bold backdrop-blur">
                    {kind.visible ? t.visible : t.hidden}
                  </div>
                </div>
              </Link>
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/inventory/${kind.id}`}
                      className="text-sm font-bold hover:text-[#9B8C77]"
                    >
                      {kind.name}
                    </Link>
                    <p className="mt-1 text-[10px] text-[#5F6B76]">
                      {kind.color}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      data-testid={`button-edit-kind-${kind.id}`}
                      onClick={() => {
                        setImagePreview(
                          resolveMarbleImageUrl(kind.imageUrl) || kind.imageUrl,
                        );
                        setImageFile(null);
                        setKindModal(kind);
                      }}
                      className="rounded p-1.5 text-[#8B949A] hover:bg-[#F1EEE8]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      data-testid={`button-delete-kind-${kind.id}`}
                      onClick={() => {
                        if (window.confirm(t.confirmDelete)) {
                          deleteKind.mutate(kind.id);
                        }
                      }}
                      className="rounded p-1.5 text-[#8B949A] hover:bg-[#FBEDEC] hover:text-[#D95C55]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-2 border-t border-[#F0EEE9] pt-3 text-[10px]">
                  <span className="text-[#8B949A]">
                    {t.slices}{' '}
                    <b className="font-semibold text-[#3A3D3F]">
                      {kind.sliceCount}
                    </b>
                  </span>
                  <span className="text-end text-[#8B949A]">
                    {t.area}{' '}
                    <b className="font-semibold text-[#3A3D3F]">
                      {formatAreaSqm(kind.totalAreaSqm)}
                    </b>
                  </span>
                  <span className="text-[#8B949A]">
                    {t.purchaseTotal}{' '}
                    <b className="font-semibold text-[#3A3D3F]">
                      {formatCurrency(kind.totalPurchaseValue, lang)}
                    </b>
                  </span>
                  <span className="text-end text-[#8B949A]">
                    {t.sellingTotal}{' '}
                    <b className="font-semibold text-[#3A3D3F]">
                      {formatCurrency(kind.totalSellingValue, lang)}
                    </b>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {kindModal && (
        <Modal
          title={kindModal === 'create' ? t.addKind : t.editKind}
          onClose={() => {
            setKindModal(null);
            setImagePreview('');
            setImageFile(null);
          }}
        >
          <form onSubmit={onSubmitKind} className="space-y-4">
            <Field
              label={t.marbleType}
              name="name"
              required
              defaultValue={
                kindModal !== 'create' ? kindModal.name : undefined
              }
            />
            <Field
              label={t.color}
              name="color"
              defaultValue={
                kindModal !== 'create' ? kindModal.color : undefined
              }
            />
            <label className="block text-xs font-semibold">
              {t.image}
              <div className="mt-1.5 rounded-lg border border-dashed border-[#CFC3AE] bg-[#FBFAF8] p-3">
                <input
                  data-testid="input-kind-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="block w-full text-xs"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt=""
                    className="mt-2 h-14 w-14 rounded-md object-cover"
                  />
                )}
              </div>
            </label>
            <label className="block text-xs font-semibold">
              {t.visible}
              <select
                name="visible"
                defaultValue={
                  kindModal !== 'create'
                    ? String(kindModal.visible)
                    : 'true'
                }
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs"
              >
                <option value="true">{t.visible}</option>
                <option value="false">{t.hidden}</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Btn
                testId="button-cancel-kind"
                variant="outline"
                onClick={() => setKindModal(null)}
              >
                {t.cancel}
              </Btn>
              <Btn testId="button-save-kind" type="submit">
                {saveKind.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t.save
                )}
              </Btn>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function InventoryKindDetail({ lang }: { lang: Lang }) {
  const t = labels[lang];
  const qc = useQueryClient();
  const { kindId = '' } = useParams<{ kindId: string }>();
  const [sliceModal, setSliceModal] = useState(false);
  const [supplierModal, setSupplierModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [sliceCount, setSliceCount] = useState(1);
  const [wasteModalSlice, setWasteModalSlice] = useState<MarbleSlice | null>(
    null,
  );
  const [wasteDraft, setWasteDraft] = useState<SliceWasteRect[]>([]);
  const [notice, setNotice] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['marble-kind', kindId],
    queryFn: () => api.getMarbleKind(kindId),
    enabled: Boolean(kindId),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: api.getSuppliers,
  });

  const addSlice = useMutation({
    mutationFn: (body: Parameters<typeof api.addMarbleSlice>[1]) =>
      api.addMarbleSlice(kindId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marble-kind', kindId] });
      qc.invalidateQueries({ queryKey: ['marble-kinds'] });
      setSliceModal(false);
      setNotice(t.successSlice);
      setTimeout(() => setNotice(''), 2800);
    },
  });

  const createSupplier = useMutation({
    mutationFn: api.createSupplier,
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setSupplierId(s.id);
      setSupplierModal(false);
    },
  });

  const updateWastes = useMutation({
    mutationFn: ({
      sliceId,
      wastes,
    }: {
      sliceId: string;
      wastes: SliceWasteRect[];
    }) => api.updateMarbleSlice(sliceId, { wastes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marble-kind', kindId] });
      qc.invalidateQueries({ queryKey: ['marble-kinds'] });
      setWasteModalSlice(null);
    },
  });

  if (isLoading) {
    return (
      <PageLoading label={lang === 'ar' ? 'جاري التحميل...' : 'Chargement…'} />
    );
  }
  if (error || !data) {
    return (
      <div className="py-16 text-center text-sm text-[#D95C55]">
        {error?.message ?? '—'}
      </div>
    );
  }

  const { kind, slices } = data;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/inventory"
          className="text-[11px] font-semibold text-[#9B8C77] hover:text-[#3A3D3F]"
        >
          ← {t.back}
        </Link>
        <Btn
          testId="button-add-slice"
          onClick={() => {
            setSliceCount(1);
            setSliceModal(true);
          }}
        >
          <Plus size={14} /> {t.addSlice}
        </Btn>
      </div>
      <div className="mb-5 rounded-[11px] border border-[#E7E5E0] bg-white p-5">
        <h1 className="text-lg font-bold">{kind.name}</h1>
        <p className="mt-1 text-xs text-[#5F6B76]">{kind.color}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-[11px]">
          <span>
            {t.purchaseTotal}:{' '}
            <b>{formatCurrency(kind.totalPurchaseValue, lang)}</b>
          </span>
          <span>
            {t.sellingTotal}:{' '}
            <b>{formatCurrency(kind.totalSellingValue, lang)}</b>
          </span>
          <span>
            {t.area}: <b>{formatAreaSqm(kind.totalAreaSqm)}</b>
          </span>
        </div>
      </div>
      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#BCE3C9] bg-[#EAF6EF] px-4 py-3 text-xs font-semibold text-[#2E9B68]">
          <CheckCircle2 size={16} />
          {notice}
        </div>
      )}
      <div className="soft-shadow overflow-hidden rounded-[11px] border border-[#E7E5E0] bg-white">
        <table className="w-full min-w-[800px] text-xs">
          <thead className="bg-[#FBFAF8] text-[10px] text-[#8B949A]">
            <tr>
              <th className="px-4 py-3 text-start">{t.supplier}</th>
              <th className="px-4 py-3 text-start">{t.dimensions}</th>
              <th className="px-4 py-3 text-start">{t.count}</th>
              <th className="px-4 py-3 text-start">{t.wasteArea}</th>
              <th className="px-4 py-3 text-start">{t.netArea}</th>
              <th className="px-4 py-3 text-end">{t.purchasePerSqm}</th>
              <th className="px-4 py-3 text-end">{t.purchaseTotal}</th>
              <th className="px-4 py-3 text-end">{t.sellingPerSqm}</th>
              <th className="px-4 py-3 text-end">{t.sellingTotal}</th>
              <th className="px-4 py-3 text-end">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <EditableSliceRow
                key={slice.id}
                slice={slice}
                kindId={kindId}
                lang={lang}
                suppliers={suppliers}
                labels={{
                  supplier: t.supplier,
                  dimensions: t.dimensions,
                  count: t.count,
                  wasteArea: t.wasteArea,
                  netArea: t.netArea,
                  purchasePerSqm: t.purchasePerSqm,
                  purchaseTotal: t.purchaseTotal,
                  sellingPerSqm: t.sellingPerSqm,
                  sellingTotal: t.sellingTotal,
                  waste: t.waste,
                  edit: t.edit,
                  save: t.save,
                  cancel: t.cancelEdit,
                  delete: t.delete,
                }}
                onEditWaste={(s) => {
                  setWasteDraft(
                    s.wastes.length
                      ? s.wastes.map((w) => ({ ...w }))
                      : [{ lengthM: 0.2, widthM: 0.2 }],
                  );
                  setWasteModalSlice(s);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      {sliceModal && (
        <Modal title={t.addSlice} onClose={() => setSliceModal(false)} wide>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              if (!supplierId) return;
              addSlice.mutate({
                supplierId,
                lengthM: Number(fd.get('lengthM')),
                widthM: Number(fd.get('widthM')),
                thicknessM: Number(fd.get('thicknessM')),
                sliceCount,
                purchasePerSqm: Number(fd.get('purchasePerSqm')),
                sellingPerSqm: Number(fd.get('sellingPerSqm')),
              });
            }}
            className="space-y-4"
          >
            <SupplierSelect
              lang={lang}
              value={supplierId}
              onChange={setSupplierId}
              onNew={() => setSupplierModal(true)}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t.length} name="lengthM" type="number" min={0.01} step="0.01" required />
              <Field label={t.width} name="widthM" type="number" min={0.01} step="0.01" required />
              <Field label={t.thickness} name="thicknessM" type="number" min={0.001} step="0.001" required />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold">{t.sliceQty}</span>
              <QuantityStepper
                testId="input-slice-count"
                value={sliceCount}
                onChange={setSliceCount}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.purchasePerSqm} name="purchasePerSqm" type="number" min={0} required />
              <Field label={t.sellingPerSqm} name="sellingPerSqm" type="number" min={0} required />
            </div>
            <p className="text-[10px] text-[#8B949A]">
              {lang === 'ar'
                ? 'إذا تطابقت الأبعاد والمورد والأسعار مع شريحة موجودة، يُضاف العدد إلى نفس الصف.'
                : 'Si les dimensions, le fournisseur et les prix correspondent, la quantité est fusionnée.'}
            </p>
            <div className="flex justify-end gap-2">
              <Btn testId="button-cancel-slice" variant="outline" onClick={() => setSliceModal(false)}>
                {t.cancel}
              </Btn>
              <Btn testId="button-save-slice" type="submit">
                {t.save}
              </Btn>
            </div>
          </form>
        </Modal>
      )}
      {supplierModal && (
        <Modal
          title={t.newSupplier}
          onClose={() => setSupplierModal(false)}
          layer="stack"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createSupplier.mutate({
                name: String(fd.get('name')),
                phone: String(fd.get('phone')),
                address: String(fd.get('address')),
              });
            }}
            className="space-y-4"
          >
            <Field label={t.supplierName} name="name" required />
            <Field label={t.phone} name="phone" required />
            <Field label={t.address} name="address" required />
            <div className="flex justify-end gap-2">
              <Btn testId="button-cancel-supplier" variant="outline" onClick={() => setSupplierModal(false)}>
                {t.cancel}
              </Btn>
              <Btn testId="button-save-supplier" type="submit">
                {t.saveSupplier}
              </Btn>
            </div>
          </form>
        </Modal>
      )}
      {wasteModalSlice && (
        <Modal
          title={t.wasteTitle}
          onClose={() => setWasteModalSlice(null)}
          wide
          layer="stack"
        >
          <p className="mb-4 text-[10px] text-[#8B949A]">{t.wasteHint}</p>
          <div className="space-y-3">
            {wasteDraft.map((w, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-lg border border-[#E7E5E0] bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <label className="text-[10px] font-semibold">
                  {t.wasteLength}
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={w.lengthM || ''}
                    onChange={(e) => {
                      const next = [...wasteDraft];
                      next[i] = {
                        ...next[i],
                        lengthM: Number(e.target.value),
                      };
                      setWasteDraft(next);
                    }}
                    className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] px-2 text-xs"
                  />
                </label>
                <label className="text-[10px] font-semibold">
                  {t.wasteWidth}
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={w.widthM || ''}
                    onChange={(e) => {
                      const next = [...wasteDraft];
                      next[i] = {
                        ...next[i],
                        widthM: Number(e.target.value),
                      };
                      setWasteDraft(next);
                    }}
                    className="digits-latin mt-1 h-9 w-full rounded-md border border-[#E7E5E0] px-2 text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setWasteDraft(wasteDraft.filter((_, j) => j !== i))
                  }
                  className="self-end rounded p-2 text-[#D95C55] hover:bg-[#FBEDEC]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setWasteDraft([...wasteDraft, { lengthM: 0.1, widthM: 0.1 }])
            }
            className="mt-3 text-[11px] font-semibold text-[#9B8C77]"
          >
            + {t.addWasteRect}
          </button>
          <div className="mt-5 flex justify-end gap-2">
            <Btn
              testId="button-cancel-waste"
              variant="outline"
              onClick={() => setWasteModalSlice(null)}
            >
              {t.cancel}
            </Btn>
            <Btn
              testId="button-save-waste"
              onClick={() => {
                const cleaned = wasteDraft.filter(
                  (w) => w.lengthM > 0 && w.widthM > 0,
                );
                updateWastes.mutate({
                  sliceId: wasteModalSlice.id,
                  wastes: cleaned,
                });
              }}
            >
              {t.save}
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
