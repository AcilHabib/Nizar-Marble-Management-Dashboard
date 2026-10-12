import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Banknote,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Lock,
  Pencil,
  Plus,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { PageLoading } from '@/components/page-loading';
import {
  api,
  setFinanceCode,
  type FinanceCharge,
} from '@/lib/api';
import { formatAreaSqm, formatCurrency, formatNumber } from '@/lib/format';
import { statusLabelFr, statusStyle } from '@/lib/order-status';

type Lang = 'ar' | 'fr';
type DateMode = 'all' | 'day' | 'period';
type Tab = 'sales' | 'purchases' | 'charges' | 'salaries';

const FINANCE_CODE_KEY = 'nizar-finance-code';
const PRESETS = ['lunch', 'transport', 'supplies', 'utilities', 'maintenance', 'rent', 'other'] as const;

const labels = {
  ar: {
    eyebrow: 'التقارير المالية',
    title: 'المالية',
    description: 'المبيعات، مشتريات الرخام، المصاريف، ورواتب الفريق.',
    lockTitle: 'أدخل الرمز',
    lockText: 'صفحة المالية محمية. أدخل الرمز للمتابعة.',
    code: 'الرمز',
    enter: 'دخول',
    wrongCode: 'الرمز غير صحيح',
    lockPage: 'قفل الصفحة',
    sales: 'المبيعات',
    collected: 'المحصّل',
    purchases: 'المشتريات',
    charges: 'المصاريف',
    salaries: 'الرواتب',
    result: 'الناتج',
    resultHint: 'المبيعات − المشتريات − المصاريف − الرواتب',
    cancelledNote: 'الطلبات الملغاة ظاهرة في الجدول ولا تُحسب ضمن المبيعات.',
    allDates: 'كل التواريخ',
    oneDay: 'يوم واحد',
    period: 'فترة',
    from: 'من',
    to: 'إلى',
    category: 'التصنيف',
    allCategories: 'كل التصنيفات',
    addCharge: 'إضافة مصروف',
    editCharge: 'تعديل المصروف',
    chargeTitle: 'ما هو المصروف',
    chargeTitlePh: 'مثال: غداء الفريق',
    amount: 'المبلغ (د.ج)',
    date: 'التاريخ',
    note: 'ملاحظة',
    customCategory: 'تصنيف آخر',
    customPh: 'اكتب التصنيف',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    confirmDeleteCharge: 'حذف هذا المصروف؟',
    empty: 'لا يوجد شيء في هذه الفترة',
    order: 'الطلب',
    customer: 'العميل',
    marble: 'الرخام',
    status: 'الحالة',
    total: 'الإجمالي',
    paid: 'المدفوع',
    remaining: 'المتبقي',
    supplier: 'المورد',
    dimensions: 'الأبعاد',
    slices: 'العدد',
    area: 'المساحة',
    recordedBy: 'سجّله',
    actions: 'إجراء',
    month: 'الشهر',
    salaryHint: 'اختر الشهر، ثم أدخل راتب كل موظف. الموظفون يُضافون من الإعدادات.',
    noStaff: 'لا يوجد موظفون بعد.',
    addStaff: 'إضافة الموظفين من الإعدادات',
    staff: 'الموظف',
    role: 'الدور',
    salary: 'الراتب',
    paidSalary: 'تم الدفع',
    dueSalary: 'لم يُدفع',
    saveSalary: 'حفظ الراتب',
    clearSalary: 'مسح',
    confirmClearSalary: 'مسح راتب هذا الشهر؟',
    lunch: 'غداء',
    transport: 'نقل',
    supplies: 'مستلزمات',
    utilities: 'فواتير',
    maintenance: 'صيانة',
    rent: 'إيجار',
    other: 'أخرى',
  },
  fr: {
    eyebrow: 'Rapports financiers',
    title: 'Finance',
    description: 'Ventes, achats de marbre, charges et salaires.',
    lockTitle: 'Entrer le code',
    lockText: 'La page Finance est protégée. Entrez le code pour continuer.',
    code: 'Code',
    enter: 'Entrer',
    wrongCode: 'Code incorrect',
    lockPage: 'Verrouiller',
    sales: 'Ventes',
    collected: 'Encaissé',
    purchases: 'Achats',
    charges: 'Charges',
    salaries: 'Salaires',
    result: 'Résultat',
    resultHint: 'Ventes − achats − charges − salaires',
    cancelledNote: 'Les commandes annulées restent visibles et ne comptent pas dans les ventes.',
    allDates: 'Toutes les dates',
    oneDay: 'Un jour',
    period: 'Période',
    from: 'Du',
    to: 'Au',
    category: 'Catégorie',
    allCategories: 'Toutes les catégories',
    addCharge: 'Ajouter une charge',
    editCharge: 'Modifier la charge',
    chargeTitle: 'Quelle charge',
    chargeTitlePh: 'Exemple : déjeuner de l’équipe',
    amount: 'Montant (DA)',
    date: 'Date',
    note: 'Note',
    customCategory: 'Autre catégorie',
    customPh: 'Écrire la catégorie',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    confirmDeleteCharge: 'Supprimer cette charge ?',
    empty: 'Rien sur cette période',
    order: 'Commande',
    customer: 'Client',
    marble: 'Marbre',
    status: 'Statut',
    total: 'Total',
    paid: 'Payé',
    remaining: 'Restant',
    supplier: 'Fournisseur',
    dimensions: 'Dimensions',
    slices: 'Nombre',
    area: 'Surface',
    recordedBy: 'Saisi par',
    actions: 'Action',
    month: 'Mois',
    salaryHint: 'Choisissez le mois, puis saisissez le salaire de chaque personne. Le personnel s’ajoute dans Paramètres.',
    noStaff: 'Aucun membre pour le moment.',
    addStaff: 'Ajouter le personnel dans Paramètres',
    staff: 'Personnel',
    role: 'Rôle',
    salary: 'Salaire',
    paidSalary: 'Payé',
    dueSalary: 'Non payé',
    saveSalary: 'Enregistrer',
    clearSalary: 'Effacer',
    confirmClearSalary: 'Effacer le salaire de ce mois ?',
    lunch: 'Déjeuner',
    transport: 'Transport',
    supplies: 'Fournitures',
    utilities: 'Factures',
    maintenance: 'Entretien',
    rent: 'Loyer',
    other: 'Autre',
  },
} as const;

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function thisMonth() {
  return todayKey().slice(0, 7);
}

function dayKey(value: string | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function showDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function inRange(iso: string, mode: DateMode, day: string, from: string, to: string) {
  const key = dayKey(iso);
  if (!key) return false;
  if (mode === 'all') return true;
  if (mode === 'day') return key === day;
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  return key >= start && key <= end;
}

function monthOverlaps(month: string, mode: DateMode, day: string, from: string, to: string) {
  if (mode === 'all') return true;
  const [year, mon] = month.split('-').map(Number);
  if (!year || !mon) return false;
  const startKey = `${month}-01`;
  const last = new Date(year, mon, 0).getDate();
  const endKey = `${month}-${String(last).padStart(2, '0')}`;
  if (mode === 'day') return day >= startKey && day <= endKey;
  const a = from <= to ? from : to;
  const b = from <= to ? to : from;
  return a <= endKey && b >= startKey;
}

type Copy = (typeof labels)[Lang];

function categoryLabel(category: string, t: Copy) {
  const names: Record<string, string> = {
    lunch: t.lunch,
    transport: t.transport,
    supplies: t.supplies,
    utilities: t.utilities,
    maintenance: t.maintenance,
    rent: t.rent,
    other: t.other,
  };
  return names[category] ?? category;
}

export function FinanceBoard({ lang }: { lang: Lang }) {
  const t = labels[lang];
  const qc = useQueryClient();
  const [code, setCode] = useState(() => {
    const saved = sessionStorage.getItem(FINANCE_CODE_KEY) ?? '';
    setFinanceCode(saved);
    return saved;
  });
  const [draftCode, setDraftCode] = useState('');
  const [lockError, setLockError] = useState('');
  const [tab, setTab] = useState<Tab>('sales');
  const [dateMode, setDateMode] = useState<DateMode>('all');
  const [day, setDay] = useState(todayKey);
  const [fromDay, setFromDay] = useState(todayKey);
  const [toDay, setToDay] = useState(todayKey);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [chargeOpen, setChargeOpen] = useState<FinanceCharge | null | 'new'>(null);
  const [month, setMonth] = useState(thisMonth);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState('');
  const salaryMonth = useRef(month);

  const ledger = useQuery({
    queryKey: ['finance-ledger'],
    queryFn: api.getFinanceLedger,
    enabled: Boolean(code),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (ledger.error?.message !== 'invalid_code') return;
    sessionStorage.removeItem(FINANCE_CODE_KEY);
    setFinanceCode('');
    setCode('');
    setLockError(t.wrongCode);
  }, [ledger.error, t.wrongCode]);

  useEffect(() => {
    const data = ledger.data;
    if (!data) return;
    const monthChanged = salaryMonth.current !== month;
    salaryMonth.current = month;
    setAmounts((prev) => {
      const next: Record<string, string> = {};
      for (const member of data.staff) {
        const entry = data.salaries.find((row) => row.staffId === member.id && row.month === month);
        const serverValue = entry ? String(entry.amount) : '';
        next[member.id] = monthChanged || prev[member.id] === undefined ? serverValue : prev[member.id];
      }
      return next;
    });
    setPaidMap((prev) => {
      const next: Record<string, boolean> = {};
      for (const member of data.staff) {
        const entry = data.salaries.find((row) => row.staffId === member.id && row.month === month);
        next[member.id] = monthChanged || prev[member.id] === undefined ? Boolean(entry?.paid) : prev[member.id];
      }
      return next;
    });
  }, [ledger.data, month]);

  const unlock = useMutation({
    mutationFn: api.unlockFinance,
    onSuccess: () => {
      const entered = draftCode.trim();
      sessionStorage.setItem(FINANCE_CODE_KEY, entered);
      setFinanceCode(entered);
      setCode(entered);
      setDraftCode('');
      setLockError('');
    },
    onError: () => setLockError(t.wrongCode),
  });

  const saveCharge = useMutation({
    mutationFn: async (body: {
      id?: string;
      title: string;
      category: string;
      amount: number;
      chargeDate: string;
      note: string;
    }) =>
      body.id
        ? api.updateCharge(body.id, body)
        : api.createCharge(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['finance-ledger'] });
      setChargeOpen(null);
    },
  });

  const removeCharge = useMutation({
    mutationFn: api.deleteCharge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-ledger'] }),
  });

  const saveSalary = useMutation({
    mutationFn: api.saveSalary,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['finance-ledger'] });
      setNotice(t.save);
      setTimeout(() => setNotice(''), 2000);
    },
  });

  const removeSalary = useMutation({
    mutationFn: api.deleteSalary,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-ledger'] }),
  });

  const filtered = useMemo(() => {
    const data = ledger.data;
    if (!data) {
      return { sales: [], purchases: [], charges: [], salaryTotal: 0 };
    }
    const sales = data.sales.filter((row) => inRange(row.orderDate, dateMode, day, fromDay, toDay));
    const purchases = data.purchases.filter((row) =>
      inRange(row.purchasedAt, dateMode, day, fromDay, toDay),
    );
    const charges = data.charges.filter((row) => {
      if (!inRange(row.chargeDate, dateMode, day, fromDay, toDay)) return false;
      if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
      return true;
    });
    const salaryTotal = data.salaries
      .filter((row) => monthOverlaps(row.month, dateMode, day, fromDay, toDay))
      .reduce((sum, row) => sum + row.amount, 0);
    return { sales, purchases, charges, salaryTotal };
  }, [ledger.data, dateMode, day, fromDay, toDay, categoryFilter]);

  const countedSales = filtered.sales.filter((row) => row.status !== 'ملغاة');
  const salesTotal = countedSales.reduce((sum, row) => sum + row.total, 0);
  const collected = countedSales.reduce((sum, row) => sum + row.paid, 0);
  const purchaseTotal = filtered.purchases.reduce((sum, row) => sum + row.amount, 0);
  const chargeTotal = filtered.charges.reduce((sum, row) => sum + row.amount, 0);
  const result = salesTotal - purchaseTotal - chargeTotal - filtered.salaryTotal;

  const categoryOptions = useMemo(() => {
    const found = new Set<string>(PRESETS);
    for (const charge of ledger.data?.charges ?? []) found.add(charge.category);
    return [...found];
  }, [ledger.data]);

  const lock = () => {
    sessionStorage.removeItem(FINANCE_CODE_KEY);
    setFinanceCode('');
    setCode('');
    setDraftCode('');
    setLockError('');
  };

  if (!code) {
    return (
      <section className="mx-auto max-w-md soft-shadow card-line rounded-[11px] bg-white p-6 md:p-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#F1EEE8] text-[#6B6255]">
          <Lock size={18} />
        </div>
        <p className="mb-2 text-[10px] font-bold tracking-[.18em] text-[#9B8C77]">{t.eyebrow}</p>
        <h1 className="display text-[26px] font-extrabold tracking-[-.04em]">{t.lockTitle}</h1>
        <p className="mt-2 text-xs text-[#5F6B76]">{t.lockText}</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setLockError('');
            unlock.mutate(draftCode.trim());
          }}
        >
          <label className="block text-xs font-semibold">
            {t.code}
            <input
              data-testid="input-finance-code"
              type="password"
              autoComplete="off"
              value={draftCode}
              onChange={(event) => setDraftCode(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] px-3 text-xs font-normal outline-none focus:border-[#B6a990]"
              required
            />
          </label>
          {lockError && (
            <p data-testid="text-finance-code-error" className="text-xs font-semibold text-[#D95C55]">
              {lockError}
            </p>
          )}
          <button
            data-testid="button-finance-unlock"
            type="submit"
            disabled={unlock.isPending}
            className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#3A3D3F] px-4 text-xs font-semibold text-[#F8F8F6] hover:bg-[#17212B] disabled:opacity-60"
          >
            {t.enter}
          </button>
        </form>
      </section>
    );
  }

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[.18em] text-[#9B8C77]">{t.eyebrow}</p>
          <h1 className="display text-[26px] font-extrabold tracking-[-.04em] md:text-[32px]">{t.title}</h1>
          <p className="mt-1.5 text-xs text-[#5F6B76]">{t.description}</p>
        </div>
        <button
          type="button"
          data-testid="button-finance-lock"
          onClick={lock}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[#E7E5E0] bg-white px-3.5 py-2.5 text-xs font-semibold"
        >
          <Lock size={14} />
          {t.lockPage}
        </button>
      </div>

      {ledger.isLoading && <PageLoading />}
      {ledger.error && ledger.error.message !== 'invalid_code' && (
        <p className="py-10 text-center text-sm text-[#D95C55]">{ledger.error.message}</p>
      )}

      {ledger.data && (
        <>
          <div className="mb-5 flex flex-wrap items-end gap-2">
            <CalendarDays size={15} className="mb-2 text-[#9B8C77]" />
            <div className="flex rounded-md bg-[#F1EEE8] p-1">
              {(
                [
                  ['all', t.allDates],
                  ['day', t.oneDay],
                  ['period', t.period],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  data-testid={`button-finance-date-${mode}`}
                  onClick={() => setDateMode(mode)}
                  className={`whitespace-nowrap rounded px-2.5 py-1.5 text-[10px] font-bold ${
                    dateMode === mode ? 'bg-white text-[#3A3D3F] shadow-sm' : 'text-[#6E665B]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {dateMode === 'day' && (
              <input
                data-testid="input-finance-day"
                type="date"
                value={day}
                onChange={(event) => setDay(event.target.value)}
                className="digits-latin h-9 rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
              />
            )}
            {dateMode === 'period' && (
              <>
                <label className="text-[10px] font-semibold text-[#5F6B76]">
                  {t.from}
                  <input
                    data-testid="input-finance-from"
                    type="date"
                    value={fromDay}
                    onChange={(event) => setFromDay(event.target.value)}
                    className="digits-latin ms-1 h-9 rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                  />
                </label>
                <label className="text-[10px] font-semibold text-[#5F6B76]">
                  {t.to}
                  <input
                    data-testid="input-finance-to"
                    type="date"
                    value={toDay}
                    onChange={(event) => setToDay(event.target.value)}
                    className="digits-latin ms-1 h-9 rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                  />
                </label>
              </>
            )}
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MoneyCard label={t.sales} value={formatCurrency(salesTotal, lang)} icon={CircleDollarSign} />
            <MoneyCard label={t.collected} value={formatCurrency(collected, lang)} icon={WalletCards} />
            <MoneyCard label={t.purchases} value={formatCurrency(purchaseTotal, lang)} icon={Boxes} negative />
            <MoneyCard label={t.charges} value={formatCurrency(chargeTotal, lang)} icon={Banknote} negative />
            <MoneyCard label={t.salaries} value={formatCurrency(filtered.salaryTotal, lang)} icon={Banknote} negative />
            <MoneyCard
              label={t.result}
              value={formatCurrency(result, lang)}
              icon={CircleDollarSign}
              negative={result < 0}
            />
          </section>
          <p className="mt-3 text-[11px] text-[#8B949A]">{t.resultHint}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {(
              [
                ['sales', t.sales],
                ['purchases', t.purchases],
                ['charges', t.charges],
                ['salaries', t.salaries],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                data-testid={`button-finance-tab-${id}`}
                onClick={() => setTab(id)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  tab === id ? 'bg-[#3A3D3F] text-white' : 'bg-[#F1EEE8] text-[#6E665B]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'sales' && (
            <Panel>
              <p className="border-b border-[#E7E5E0] px-5 py-3 text-[11px] text-[#8B949A]">{t.cancelledNote}</p>
              <Table
                headers={[t.order, t.customer, t.date, t.marble, t.status, t.total, t.paid, t.remaining]}
                empty={filtered.sales.length === 0}
                emptyText={t.empty}
              >
                {filtered.sales.map((row) => {
                  const style = statusStyle(row.status);
                  const cancelled = row.status === 'ملغاة';
                  return (
                    <tr key={row.id} className={`border-t border-[#F0EEE9] ${cancelled ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3.5 font-semibold">
                        <Link href={`/orders/${row.orderNumber}`} className="hover:underline">
                          {row.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">{row.customer}</td>
                      <td className="digits-latin px-5 py-3.5 text-[#5F6B76]">{showDate(row.orderDate)}</td>
                      <td className="px-5 py-3.5">{row.kind}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                          style={{ color: style.color, background: style.bg }}
                        >
                          {lang === 'fr' ? statusLabelFr(row.status) : row.status}
                        </span>
                      </td>
                      <td className="mono px-5 py-3.5 text-end">{formatCurrency(row.total, lang)}</td>
                      <td className="mono px-5 py-3.5 text-end text-[#2E9B68]">{formatCurrency(row.paid, lang)}</td>
                      <td className="mono px-5 py-3.5 text-end">{formatCurrency(row.remaining, lang)}</td>
                    </tr>
                  );
                })}
              </Table>
            </Panel>
          )}

          {tab === 'purchases' && (
            <Panel>
              <Table
                headers={[t.date, t.marble, t.supplier, t.dimensions, t.slices, t.area, t.amount]}
                empty={filtered.purchases.length === 0}
                emptyText={t.empty}
              >
                {filtered.purchases.map((row) => (
                  <tr key={row.id} className="border-t border-[#F0EEE9]">
                    <td className="digits-latin px-5 py-3.5 text-[#5F6B76]">{showDate(row.purchasedAt)}</td>
                    <td className="px-5 py-3.5 font-semibold">{row.kind}</td>
                    <td className="px-5 py-3.5">{row.supplier}</td>
                    <td className="digits-latin px-5 py-3.5">{row.dimensions}</td>
                    <td className="px-5 py-3.5">{formatNumber(row.sliceCount)}</td>
                    <td className="digits-latin px-5 py-3.5">{formatAreaSqm(row.areaSqm)}</td>
                    <td className="mono px-5 py-3.5 text-end">{formatCurrency(row.amount, lang)}</td>
                  </tr>
                ))}
              </Table>
            </Panel>
          )}

          {tab === 'charges' && (
            <Panel
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    data-testid="select-finance-category"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="h-9 rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                  >
                    <option value="all">{t.allCategories}</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabel(category, t)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    data-testid="button-add-charge"
                    onClick={() => setChargeOpen('new')}
                    className="inline-flex items-center gap-2 rounded-[8px] bg-[#3A3D3F] px-3 py-2 text-xs font-semibold text-white"
                  >
                    <Plus size={14} />
                    {t.addCharge}
                  </button>
                </div>
              }
            >
              <Table
                headers={[t.date, t.chargeTitle, t.category, t.amount, t.note, t.recordedBy, t.actions]}
                empty={filtered.charges.length === 0}
                emptyText={t.empty}
              >
                {filtered.charges.map((row) => (
                  <tr key={row.id} data-testid={`row-charge-${row.id}`} className="border-t border-[#F0EEE9]">
                    <td className="digits-latin px-5 py-3.5 text-[#5F6B76]">{showDate(row.chargeDate)}</td>
                    <td className="px-5 py-3.5 font-semibold">{row.title}</td>
                    <td className="px-5 py-3.5">{categoryLabel(row.category, t)}</td>
                    <td className="mono px-5 py-3.5 text-end">{formatCurrency(row.amount, lang)}</td>
                    <td className="px-5 py-3.5 text-[#5F6B76]">{row.note || '—'}</td>
                    <td className="px-5 py-3.5 text-[#5F6B76]">{row.recordedBy || '—'}</td>
                    <td className="px-5 py-3.5 text-end">
                      <button
                        type="button"
                        data-testid={`button-edit-charge-${row.id}`}
                        onClick={() => setChargeOpen(row)}
                        className="rounded-md p-2 text-[#8B949A] hover:bg-[#F1EEE8]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        data-testid={`button-delete-charge-${row.id}`}
                        onClick={() => {
                          if (window.confirm(t.confirmDeleteCharge)) removeCharge.mutate(row.id);
                        }}
                        className="rounded-md p-2 text-[#8B949A] hover:bg-[#FBEDEC] hover:text-[#D95C55]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </Panel>
          )}

          {tab === 'salaries' && (
            <Panel>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E7E5E0] px-5 py-4">
                <p className="max-w-xl text-[11px] leading-5 text-[#5F6B76]">{t.salaryHint}</p>
                <label className="text-[10px] font-semibold text-[#5F6B76]">
                  {t.month}
                  <input
                    data-testid="input-salary-month"
                    type="month"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    className="digits-latin ms-2 h-9 rounded-md border border-[#E7E5E0] bg-white px-2 text-[11px]"
                  />
                </label>
              </div>
              {notice && <p className="px-5 pt-3 text-[11px] font-semibold text-[#2E9B68]">{notice}</p>}
              {(ledger.data.staff.length === 0) ? (
                <div className="px-5 py-10 text-center text-xs text-[#5F6B76]">
                  <p>{t.noStaff}</p>
                  <Link href="/settings" className="mt-2 inline-block font-semibold text-[#9B8C77] hover:underline">
                    {t.addStaff}
                  </Link>
                </div>
              ) : (
                <Table headers={[t.staff, t.role, t.salary, t.status, t.actions]} empty={false} emptyText={t.empty}>
                  {ledger.data.staff.map((member) => {
                    const entry = ledger.data?.salaries.find(
                      (row) => row.staffId === member.id && row.month === month,
                    );
                    const paid = paidMap[member.id] ?? false;
                    return (
                      <tr key={member.id} className="border-t border-[#F0EEE9]">
                        <td className="px-5 py-3.5 font-semibold">{member.name}</td>
                        <td className="px-5 py-3.5 text-[#5F6B76]">{member.role}</td>
                        <td className="px-5 py-3.5">
                          <input
                            data-testid={`input-salary-${member.id}`}
                            type="number"
                            min={0}
                            step={1}
                            value={amounts[member.id] ?? ''}
                            onChange={(event) =>
                              setAmounts((prev) => ({ ...prev, [member.id]: event.target.value }))
                            }
                            className="digits-latin h-9 w-32 rounded-md border border-[#E7E5E0] px-2 text-xs"
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <label className="inline-flex items-center gap-2 text-[11px] font-semibold">
                            <input
                              data-testid={`input-salary-paid-${member.id}`}
                              type="checkbox"
                              checked={paid}
                              onChange={(event) =>
                                setPaidMap((prev) => ({ ...prev, [member.id]: event.target.checked }))
                              }
                            />
                            {paid ? t.paidSalary : t.dueSalary}
                          </label>
                        </td>
                        <td className="px-5 py-3.5 text-end">
                          <button
                            type="button"
                            data-testid={`button-save-salary-${member.id}`}
                            onClick={() => {
                              const amount = Number(amounts[member.id]);
                              if (!Number.isFinite(amount) || amount < 0 || amounts[member.id] === '') return;
                              saveSalary.mutate({
                                staffId: member.id,
                                month,
                                amount: Math.round(amount),
                                paid,
                              });
                            }}
                            className="rounded-md bg-[#3A3D3F] px-3 py-1.5 text-[11px] font-semibold text-white"
                          >
                            {t.saveSalary}
                          </button>
                          {entry && (
                            <button
                              type="button"
                              data-testid={`button-clear-salary-${member.id}`}
                              onClick={() => {
                                if (!window.confirm(t.confirmClearSalary)) return;
                                setAmounts((prev) => ({ ...prev, [member.id]: '' }));
                                setPaidMap((prev) => ({ ...prev, [member.id]: false }));
                                removeSalary.mutate(entry.id);
                              }}
                              className="ms-2 text-[11px] font-semibold text-[#D95C55]"
                            >
                              {t.clearSalary}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              )}
            </Panel>
          )}
        </>
      )}

      {chargeOpen && (
        <ChargeModal
          lang={lang}
          charge={chargeOpen === 'new' ? null : chargeOpen}
          defaultDate={dateMode === 'day' ? day : todayKey()}
          pending={saveCharge.isPending}
          error={saveCharge.error?.message}
          onClose={() => {
            saveCharge.reset();
            setChargeOpen(null);
          }}
          onSave={(body) => saveCharge.mutate(body)}
        />
      )}
    </div>
  );
}

function MoneyCard({
  label,
  value,
  icon: Icon,
  negative = false,
}: {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  negative?: boolean;
}) {
  return (
    <div className="soft-shadow card-line rounded-[11px] bg-white p-5">
      <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-[8px] ${negative ? 'bg-[#FBEDEC] text-[#D95C55]' : 'bg-[#F1EEE8] text-[#6B6255]'}`}>
        <Icon size={17} />
      </div>
      <p className="mb-1 text-[11px] text-[#5F6B76]">{label}</p>
      <p className={`display text-[22px] font-extrabold tracking-[-.04em] ${negative ? 'text-[#D95C55]' : 'text-[#17212B]'}`}>
        {value}
      </p>
    </div>
  );
}

function Panel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <section className="soft-shadow card-line mt-4 overflow-hidden rounded-[11px] bg-white">
      {action && <div className="flex justify-end border-b border-[#E7E5E0] px-5 py-3">{action}</div>}
      {children}
    </section>
  );
}

function Table({
  headers,
  children,
  empty,
  emptyText,
}: {
  headers: string[];
  children: ReactNode;
  empty: boolean;
  emptyText: string;
}) {
  if (empty) return <p className="px-5 py-10 text-center text-xs text-[#8B949A]">{emptyText}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-xs">
        <thead className="bg-[#FBFAF8] text-[10px] text-[#8B949A]">
          <tr>
            {headers.map((header, index) => (
              <th
                key={header}
                className={`px-5 py-3 font-medium ${index >= headers.length - 2 ? 'text-end' : 'text-start'}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ChargeModal({
  lang,
  charge,
  defaultDate,
  pending,
  error,
  onClose,
  onSave,
}: {
  lang: Lang;
  charge: FinanceCharge | null;
  defaultDate: string;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSave: (body: {
    id?: string;
    title: string;
    category: string;
    amount: number;
    chargeDate: string;
    note: string;
  }) => void;
}) {
  const t = labels[lang];
  const preset = charge && (PRESETS as readonly string[]).includes(charge.category);
  const [title, setTitle] = useState(charge?.title ?? '');
  const [category, setCategory] = useState(charge ? (preset ? charge.category : '__custom') : 'lunch');
  const [customCategory, setCustomCategory] = useState(charge && !preset ? charge.category : '');
  const [amount, setAmount] = useState(charge ? String(charge.amount) : '');
  const [chargeDate, setChargeDate] = useState(charge ? dayKey(charge.chargeDate) : defaultDate);
  const [note, setNote] = useState(charge?.note ?? '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const resolved = category === '__custom' ? customCategory.trim() : category;
    const value = Number(amount);
    if (!title.trim() || !resolved || !chargeDate || !Number.isFinite(value) || value < 0) return;
    onSave({
      id: charge?.id,
      title: title.trim(),
      category: resolved,
      amount: Math.round(value),
      chargeDate,
      note: note.trim(),
    });
  };

  const errorText =
    error === 'invalid_charge' ? (lang === 'ar' ? 'تحقق من البيانات' : 'Vérifiez les informations') : error;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17212B]/35 p-0 sm:items-center sm:p-4">
      <form onSubmit={submit} className="w-full max-w-[500px] rounded-t-[16px] bg-[#F8F8F6] p-5 shadow-2xl sm:rounded-[13px] md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold">{charge ? t.editCharge : t.addCharge}</h2>
          <button type="button" data-testid="button-close-charge" onClick={onClose} className="text-sm text-[#8B949A]">
            {t.cancel}
          </button>
        </div>
        <div className="space-y-4">
          <Field label={t.chargeTitle}>
            <input
              data-testid="input-charge-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.chargeTitlePh}
              required
              className={fieldClass}
            />
          </Field>
          <Field label={t.category}>
            <select
              data-testid="select-charge-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={fieldClass}
            >
              {PRESETS.map((id) => (
                <option key={id} value={id}>
                  {t[id]}
                </option>
              ))}
              <option value="__custom">{t.customCategory}</option>
            </select>
          </Field>
          {category === '__custom' && (
            <Field label={t.customCategory}>
              <input
                data-testid="input-charge-custom-category"
                value={customCategory}
                onChange={(event) => setCustomCategory(event.target.value)}
                placeholder={t.customPh}
                required
                className={fieldClass}
              />
            </Field>
          )}
          <Field label={t.amount}>
            <input
              data-testid="input-charge-amount"
              type="number"
              min={0}
              step={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              className={fieldClass}
            />
          </Field>
          <Field label={t.date}>
            <input
              data-testid="input-charge-date"
              type="date"
              value={chargeDate}
              onChange={(event) => setChargeDate(event.target.value)}
              required
              className={fieldClass}
            />
          </Field>
          <Field label={t.note}>
            <input
              data-testid="input-charge-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={fieldClass}
            />
          </Field>
          {errorText && <p className="text-xs font-semibold text-[#D95C55]">{errorText}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[8px] border border-[#E7E5E0] bg-white px-3.5 py-2.5 text-xs font-semibold">
            {t.cancel}
          </button>
          <button
            data-testid="button-save-charge"
            type="submit"
            disabled={pending}
            className="rounded-[8px] bg-[#3A3D3F] px-3.5 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {t.save}
          </button>
        </div>
      </form>
    </div>
  );
}

const fieldClass =
  'mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs font-normal outline-none focus:border-[#B6a990]';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      {children}
    </label>
  );
}
