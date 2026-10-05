import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StaffAccountMenu } from '@/components/staff-account-menu';
import { CustomersManagerModal } from '@/components/customers-manager-modal';
import { OrderCreateForm } from '@/components/order-create-form';
import { ActiveStaffProvider, useActiveStaff } from '@/lib/active-staff';
import { OrderReceiptPrint } from '@/components/order-receipt-print';
import {
  ReceiptPrintModal,
  type ReceiptDocLang,
} from '@/components/receipt-print-modal';
import { ReceiptHeaderSettingsModal } from '@/components/receipt-header';
import {
  loadReceiptHeaderLines,
  type ReceiptHeaderLines,
} from '@/lib/receipt-header';
import { OrderTableRow } from '@/components/orders-table';
import { NavigationLoader } from '@/components/navigation-loader';
import { PageLoading } from '@/components/page-loading';
import {
  api,
  ORDER_STATUSES,
  type OrderStatus,
  normalizeOrderStatus,
} from '@/lib/api';
import { statusLabelFr, statusStyle } from '@/lib/order-status';
import { formatAreaSqm, formatCurrency, formatNumber } from '@/lib/format';
import { formatEdgeRoundingSummary } from '@/lib/edge-rounding';
import { InventoryKindDetail, InventoryList } from '@/pages/inventory-page';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import {
  AlertCircle, ArrowUpLeft, Banknote, Bell, Boxes,
  Check, CheckCircle2, ChevronDown, CircleDollarSign, CircleHelp,
  ClipboardList, CreditCard, Download, FileSpreadsheet, LayoutDashboard,
  Menu, MoveDownRight, MoveUpRight, Package, Pencil, Plus, Printer, ReceiptText,
  Search, Settings2, SlidersHorizontal, Trash2, TrendingUp, UserPlus, Users,
  WalletCards, X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const logoUrl = `${import.meta.env.BASE_URL}nizar-marble-logo.png`;
type Lang = 'ar' | 'fr';
type Status = OrderStatus;

const copy = {
  ar: {
    dashboard: 'لوحة المتابعة', inventory: 'المخزون', orders: 'الطلبات', finance: 'المالية', settings: 'الإعدادات',
    overview: 'نظرة عامة', today: 'اليوم', search: 'بحث', add: 'إضافة', viewAll: 'عرض الكل', revenue: 'الإيرادات',
    volume: 'حجم الطلبات', topMarble: 'الأصناف الأكثر طلباً', recent: 'آخر الطلبات', quick: 'إجراءات سريعة',
    newOrder: 'طلب جديد', addProduct: 'إضافة صنف', products: 'أصناف الرخام', staff: 'فريق العمل',
    workspace: 'مساحة العمل', owner: 'مالك المصنع', ownerShort: 'المالك', date: 'الثلاثاء، 18 يونيو 2024',
    month: 'هذا الشهر', available: 'الأصناف المتاحة', due: 'المبالغ المستحقة', netSales: 'صافي المبيعات',
    target: 'المستهدف', lastSixMonths: 'آخر 6 أشهر', bySales: 'حسب قيمة المبيعات', recentActivity: 'آخر حركة مسجلة في النظام',
    order: 'الطلب', customer: 'العميل', dateLabel: 'التاريخ', status: 'الحالة', total: 'الإجمالي',
    materials: 'إدارة المواد', catalogue: 'كتالوج الرخام', catalogueCount: 'أصناف مسجلة في الكتالوج',
    visible: 'ظاهر في الكتالوج', hidden: 'مخفي', availableQty: 'المتوفر', sellingPrice: 'سعر البيع',
    supplier: 'المورد', purchasePrice: 'الشراء', dimensions: 'الأبعاد', picture: 'الصورة', filter: 'تصفية', newest: 'الأحدث',
    addNewProduct: 'إضافة صنف جديد', marbleType: 'نوع الرخام', color: 'اللون', colorDescription: 'الوصف اللوني',
    quantity: 'الكمية (م²)', supplierName: 'اسم المورد', purchase: 'سعر الشراء', selling: 'سعر البيع',
    image: 'صورة المنتج', uploadImage: 'رفع صورة', chooseImage: 'اختر صورة من جهازك', imageReady: 'تم اختيار الصورة',
    visibility: 'الظهور في الكتالوج', shown: 'ظاهر', cancel: 'إلغاء', saveProduct: 'حفظ الصنف',
    activity: 'حركة المصنع', ordersThisMonth: 'طلبات هذا الشهر', all: 'الكل', confirmed: 'مؤكدة', inProgress: 'قيد التنفيذ',
    ready: 'جاهزة', delivered: 'تم التسليم', canceled: 'ملغاة', noOrders: 'لا توجد طلبات مطابقة', createOrder: 'إنشاء طلب جديد',
    deleteOrder: 'حذف الطلب', confirmDeleteOrder: 'حذف هذا الطلب؟ سيتم استرجاع المخزون المستهلك.',
    manageCustomers: 'العملاء',
    customerOrCompany: 'اسم العميل أو الشركة', orderPieces: 'قطع الطلب', pieceHint: 'أضف كل قطعة ومواصفاتها لحساب الإجمالي بدقة',
    addPiece: 'إضافة قطعة', piece: 'قطعة', marbleKind: 'نوع الرخام', thickness: 'السماكة', quantityShort: 'الكمية',
    piecePrice: 'سعر القطعة', estimatedTotal: 'الإجمالي التقديري', saveOrder: 'حفظ الطلب',
    orderDetails: 'تفاصيل الطلب', printReceipt: 'طباعة الإيصال', exportExcel: 'تصدير Excel', orderData: 'بيانات الطلب',
    staffCreator: 'المسؤول', edges: 'الحواف', orderPiecesLabel: 'قطع الطلب', paymentSummary: 'ملخص الدفع',
    orderTotal: 'إجمالي الطلب', paid: 'المدفوع', remaining: 'المتبقي', paidPercent: 'من قيمة الطلب مسدد',
    addDeposit: 'إضافة دفعة', depositLog: 'سجل الدفعات', newDeposit: 'تسجيل دفعة جديدة', depositAmount: 'قيمة الدفعة',
    paymentMethod: 'طريقة الدفع', bankTransfer: 'تحويل بنكي', cash: 'نقدي', card: 'بطاقة', saveDeposit: 'تسجيل الدفعة',
    financialReports: 'التقارير المالية', revenueTotal: 'إجمالي الإيرادات', materialCost: 'تكلفة المواد', netProfit: 'صافي الربح',
    profitMargin: 'هامش الربح', revenueExpenses: 'تدفق الإيرادات والمصروفات', monthlyComparison: 'مقارنة شهرية بالريال السعودي',
    expenseSummary: 'ملخص المصروفات', rawMaterials: 'المواد الخام', salaries: 'رواتب الفريق', transport: 'النقل والتشغيل',
    other: 'أخرى', salaryCycle: 'دورة يونيو 2024', markForPayment: 'تحديد للدفع', paidStatus: 'تم الدفع',
    dueStatus: 'مستحق', recordPayment: 'تسجيل الدفع', viewReceipt: 'عرض الإيصال', ownerSpace: 'مساحة المالك',
    teamSettings: 'إعدادات الفريق', manageStaff: 'إدارة حسابات الموظفين وصلاحياتهم', addStaff: 'إضافة موظف',
    staffAccounts: 'حسابات الموظفين', accountsInTeam: 'حسابات ضمن الفريق', role: 'الدور', email: 'البريد الإلكتروني',
    active: 'نشط', suspended: 'موقوف', action: 'إجراء', ownerPermissions: 'صلاحيات المالك',
    permissionsText: 'حسابات الموظفين يمكنها إدارة الطلبات والمخزون. تبقى التقارير المالية وإعدادات الفريق متاحة للمالك فقط.',
    newStaff: 'إضافة موظف جديد', editStaff: 'تعديل حساب الموظف', fullName: 'الاسم الكامل', jobTitle: 'المسمى الوظيفي',
    rolePlaceholder: 'الدور في المصنع', saveChanges: 'حفظ التغييرات', addAccount: 'إضافة الحساب', exportReport: 'تصدير التقرير',
    receiptReady: 'تم تجهيز الإيصال للطباعة', exportSuccess: 'تم تصدير ملف Excel بنجاح',     depositSuccess: 'تم تسجيل الدفعة وتحديث الرصيد',
    edgeRounding: 'تشطيب الحواف', slicesSubtotal: 'مجموع القطع',
    receiptHeaderSettings: 'رأس الإيصال',
  },
  fr: {
    dashboard: 'Tableau de bord', inventory: 'Stock', orders: 'Commandes', finance: 'Finance', settings: 'Paramètres',
    overview: 'Vue d’ensemble', today: 'Aujourd’hui', search: 'Rechercher', add: 'Ajouter', viewAll: 'Voir tout',
    revenue: 'Chiffre d’affaires', volume: 'Volume des commandes', topMarble: 'Marbres les plus demandés',
    recent: 'Commandes récentes', quick: 'Actions rapides', newOrder: 'Nouvelle commande', addProduct: 'Ajouter un article',
    products: 'Articles marbre', staff: 'Équipe',
    workspace: 'ESPACE DE TRAVAIL', owner: 'Propriétaire', ownerShort: 'Propriétaire', date: 'Mardi, 18 juin 2024',
    month: 'ce mois', available: 'Articles disponibles', due: 'Montants dus', netSales: 'Ventes nettes',
    target: 'Objectif', lastSixMonths: '6 derniers mois', bySales: 'Par valeur des ventes', recentActivity: 'Dernière activité enregistrée',
    order: 'Commande', customer: 'Client', dateLabel: 'Date', status: 'Statut', total: 'Total',
    materials: 'Gestion des matériaux', catalogue: 'Catalogue marbre', catalogueCount: 'articles dans le catalogue',
    visible: 'Visible au catalogue', hidden: 'Masqué', availableQty: 'Disponible', sellingPrice: 'Prix de vente',
    supplier: 'Fournisseur', purchasePrice: 'Achat', dimensions: 'Dimensions', picture: 'Image', filter: 'Filtrer', newest: 'Plus récent',
    addNewProduct: 'Ajouter un article', marbleType: 'Type de marbre', color: 'Couleur', colorDescription: 'Description de la couleur',
    quantity: 'Quantité (m²)', supplierName: 'Nom du fournisseur', purchase: 'Prix d’achat', selling: 'Prix de vente',
    image: 'Image du produit', uploadImage: 'Télécharger une image', chooseImage: 'Choisissez une image sur votre appareil', imageReady: 'Image sélectionnée',
    visibility: 'Visibilité au catalogue', shown: 'Visible', cancel: 'Annuler', saveProduct: 'Enregistrer l’article',
    activity: 'Activité de l’atelier', ordersThisMonth: 'commandes ce mois', all: 'Toutes', confirmed: 'Confirmée', inProgress: 'En cours',
    ready: 'Prête', delivered: 'Livrée', canceled: 'Annulée', noOrders: 'Aucune commande correspondante', createOrder: 'Créer une commande',
    deleteOrder: 'Supprimer', confirmDeleteOrder: 'Supprimer cette commande ? Le stock consommé sera restauré.',
    manageCustomers: 'Clients',
    customerOrCompany: 'Nom du client ou de l’entreprise', orderPieces: 'Pièces de la commande', pieceHint: 'Ajoutez chaque pièce pour calculer le total avec précision',
    addPiece: 'Ajouter une pièce', piece: 'Pièce', marbleKind: 'Type de marbre', thickness: 'Épaisseur', quantityShort: 'Quantité',
    piecePrice: 'Prix de la pièce', estimatedTotal: 'Total estimé', saveOrder: 'Enregistrer la commande',
    orderDetails: 'Détails de la commande', printReceipt: 'Imprimer le reçu', exportExcel: 'Exporter Excel', orderData: 'Informations de commande',
    staffCreator: 'Responsable', edges: 'Bords', orderPiecesLabel: 'Pièces', paymentSummary: 'Résumé du paiement',
    orderTotal: 'Total de la commande', paid: 'Payé', remaining: 'Restant', paidPercent: 'de la commande réglée',
    addDeposit: 'Ajouter un acompte', depositLog: 'Historique des paiements', newDeposit: 'Enregistrer un paiement', depositAmount: 'Montant du paiement',
    paymentMethod: 'Mode de paiement', bankTransfer: 'Virement bancaire', cash: 'Espèces', card: 'Carte', saveDeposit: 'Enregistrer le paiement',
    financialReports: 'Rapports financiers', revenueTotal: 'Chiffre d’affaires total', materialCost: 'Coût des matériaux', netProfit: 'Bénéfice net',
    profitMargin: 'Marge bénéficiaire', revenueExpenses: 'Revenus et dépenses', monthlyComparison: 'Comparaison mensuelle en riyals saoudiens',
    expenseSummary: 'Résumé des dépenses', rawMaterials: 'Matières premières', salaries: 'Salaires de l’équipe', transport: 'Transport et fonctionnement',
    other: 'Autres', salaryCycle: 'Cycle de juin 2024', markForPayment: 'Marquer à payer', paidStatus: 'Payé',
    dueStatus: 'À payer', recordPayment: 'Enregistrer le paiement', viewReceipt: 'Voir le reçu', ownerSpace: 'ESPACE PROPRIÉTAIRE',
    teamSettings: 'Paramètres de l’équipe', manageStaff: 'Gérer les comptes et les droits du personnel', addStaff: 'Ajouter un membre',
    staffAccounts: 'Comptes du personnel', accountsInTeam: 'comptes dans l’équipe', role: 'Rôle', email: 'E-mail',
    active: 'Actif', suspended: 'Suspendu', action: 'Action', ownerPermissions: 'Droits du propriétaire',
    permissionsText: 'Le personnel peut gérer les commandes et le stock. Les rapports financiers et les paramètres d’équipe restent réservés au propriétaire.',
    newStaff: 'Ajouter un membre', editStaff: 'Modifier le compte', fullName: 'Nom complet', jobTitle: 'Intitulé du poste',
    rolePlaceholder: 'Rôle dans l’atelier', saveChanges: 'Enregistrer les modifications', addAccount: 'Ajouter le compte', exportReport: 'Exporter le rapport',
    receiptReady: 'Le reçu est prêt à être imprimé', exportSuccess: 'Le fichier Excel a été exporté', depositSuccess: 'Paiement enregistré, solde mis à jour',
    edgeRounding: 'Finition des chants', slicesSubtotal: 'Sous-total pièces',
    receiptHeaderSettings: 'En-tête du reçu',
  },
};

function pieceLineTotal(row: { qty: number; price: number; lineTotal?: number }) {
  return row.lineTotal && row.lineTotal > 0 ? row.lineTotal : row.qty * row.price;
}

function DataStatus({ loading, error }: { loading: boolean; error: Error | null }) {
  if (loading) {
    return <PageLoading />;
  }
  if (error) {
    return <div className="py-16 text-center text-sm text-[#D95C55]">{error.message}</div>;
  }
  return null;
}

function statusLabel(status: Status | string, lang: Lang) {
  const s = normalizeOrderStatus(status);
  if (lang === 'ar') return String(s);
  return statusLabelFr(String(s));
}
function orderDate(date: string, lang: Lang) {
  if (lang === 'ar') return date;
  return ({ '18 يونيو 2024': '18 juin 2024', '17 يونيو 2024': '17 juin 2024', '16 يونيو 2024': '16 juin 2024', '15 يونيو 2024': '15 juin 2024', '14 يونيو 2024': '14 juin 2024', اليوم: 'Aujourd’hui' } as Record<string, string>)[date] || date;
}
function isImageSource(value: string) {
  return value.startsWith('blob:') || value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://');
}

function StatusPill({ status, lang = 'ar' }: { status: Status | string; lang?: Lang }) {
  const s = statusStyle(status);
  return <span data-testid={`status-${status}`} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: s.color, background: s.bg }}>
    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{statusLabel(status, lang)}
  </span>;
}

function AppShell({ children, lang, setLang }: { children: ReactNode; lang: Lang; setLang: (l: Lang) => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { staff: activeStaff } = useActiveStaff();
  const t = copy[lang];
  const staffInitial = activeStaff?.name?.charAt(0) ?? '؟';
  const links = [
    { href: '/', label: t.dashboard, icon: LayoutDashboard },
    { href: '/inventory', label: t.inventory, icon: Boxes },
    { href: '/orders', label: t.orders, icon: ClipboardList },
    { href: '/finance', label: t.finance, icon: WalletCards },
    { href: '/settings', label: t.settings, icon: Settings2 },
  ];
  return <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="app-shell flex text-[#17212B]">
    <aside className={`no-print sidebar-noise fixed inset-y-0 z-40 w-[248px] text-[#F8F8F6] transition-transform duration-300 md:sticky md:top-0 md:flex md:h-dvh md:translate-x-0 md:flex-col ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex h-[84px] items-center gap-3 border-b border-white/10 px-7">
        <img
          src={logoUrl}
          alt={lang === 'ar' ? 'شعار نزار للرخام' : 'Logo Nizar Marble'}
          className="h-11 w-11 shrink-0 rounded-[11px] bg-white object-contain p-0.5 ring-1 ring-[#CFC3AE]/40"
          width={44}
          height={44}
        />
        <div><div className="text-[17px] font-bold tracking-tight">نزار للرخام</div><div className="mt-0.5 text-[10px] tracking-[.16em] text-[#CFC3AE]">STONE WORKS · 1998</div></div>
      </div>
      <div className="px-4 pt-7"><p className="mb-3 px-3 text-[10px] font-semibold tracking-[.18em] text-white/40">{t.workspace}</p>
        <nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? location === '/' : location.startsWith(href);
          return <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-${label}`} className={`nav-link flex items-center gap-3 rounded-[9px] px-3 py-3 text-[13px] font-medium ${active ? 'bg-[#CFC3AE] text-[#3A3D3F]' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}>
            <Icon size={17} strokeWidth={active ? 2.4 : 1.8} /><span>{label}</span>{active && <span className="ms-auto h-1.5 w-1.5 rounded-full bg-[#3A3D3F]" />}
          </Link>;
        })}</nav>
      </div>
      <div className="mt-auto px-4 pb-5">
         <div className="mb-4 rounded-[10px] border border-white/10 bg-white/[.06] p-3.5"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#CFC3AE] text-xs font-bold text-[#3A3D3F]">{staffInitial}</div><div className="min-w-0"><p className="truncate text-xs font-semibold">{activeStaff?.name ?? '—'}</p><p className="truncate text-[10px] text-white/45">{activeStaff?.role ?? t.staff}</p></div><span className="ms-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E9B68]" title={lang === 'ar' ? 'جلسة نشطة' : 'Session active'} /></div></div>
        <div className="flex items-center justify-between px-2 text-[10px] text-white/40"><span>v2.4.0</span><CircleHelp size={14} /></div>
      </div>
    </aside>
    {mobileOpen && <button aria-label="إغلاق القائمة" data-testid="button-close-menu" onClick={() => setMobileOpen(false)} className="no-print fixed inset-0 z-30 bg-[#17212B]/35 md:hidden" />}
    <main className="min-w-0 flex-1">
      <header className="no-print sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#E7E5E0] bg-[#F8F8F6]/95 px-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-3"><button data-testid="button-open-menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-[#E7E5E0] md:hidden"><Menu size={20} /></button><img src={logoUrl} alt="" aria-hidden className="h-8 w-8 rounded-lg bg-white object-contain p-0.5 md:hidden" width={32} height={32} /><div className="hidden text-[11px] text-[#5F6B76] md:block">{t.date}</div></div>
        <div className="flex items-center gap-2.5">
          <button data-testid="button-language-toggle" onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')} className="rounded-md border border-[#E7E5E0] bg-white px-3 py-1.5 text-[11px] font-bold text-[#3A3D3F] transition hover:border-[#CFC3AE]">{lang === 'ar' ? 'FR' : 'AR'}</button>
          <button data-testid="button-notifications" className="relative rounded-md p-2 text-[#5F6B76] transition hover:bg-[#E7E5E0]"><Bell size={18} strokeWidth={1.7} /><span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#D95C55]" /></button>
           <div className="mx-1 h-6 w-px bg-[#E7E5E0]" /><StaffAccountMenu lang={lang} />
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] p-4 md:p-8">{children}</div>
    </main>
  </div>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[10px] font-bold tracking-[.18em] text-[#9B8C77]">{eyebrow}</p><h1 className="display text-[26px] font-extrabold tracking-[-.04em] text-[#17212B] md:text-[32px]">{title}</h1>{description && <p className="mt-1.5 text-xs text-[#5F6B76]">{description}</p>}</div>{action && <div className="no-print flex shrink-0 flex-wrap gap-2">{action}</div>}</div>;
}
function Button({ children, onClick, variant = 'dark', icon, testId }: { children: ReactNode; onClick?: () => void; variant?: 'dark' | 'stone' | 'outline' | 'danger'; icon?: ReactNode; testId: string }) {
  const styles = variant === 'dark' ? 'bg-[#3A3D3F] text-[#F8F8F6] hover:bg-[#17212B]' : variant === 'stone' ? 'bg-[#CFC3AE] text-[#3A3D3F] hover:bg-[#c4b69f]' : variant === 'danger' ? 'bg-[#FBEDEC] text-[#D95C55] hover:bg-[#f5e0de]' : 'border border-[#E7E5E0] bg-white text-[#3A3D3F] hover:border-[#CFC3AE]';
  return <button data-testid={testId} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-[8px] px-3.5 py-2.5 text-xs font-semibold transition ${styles}`}>{icon}{children}</button>;
}
function SearchBox({ value, onChange, placeholder = 'بحث في السجلات...', testId = 'input-search' }: { value: string; onChange: (s: string) => void; placeholder?: string; testId?: string }) {
  return <div className="relative"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#9CA3A8]" /><input data-testid={testId} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-[8px] border border-[#E7E5E0] bg-white ps-9 pe-3 text-xs outline-none transition placeholder:text-[#A9AEB1] focus:border-[#B6a990] focus:ring-2 focus:ring-[#CFC3AE]/30" /></div>;
}
function MetricCard({ label, value, change, icon: Icon, negative = false }: { label: string; value: string; change: string; icon: typeof TrendingUp; negative?: boolean }) {
  return <div className="soft-shadow card-line rounded-[11px] bg-white p-5"><div className="mb-5 flex items-start justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#F1EEE8] text-[#6B6255]"><Icon size={17} strokeWidth={1.8} /></div><span className={`flex items-center gap-1 text-[10px] font-bold ${negative ? 'text-[#D95C55]' : 'text-[#2E9B68]'}`}>{negative ? <MoveDownRight size={12} /> : <MoveUpRight size={12} />}{change}</span></div><p className="mb-1 text-[11px] text-[#5F6B76]">{label}</p><p className="display text-[23px] font-extrabold tracking-[-.05em] text-[#17212B]">{value}</p></div>;
}

function Dashboard({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = copy[lang];
  const { staff: activeStaff } = useActiveStaff();
  const greetName = activeStaff?.name?.split(' ')[0] ?? (lang === 'ar' ? 'فريق' : 'équipe');
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard-metrics'], queryFn: api.getDashboardMetrics });
  const recentOrderLink = data?.recentOrders[0]?.id ?? '/orders';
  const shortcuts: Array<[typeof Plus, string, string]> = [[Plus, t.newOrder, '/orders'], [Package, t.addProduct, '/inventory'], [ReceiptText, lang === 'ar' ? 'تسجيل دفعة' : 'Enregistrer un paiement', `/orders/${recentOrderLink}`], [Download, t.exportReport, '/finance']];
  const chartMonths = data?.monthlyRevenue ?? [];
  const maxRev = Math.max(...chartMonths.map(m => m.revenue), 1);
  return <AppShell lang={lang} setLang={setLang}><PageIntro eyebrow={t.overview} title={lang === 'ar' ? `صباح الخير، ${greetName}` : `Bonjour, ${greetName}`} description={lang === 'ar' ? 'هذه لمحة هادئة عن حركة المصنع اليوم.' : 'Un aperçu précis de l’activité de l’atelier.'} action={<div className="flex gap-2"><Button testId="button-dashboard-order" onClick={() => setLocation('/orders')} variant="dark" icon={<Plus size={15} />}>{t.newOrder}</Button><Button testId="button-dashboard-product" onClick={() => setLocation('/inventory')} variant="outline" icon={<Package size={15} />}>{t.addProduct}</Button></div>} />
    <DataStatus loading={isLoading} error={error} />
    {data && <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label={`${t.revenue} · ${t.month}`} value={formatCurrency(data.monthRevenue, lang)} change="—" icon={CircleDollarSign} /><MetricCard label={`${t.volume} · ${t.month}`} value={lang === 'ar' ? `${data.monthOrderCount} طلباً` : `${data.monthOrderCount} commandes`} change="—" icon={ClipboardList} /><MetricCard label={t.due} value={formatCurrency(data.totalDue, lang)} change="—" icon={CreditCard} negative /><MetricCard label={t.available} value={formatAreaSqm(data.availableInventorySqm)} change="—" icon={Boxes} /></section>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
       <section className="soft-shadow card-line rounded-[11px] bg-white p-5 md:p-6"><div className="mb-7 flex items-start justify-between"><div><h2 className="text-sm font-bold">{t.revenue}</h2><p className="mt-1 text-[11px] text-[#5F6B76]">{t.lastSixMonths}</p></div><button data-testid="button-period-filter" className="flex items-center gap-2 rounded-md border border-[#E7E5E0] px-2.5 py-1.5 text-[10px] text-[#5F6B76]">{t.lastSixMonths} <ChevronDown size={13} /></button></div><div className="flex h-[210px] items-end gap-2 border-b border-[#E7E5E0] px-2 sm:gap-5">{chartMonths.map((m) => { const h = Math.max(Math.round((m.revenue / maxRev) * 88), 4); return <div key={m.month} className="group flex flex-1 flex-col items-center gap-2"><div className="relative w-full max-w-[58px] rounded-t-[5px] bg-[#E5DED2] transition group-hover:bg-[#CFC3AE]" style={{ height: `${h * 1.65}px` }}><div className="absolute inset-x-0 bottom-0 rounded-t-[5px] bg-[#3A3D3F]" style={{ height: `${Math.max(h * .66, 2)}%` }} /></div><span className="text-[10px] text-[#8B949A]">{m.month}</span></div>; })}</div><div className="mt-4 flex items-center justify-center gap-5 text-[10px] text-[#5F6B76]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#3A3D3F]" />{t.netSales}</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#E5DED2]" />{t.target}</span></div></section>
       <section className="soft-shadow card-line rounded-[11px] bg-white p-5 md:p-6"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-sm font-bold">{t.topMarble}</h2><p className="mt-1 text-[11px] text-[#5F6B76]">{t.bySales}</p></div><button data-testid="button-marble-filter" className="text-[#5F6B76]"><SlidersHorizontal size={16} /></button></div><div className="space-y-5">{data.topMarble.map((row, i) => <div key={row.name}><div className="mb-2 flex justify-between text-[11px]"><span className="font-medium">{row.name}</span><span className="mono text-[#5F6B76]">{row.pct}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#F1EEE8]"><div className={`metric-bar h-full rounded-full ${i === 0 ? 'bg-[#3A3D3F]' : 'bg-[#CFC3AE]'}`} style={{ width: `${row.width}%` }} /></div></div>)}</div></section>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
       <section className="soft-shadow card-line overflow-hidden rounded-[11px] bg-white"><div className="flex items-center justify-between border-b border-[#E7E5E0] p-5"><div><h2 className="text-sm font-bold">{t.recent}</h2><p className="mt-1 text-[11px] text-[#5F6B76]">{t.recentActivity}</p></div><Link href="/orders" data-testid="link-dashboard-orders" className="text-[11px] font-semibold text-[#9B8C77] hover:text-[#3A3D3F]">{t.viewAll} ←</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-start text-xs"><thead className="bg-[#FBFAF8] text-[10px] text-[#8B949A]"><tr><th className="px-5 py-3 text-start font-medium">{t.order}</th><th className="px-5 py-3 text-start font-medium">{t.customer}</th><th className="px-5 py-3 text-start font-medium">{t.dateLabel}</th><th className="px-5 py-3 text-start font-medium">{t.status}</th><th className="px-5 py-3 text-end font-medium">{t.total}</th></tr></thead><tbody>{data.recentOrders.map(o => <tr key={o.id} className="border-t border-[#F0EEE9] transition hover:bg-[#FBFAF8]"><td className="px-5 py-3.5 font-bold">{o.id}</td><td className="px-5 py-3.5">{o.customer}</td><td className="px-5 py-3.5 text-[#5F6B76]">{orderDate(o.date, lang)}</td><td className="px-5 py-3.5"><StatusPill status={o.status} lang={lang} /></td><td className="mono px-5 py-3.5 text-end text-[11px]">{formatCurrency(o.total, lang)}</td></tr>)}</tbody></table></div></section>
      <section className="rounded-[11px] bg-[#3A3D3F] p-5 text-[#F8F8F6] md:p-6"><div className="mb-8 flex items-start justify-between"><div><p className="mb-2 text-[10px] font-bold tracking-[.16em] text-[#CFC3AE]">SHORTCUTS</p><h2 className="text-lg font-bold">{t.quick}</h2></div><ArrowUpLeft size={18} className="text-[#CFC3AE]" /></div><div className="grid grid-cols-2 gap-2.5">{shortcuts.map(([Icon, label, href]) => <Link key={String(label)} href={String(href)} data-testid={`link-quick-${label}`} className="group rounded-[8px] border border-white/10 bg-white/[.06] p-3 transition hover:border-[#CFC3AE]/50 hover:bg-white/10"><div className="mb-5 flex h-7 w-7 items-center justify-center rounded-md bg-[#CFC3AE] text-[#3A3D3F]"><Icon size={14} /></div><span className="text-[11px] font-medium text-white/80 group-hover:text-white">{label}</span></Link>)}</div></section>
    </div></>}
  </AppShell>;
}

function Inventory({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = copy[lang];
  const [location] = useLocation();
  const isDetail = location.startsWith('/inventory/') && location !== '/inventory';
  return (
    <AppShell lang={lang} setLang={setLang}>
      <PageIntro eyebrow={t.materials} title={t.catalogue} description={t.catalogueCount} />
      {isDetail ? <InventoryKindDetail lang={lang} /> : <InventoryList lang={lang} />}
    </AppShell>
  );
}

function Orders({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = copy[lang];
  const { data: orders = [], isLoading, error } = useQuery({ queryKey: ['orders'], queryFn: api.getOrders });
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [customersOpen, setCustomersOpen] = useState(false);
  const [status, setStatus] = useState<Status | 'الكل'>('الكل');
  const filtered = orders.filter(
    (o) =>
      `${o.orderNumber} ${o.customer} ${o.kind}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (status === 'الكل' ||
        normalizeOrderStatus(o.status) === normalizeOrderStatus(status)),
  );
  const openCreate = () => setModal(true);
  const statusFilters: Array<Status | 'الكل'> = ['الكل', ...ORDER_STATUSES];
  return (
    <AppShell lang={lang} setLang={setLang}>
      <PageIntro
        eyebrow={lang === 'ar' ? 'حركة المصنع' : t.activity}
        title={lang === 'ar' ? 'الطلبات' : t.orders}
        description={`${orders.length} ${t.ordersThisMonth}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              testId="button-manage-customers"
              onClick={() => setCustomersOpen(true)}
              variant="outline"
              icon={<Users size={15} />}
            >
              {t.manageCustomers}
            </Button>
            <Button testId="button-create-order" onClick={openCreate} variant="dark" icon={<Plus size={15} />}>
              {t.newOrder}
            </Button>
          </div>
        }
      />
      <DataStatus loading={isLoading} error={error} />
      <div className="soft-shadow card-line overflow-hidden rounded-[11px] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E7E5E0] p-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-[340px]">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder={lang === 'ar' ? 'ابحث برقم الطلب أو العميل...' : 'Rechercher par commande ou client...'}
              testId="input-orders-search"
            />
          </div>
          <div className="mobile-scroll flex gap-1.5 pb-1">
            {statusFilters.map((s) => (
              <button
                key={s}
                type="button"
                data-testid={`button-filter-${s}`}
                onClick={() => setStatus(s)}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-[10px] font-semibold transition ${status === s ? 'bg-[#3A3D3F] text-white' : 'text-[#5F6B76] hover:bg-[#F1EEE8]'}`}
              >
                {s === 'الكل' ? t.all : statusLabel(s, lang)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-xs">
            <thead className="bg-[#FBFAF8] text-[10px] text-[#8B949A]">
              <tr>
                {[t.order, t.customer, t.dateLabel, t.marbleKind, t.staffCreator, t.total, t.paid, t.remaining, t.status, t.action].map((h) => (
                  <th key={h} className="px-5 py-3 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <OrderTableRow
                  key={o.orderNumber}
                  order={o}
                  lang={lang}
                  labels={{
                    order: t.order,
                    paid: t.paid,
                    remaining: t.remaining,
                    delete: t.deleteOrder,
                    confirmDelete: t.confirmDeleteOrder,
                  }}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-[#5F6B76]">{t.noOrders}</div>
          )}
        </div>
      </div>
      {modal && (
        <OrderCreateForm lang={lang} title={t.createOrder} onClose={() => setModal(false)} />
      )}
      {customersOpen && (
        <CustomersManagerModal lang={lang} onClose={() => setCustomersOpen(false)} />
      )}
    </AppShell>
  );
}

function OrderDetail({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = copy[lang];
  const qc = useQueryClient();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: Boolean(orderId),
  });
  const depositMutation = useMutation({
    mutationFn: (body: { amount: number; method: string }) => api.addDeposit(orderId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => api.updateOrder(orderId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
  const [, setLocation] = useLocation();
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteOrder(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setLocation('/orders');
    },
  });
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState('');
  const [receiptLines, setReceiptLines] = useState<ReceiptHeaderLines>(() =>
    loadReceiptHeaderLines(),
  );
  const [headerModal, setHeaderModal] = useState(false);
  const [printModal, setPrintModal] = useState(false);
  const [receiptDocLang, setReceiptDocLang] = useState<ReceiptDocLang>('ar');
  useEffect(() => {
    if (data?.order.orderNumber && data.order.orderNumber !== orderId) {
      setLocation(`/orders/${data.order.orderNumber}`);
    }
  }, [data, orderId, setLocation]);
  if (isLoading || error || !data) {
    return <AppShell lang={lang} setLang={setLang}><DataStatus loading={isLoading} error={error} /></AppShell>;
  }
  const { order, deposits } = data;
  const paid = order.paid;
  const remaining = Math.max(order.total - paid, 0);
  const pieceRows = order.pieces.length > 0 ? order.pieces : [];
  const edgesDisplay =
    (order.edgeRoundingPricePerM ?? 0) > 0 && order.edgeRoundingPrice > 0
      ? formatEdgeRoundingSummary(
          order.edgeRoundingPricePerM ?? 0,
          order.edgeRoundingMeters ?? [],
          order.edgeRoundingPrice,
          lang,
        )
      : order.edges ?? '—';
  const addDeposit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await depositMutation.mutateAsync({ amount: Number(fd.get('amount')), method: String(fd.get('method')) });
    setModal(false);
    setNotice(t.depositSuccess);
    setTimeout(() => setNotice(''), 2800);
  };
  return <AppShell lang={lang} setLang={setLang}><div className="no-print mb-6 flex items-center gap-2 text-[11px] text-[#5F6B76]"><Link href="/orders" data-testid="link-back-orders" className="hover:text-[#3A3D3F]">{t.orders}</Link><span>/</span><span className="font-semibold text-[#3A3D3F]">{order.id}</span></div>
     <OrderReceiptPrint lang={receiptDocLang} order={order} deposits={deposits} paid={paid} headerLines={receiptLines} />
     <div className="order-screen-content"><PageIntro eyebrow={t.orderDetails} title={order.id} description={`${order.customer} · ${orderDate(order.date, lang)}`} action={<><Button testId="button-receipt-header" onClick={() => setHeaderModal(true)} variant="outline" icon={<Settings2 size={15} />}>{t.receiptHeaderSettings}</Button><Button testId="button-print-receipt" onClick={() => setPrintModal(true)} variant="outline" icon={<Printer size={15} />}>{t.printReceipt}</Button><Button testId="button-export-order" onClick={() => { setNotice(t.exportSuccess); setTimeout(() => setNotice(''), 2800); }} variant="stone" icon={<FileSpreadsheet size={15} />}>{t.exportExcel}</Button><Button testId="button-delete-order-detail" onClick={() => { if (window.confirm(t.confirmDeleteOrder)) deleteMutation.mutate(); }} variant="danger" icon={<Trash2 size={15} />}>{t.deleteOrder}</Button></>} />{notice && <div data-testid="status-order-feedback" className="no-print mb-4 flex items-center gap-2 rounded-lg border border-[#BCE3C9] bg-[#EAF6EF] px-4 py-3 text-xs font-semibold text-[#2E9B68]"><CheckCircle2 size={16} />{notice}</div>}
     <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><div className="space-y-5"><section className="soft-shadow card-line rounded-[11px] bg-white p-5 md:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-bold">{t.orderData}</h2><label className="text-[10px] font-semibold text-[#8B949A]">{t.status}<select data-testid="select-order-detail-status" value={normalizeOrderStatus(order.status) as string} disabled={statusMutation.isPending} onChange={(e) => statusMutation.mutate(e.target.value as OrderStatus)} className="ms-2 rounded-md border border-[#E7E5E0] bg-white px-2 py-1.5 text-xs font-semibold text-[#3A3D3F]">{ORDER_STATUSES.map((s) => <option key={s} value={s}>{lang === 'ar' ? s : statusLabelFr(s)}</option>)}</select></label></div><div className="grid gap-y-5 sm:grid-cols-3">{[[t.customer, order.customer],[t.staffCreator, order.staff],[t.marbleKind, order.kind],[t.dimensions, order.dimensions ?? '—'],[t.thickness, order.thickness ?? '—'],[t.edges, edgesDisplay]].map(([label, value]) => <div key={String(label)}><p className="mb-1 text-[10px] text-[#8B949A]">{label}</p><p className="text-xs font-semibold">{value}</p></div>)}</div></section><section className="soft-shadow card-line overflow-hidden rounded-[11px] bg-white"><div className="flex items-center justify-between border-b border-[#E7E5E0] p-5"><h2 className="text-sm font-bold">{t.orderPiecesLabel}</h2><span className="text-[10px] text-[#5F6B76]">{lang === 'ar' ? `${pieceRows.length} قطع` : `${pieceRows.length} pièces`}</span></div><table className="w-full text-xs"><thead className="bg-[#FBFAF8] text-[10px] text-[#8B949A]"><tr><th className="px-5 py-3 text-start font-medium">{t.marbleKind}</th><th className="px-5 py-3 text-start font-medium">{t.dimensions}</th><th className="px-5 py-3 text-start font-medium">{t.quantityShort}</th><th className="px-5 py-3 text-end font-medium">{t.sellingPrice}</th></tr></thead><tbody>{pieceRows.map(row => <tr key={`${row.kind}-${row.dims}-${row.qty}`} className="border-t border-[#F0EEE9]"><td className="px-5 py-3.5 font-semibold">{row.kind}</td><td className="px-5 py-3.5 text-[#5F6B76]">{row.dims}</td><td className="px-5 py-3.5">{row.qty}</td><td className="mono px-5 py-3.5 text-end">{formatCurrency(pieceLineTotal(row), lang)}</td></tr>)}</tbody></table></section></div><div className="space-y-5"><section className="soft-shadow card-line rounded-[11px] bg-white p-5 md:p-6"><div className="mb-6 flex items-center justify-between"><h2 className="text-sm font-bold">{t.paymentSummary}</h2><Banknote size={18} className="text-[#9B8C77]" /></div><div className="space-y-3 border-b border-[#E7E5E0] pb-5 text-xs">{(order.linesSubtotal > 0 || order.edgeRoundingPrice > 0) && <><div className="flex justify-between"><span className="text-[#5F6B76]">{t.slicesSubtotal}</span><b>{formatCurrency(order.linesSubtotal ?? order.total, lang)}</b></div>{order.edgeRoundingPrice > 0 && <div className="flex justify-between"><span className="text-[#5F6B76]">{t.edgeRounding}</span><b>{formatCurrency(order.edgeRoundingPrice, lang)}</b></div>}</>}<div className="flex justify-between"><span className="text-[#5F6B76]">{t.orderTotal}</span><b>{formatCurrency(order.total, lang)}</b></div><div className="flex justify-between"><span className="text-[#5F6B76]">{t.paid}</span><b className="text-[#2E9B68]">{formatCurrency(paid, lang)}</b></div><div className="flex justify-between"><span className="text-[#5F6B76]">{t.remaining}</span><b className="text-[#D95C55]">{formatCurrency(remaining, lang)}</b></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#F1EEE8]"><div className="h-full rounded-full bg-[#2E9B68] transition-all" style={{ width: `${Math.min(order.total ? (paid / order.total) * 100 : 0, 100)}%` }} /></div><p className="mt-2 text-[10px] text-[#8B949A]">{order.total ? Math.round((paid / order.total) * 100) : 0}% {t.paidPercent}</p><div className="no-print"><Button testId="button-add-deposit" onClick={() => setModal(true)} variant="dark" icon={<Plus size={15} />}>{t.addDeposit}</Button></div></section><section className="soft-shadow card-line rounded-[11px] bg-white p-5"><h2 className="mb-4 text-sm font-bold">{t.depositLog}</h2><div className="space-y-3">{deposits.map(d => <div key={d.id} className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF6EF] text-[#2E9B68]"><Check size={14} /></div><div className="flex-1"><p className="text-xs font-semibold">{lang === 'ar' ? d.method : ({ 'تحويل بنكي': t.bankTransfer, 'نقدي': t.cash, 'بطاقة': t.card }[d.method] || d.method)}</p><p className="text-[10px] text-[#8B949A]">{orderDate(d.date, lang)}</p></div><b className="mono text-xs text-[#2E9B68]">+{formatCurrency(d.amount, lang)}</b></div>)}</div></section></div></div>
     {modal && <Modal title={t.newDeposit} onClose={() => setModal(false)}><form onSubmit={addDeposit} className="space-y-4"><Field label={t.depositAmount} name="amount" type="number" placeholder="0" required /><label className="block text-xs font-semibold">{t.paymentMethod}<select name="method" className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs outline-none focus:border-[#CFC3AE]"><option value="تحويل بنكي">{t.bankTransfer}</option><option value="نقدي">{t.cash}</option><option value="بطاقة">{t.card}</option></select></label><div className="flex justify-end gap-2 pt-2"><Button testId="button-cancel-deposit" onClick={() => setModal(false)} variant="outline">{t.cancel}</Button><Button testId="button-submit-deposit" variant="dark">{t.saveDeposit}</Button></div></form></Modal>}</div>
     {headerModal && <ReceiptHeaderSettingsModal lang={lang} lines={receiptLines} onChange={setReceiptLines} onClose={() => setHeaderModal(false)} />}
     {printModal && (
       <ReceiptPrintModal
         uiLang={lang}
         onClose={() => setPrintModal(false)}
         onPrint={(docLang) => {
           setReceiptDocLang(docLang);
           setPrintModal(false);
           requestAnimationFrame(() => {
             requestAnimationFrame(() => {
               window.print();
               setNotice(t.receiptReady);
             });
           });
         }}
       />
     )}</AppShell>;
}

function Finance({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = copy[lang];
  const { data, isLoading, error } = useQuery({ queryKey: ['finance'], queryFn: api.getFinanceOverview });
  const expenseLabels: Record<string, string> = {
    rawMaterials: t.rawMaterials,
    salaries: t.salaries,
    transport: t.transport,
    other: t.other,
  };
  const maxFlow = Math.max(...(data?.monthlyFlow.map(f => Math.max(f.revenue, f.expenses)) ?? [1]), 1);
  return <AppShell lang={lang} setLang={setLang}><PageIntro eyebrow={t.financialReports} title={t.finance} description={lang === 'ar' ? 'بيانات محدثة من قاعدة البيانات' : 'Données synchronisées depuis la base'} action={<Button testId="button-export-finance" onClick={() => alert(lang === 'ar' ? 'تم تجهيز التقرير' : 'Rapport préparé')} variant="outline" icon={<Download size={15} />}>{t.exportReport}</Button>} /><DataStatus loading={isLoading} error={error} />{data && <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label={t.revenueTotal} value={formatCurrency(data.revenueTotal, lang)} change="—" icon={TrendingUp} /><MetricCard label={t.materialCost} value={formatCurrency(data.materialCost, lang)} change="—" icon={Boxes} negative /><MetricCard label={t.netProfit} value={formatCurrency(data.netProfit, lang)} change="—" icon={CircleDollarSign} /><MetricCard label={t.profitMargin} value={data.profitMargin} change="—" icon={MoveUpRight} /></section><div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><section className="soft-shadow card-line rounded-[11px] bg-white p-5 md:p-6"><div className="mb-7"><h2 className="text-sm font-bold">{t.revenueExpenses}</h2><p className="mt-1 text-[11px] text-[#5F6B76]">{t.monthlyComparison}</p></div><div className="flex h-[245px] items-end gap-3 border-b border-[#E7E5E0] px-2 sm:gap-7">{data.monthlyFlow.map((m) => <div key={m.month} className="flex flex-1 items-end justify-center gap-1.5"><div className="w-[45%] rounded-t bg-[#3A3D3F]" style={{ height: `${Math.max((m.revenue / maxFlow) * 180, 4)}px` }} /><div className="w-[45%] rounded-t bg-[#CFC3AE]" style={{ height: `${Math.max((m.expenses / maxFlow) * 180, 4)}px` }} /><span className="absolute translate-y-5 text-[10px] text-[#8B949A]">{m.month}</span></div>)}</div><div className="mt-7 flex justify-center gap-5 text-[10px] text-[#5F6B76]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#3A3D3F]" />{t.revenue}</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#CFC3AE]" />{lang === 'ar' ? 'المصروفات' : 'Dépenses'}</span></div></section><section className="soft-shadow card-line rounded-[11px] bg-white p-5 md:p-6"><h2 className="mb-6 text-sm font-bold">{t.expenseSummary}</h2><div className="space-y-5">{data.expenseSummary.map(x => <div key={x.label}><div className="mb-2 flex justify-between text-[11px]"><span>{expenseLabels[x.label] ?? x.label}</span><span className="mono text-[#5F6B76]">{formatCurrency(x.amount, lang)}</span></div><div className="h-2 rounded-full bg-[#F1EEE8]"><div className="h-full rounded-full" style={{ width: x.width, background: x.color }} /></div></div>)}</div></section></div><section className="soft-shadow card-line mt-5 overflow-hidden rounded-[11px] bg-white"><div className="flex items-center justify-between border-b border-[#E7E5E0] p-5"><div><h2 className="text-sm font-bold">{t.salaries}</h2><p className="mt-1 text-[11px] text-[#5F6B76]">{t.salaryCycle}</p></div><Button testId="button-pay-salaries" onClick={() => alert(lang === 'ar' ? 'تم تحديد الرواتب للدفع' : 'Salaires marqués pour paiement')} variant="stone" icon={<Banknote size={15} />}>{t.markForPayment}</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-xs"><thead className="bg-[#FBFAF8] text-[10px] text-[#8B949A]"><tr><th className="px-5 py-3 text-start font-medium">{t.staff}</th><th className="px-5 py-3 text-start font-medium">{t.jobTitle}</th><th className="px-5 py-3 text-start font-medium">{lang === 'ar' ? 'الراتب' : 'Salaire'}</th><th className="px-5 py-3 text-start font-medium">{t.status}</th><th className="px-5 py-3 text-end font-medium">{t.action}</th></tr></thead><tbody>{data.salaryRows.map((x, i) => <tr key={x.id} className="border-t border-[#F0EEE9]"><td className="px-5 py-4 font-semibold"><span className="me-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F1EEE8] text-[10px]">{x.name[0]}</span>{x.name}</td><td className="px-5 py-4 text-[#5F6B76]">{x.role}</td><td className="mono px-5 py-4">{formatCurrency(x.salary, lang)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${x.status === 'تم الدفع' ? 'bg-[#EAF6EF] text-[#2E9B68]' : 'bg-[#FCF4E5] text-[#D99A32]'}`}>{x.status === 'تم الدفع' ? t.paidStatus : t.dueStatus}</span></td><td className="px-5 py-4 text-end"><button data-testid={`button-salary-${i}`} className="text-[11px] font-semibold text-[#9B8C77] hover:text-[#3A3D3F]">{x.status === 'مستحق' ? t.recordPayment : t.viewReceipt}</button></td></tr>)}</tbody></table></div></section></>}</AppShell>;
}

function Settings({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = copy[lang];
  const qc = useQueryClient();
  const { data: staff = [], isLoading, error } = useQuery({ queryKey: ['staff'], queryFn: api.getStaff });
  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; name: string; role: string; email: string }) =>
      payload.id ? api.updateStaff(payload.id, payload) : api.createStaff({ name: payload.name, role: payload.role, email: payload.email, status: 'نشط' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteStaff,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await saveMutation.mutateAsync({
      id: editing ?? undefined,
      name: String(fd.get('name')),
      role: String(fd.get('role')),
      email: String(fd.get('email')),
    });
    setModal(false);
    setEditing(null);
  };
  const translatedRole = (role: string) => lang === 'ar' ? role : ({ 'مشرف الإنتاج': 'Superviseur production', 'فني قص وتشطيب': 'Technicien découpe et finition', 'فني تركيب': 'Technicien pose' }[role] || role);
  return <AppShell lang={lang} setLang={setLang}><PageIntro eyebrow={t.ownerSpace} title={t.teamSettings} description={t.manageStaff} action={<Button testId="button-add-staff" onClick={() => { setEditing(null); setModal(true); }} variant="dark" icon={<UserPlus size={15} />}>{t.addStaff}</Button>} /><DataStatus loading={isLoading} error={error} /><section className="soft-shadow card-line overflow-hidden rounded-[11px] bg-white"><div className="flex items-center justify-between border-b border-[#E7E5E0] p-5"><div><h2 className="text-sm font-bold">{t.staffAccounts}</h2><p className="mt-1 text-[11px] text-[#5F6B76]">{lang === 'ar' ? `لديك ${staff.length} حسابات ضمن الفريق` : `${staff.length} ${t.accountsInTeam}`}</p></div><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1EEE8] text-[#6B6255]"><Users size={16} /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-xs"><thead className="bg-[#FBFAF8] text-[10px] text-[#8B949A]"><tr><th className="px-5 py-3 text-start font-medium">{t.staff}</th><th className="px-5 py-3 text-start font-medium">{t.role}</th><th className="px-5 py-3 text-start font-medium">{t.email}</th><th className="px-5 py-3 text-start font-medium">{t.status}</th><th className="px-5 py-3 text-end font-medium">{t.action}</th></tr></thead><tbody>{staff.map(s => <tr key={s.id} data-testid={`row-staff-${s.id}`} className="border-t border-[#F0EEE9] transition hover:bg-[#FBFAF8]"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3A3D3F] text-[11px] font-bold text-[#CFC3AE]">{s.name[0]}</span><b>{s.name}</b></div></td><td className="px-5 py-4 text-[#5F6B76]">{translatedRole(s.role)}</td><td className="px-5 py-4 text-[#5F6B76]">{s.email}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.status === 'نشط' ? 'bg-[#EAF6EF] text-[#2E9B68]' : 'bg-[#FBEDEC] text-[#D95C55]'}`}>{s.status === 'نشط' ? t.active : t.suspended}</span></td><td className="px-5 py-4 text-end"><div className="flex justify-end gap-1"><button data-testid={`button-edit-staff-${s.id}`} onClick={() => { setEditing(s.id); setModal(true); }} className="rounded-md p-2 text-[#8B949A] hover:bg-[#F1EEE8] hover:text-[#3A3D3F]"><Pencil size={14} /></button><button data-testid={`button-delete-staff-${s.id}`} onClick={() => deleteMutation.mutate(s.id)} className="rounded-md p-2 text-[#8B949A] hover:bg-[#FBEDEC] hover:text-[#D95C55]"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div></section><section className="mt-5 rounded-[11px] border border-[#E5DDD0] bg-[#F3EFE8] p-5"><div className="flex gap-3"><AlertCircle size={18} className="mt-0.5 shrink-0 text-[#9B8C77]" /><div><h3 className="text-xs font-bold">{t.ownerPermissions}</h3><p className="mt-1 text-[11px] leading-5 text-[#6E665B]">{t.permissionsText}</p></div></div></section>{modal && <Modal title={editing ? t.editStaff : t.newStaff} onClose={() => { setModal(false); setEditing(null); }}><form onSubmit={save} className="space-y-4"><Field label={t.fullName} name="name" defaultValue={editing ? staff.find(s => s.id === editing)?.name : ''} placeholder={lang === 'ar' ? 'الاسم' : 'Nom'} required /><Field label={t.jobTitle} name="role" defaultValue={editing ? staff.find(s => s.id === editing)?.role : ''} placeholder={t.rolePlaceholder} required /><Field label={t.email} name="email" defaultValue={editing ? staff.find(s => s.id === editing)?.email : ''} placeholder="name@nizarstone.sa" required /><div className="flex justify-end gap-2 pt-2"><Button testId="button-cancel-staff" onClick={() => setModal(false)} variant="outline">{t.cancel}</Button><Button testId="button-submit-staff" variant="dark">{editing ? t.saveChanges : t.addAccount}</Button></div></form></Modal>}</AppShell>;
}

function Field({ label, name, placeholder, type = 'text', required = false, defaultValue }: { label: string; name: string; placeholder?: string; type?: string; required?: boolean; defaultValue?: string | number }) {
  return <label className="block text-xs font-semibold">{label}<input data-testid={`input-${name}`} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E5E0] bg-white px-3 text-xs font-normal outline-none transition placeholder:text-[#A9AEB1] focus:border-[#B6a990] focus:ring-2 focus:ring-[#CFC3AE]/30" /></label>;
}
function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17212B]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"><div className={`fade-up w-full rounded-t-[16px] bg-[#F8F8F6] p-5 shadow-2xl sm:rounded-[13px] md:p-6 ${wide ? 'max-w-[650px]' : 'max-w-[500px]'}`}><div className="mb-6 flex items-center justify-between"><h2 className="text-base font-bold">{title}</h2><button data-testid="button-close-modal" onClick={onClose} className="rounded-md p-1.5 text-[#8B949A] transition hover:bg-[#E7E5E0] hover:text-[#3A3D3F]"><X size={18} /></button></div>{children}</div></div>;
}

function Router({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return <ErrorBoundary resetKey={location.pathname}><Switch><Route path="/orders/:orderId"><OrderDetail lang={lang} setLang={setLang} /></Route><Route path="/inventory/:kindId"><Inventory lang={lang} setLang={setLang} /></Route><Route path="/inventory"><Inventory lang={lang} setLang={setLang} /></Route><Route path="/orders"><Orders lang={lang} setLang={setLang} /></Route><Route path="/finance"><Finance lang={lang} setLang={setLang} /></Route><Route path="/settings"><Settings lang={lang} setLang={setLang} /></Route><Route path="/"><Dashboard lang={lang} setLang={setLang} /></Route><Route><NotFound /></Route></Switch></ErrorBoundary>;
}
function NotFound() { return <div className="flex min-h-dvh items-center justify-center bg-[#F8F8F6]"><div className="text-center"><p className="mono text-5xl font-bold text-[#CFC3AE]">404</p><h1 className="mt-3 text-xl font-bold">الصفحة غير موجودة</h1><Link href="/" data-testid="link-not-found-home" className="mt-5 inline-block text-sm text-[#9B8C77]">العودة للرئيسية</Link></div></div>; }
function App() {
  const [lang, setLang] = useState<Lang>('ar');
  return (
    <QueryClientProvider client={queryClient}>
      <ActiveStaffProvider>
        <NavigationLoader />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router lang={lang} setLang={setLang} />
        </WouterRouter>
        <Toaster />
      </ActiveStaffProvider>
    </QueryClientProvider>
  );
}
export default App;