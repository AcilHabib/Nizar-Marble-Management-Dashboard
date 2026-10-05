import { staffActorHeaders } from '@/lib/api-client';
import type { OrderStatus } from '@/lib/order-status';

export type { OrderStatus } from '@/lib/order-status';
export { ORDER_STATUSES, normalizeOrderStatus } from '@/lib/order-status';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export { setApiStaffActor, getApiStaffActor } from '@/lib/api-client';
export type { ApiStaffActor } from '@/lib/api-client';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...staffActorHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? res.statusText);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export type OrderPiece = {
  kind: string;
  dims: string;
  thickness: string;
  edges: string;
  qty: number;
  price: number;
  sliceId?: string;
  cutLengthM?: number;
  cutWidthM?: number;
  lineTotal?: number;
  sellingPerSqm?: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customer: string;
  date: string;
  orderDate?: string;
  kind: string;
  total: number;
  paid: number;
  remaining: number;
  status: OrderStatus;
  staff: string;
  dimensions?: string | null;
  thickness?: string | null;
  edges?: string | null;
  linesSubtotal: number;
  edgeRoundingPrice: number;
  edgeRoundingPricePerM?: number;
  edgeRoundingMeters?: number[];
  pieces: OrderPiece[];
};

export type Customer = {
  id: string;
  fullName: string;
  phone: string;
  address: string;
};

export type OrderCutLine = {
  sliceId: string;
  cutLengthM: number;
  cutWidthM: number;
  qty: number;
};

export type Deposit = {
  id: string;
  amount: number;
  method: string;
  recordedBy?: string;
  date: string;
  depositDate?: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  address: string;
};

export type MarbleKind = {
  id: string;
  name: string;
  color: string;
  imageUrl: string;
  visible: boolean;
  tone: string;
  createdAt: string;
  updatedAt: string;
  sliceCount: number;
  totalAreaSqm: number;
  totalPurchaseValue: number;
  totalSellingValue: number;
  supplierIds: string[];
};

export type SliceWasteRect = { lengthM: number; widthM: number };

export type MarbleSlice = {
  id: string;
  kindId: string;
  supplier: Supplier;
  lengthM: number;
  widthM: number;
  thicknessM: number;
  wastes: SliceWasteRect[];
  sliceCount: number;
  purchasePerSqm: number;
  sellingPerSqm: number;
  grossAreaOneSqm: number;
  wasteAreaOneSqm: number;
  areaOneSqm: number;
  totalAreaSqm: number;
  purchaseTotal: number;
  sellingTotal: number;
  availableNetAreaSqm: number;
  createdAt: string;
};

export type MarbleKindQuery = {
  visible?: 'true' | 'false' | 'all';
  supplierId?: string;
  sort?: 'newest' | 'oldest' | 'name';
  minPrice?: number;
  maxPrice?: number;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  status: string;
};

export type DashboardMetrics = {
  monthRevenue: number;
  monthOrderCount: number;
  totalDue: number;
  availableInventorySqm: number;
  recentOrders: Order[];
  topMarble: Array<{ name: string; pct: string; width: number; count: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number; target: number }>;
};

export type FinanceOverview = {
  revenueTotal: number;
  materialCost: number;
  netProfit: number;
  profitMargin: string;
  monthlyFlow: Array<{ month: string; revenue: number; expenses: number }>;
  expenseSummary: Array<{
    label: string;
    amount: number;
    width: string;
    color: string;
  }>;
  salaryRows: Array<{
    id: string;
    name: string;
    role: string;
    salary: number;
    status: string;
  }>;
};

function queryString(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  getOrders: () => request<Order[]>('/orders'),
  getOrder: (orderNumber: string) =>
    request<{ order: Order; deposits: Deposit[] }>(`/orders/${orderNumber}`),
  getCustomers: () => request<Customer[]>('/customers'),
  createCustomer: (body: Omit<Customer, 'id'>) =>
    request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateCustomer: (id: string, body: Partial<Omit<Customer, 'id'>>) =>
    request<Customer>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteCustomer: (id: string) =>
    request<void>(`/customers/${id}`, { method: 'DELETE' }),
  createOrder: (body: {
    customerId: string;
    lines: OrderCutLine[];
    edgeRoundingPricePerM?: number;
    edgeRoundingMeters?: number[];
  }) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  addDeposit: (
    orderNumber: string,
    body: { amount: number; method: string },
  ) =>
    request<Deposit>(`/orders/${orderNumber}/deposits`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateOrder: (
    orderNumber: string,
    body: { status?: OrderStatus; orderNumber?: string },
  ) =>
    request<Order>(`/orders/${orderNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteOrder: (orderNumber: string) =>
    request<void>(`/orders/${orderNumber}`, { method: 'DELETE' }),
  uploadMarbleImage: async (file: File) => {
    const { uploadMarbleImage } = await import('@/lib/marble-image');
    return uploadMarbleImage(file);
  },
  getSuppliers: () => request<Supplier[]>('/suppliers'),
  createSupplier: (body: Omit<Supplier, 'id'>) =>
    request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getMarbleKinds: (query: MarbleKindQuery = {}) =>
    request<MarbleKind[]>(
      `/marble-kinds${queryString({
        visible: query.visible === 'all' ? undefined : query.visible,
        supplierId: query.supplierId,
        sort: query.sort,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
      })}`,
    ),
  getMarbleKind: (id: string) =>
    request<{ kind: MarbleKind; slices: MarbleSlice[] }>(`/marble-kinds/${id}`),
  createMarbleKind: (body: Partial<MarbleKind>) =>
    request<MarbleKind>('/marble-kinds', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateMarbleKind: (id: string, body: Partial<MarbleKind>) =>
    request<MarbleKind>(`/marble-kinds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteMarbleKind: (id: string) =>
    request<void>(`/marble-kinds/${id}`, { method: 'DELETE' }),
  addMarbleSlice: (
    kindId: string,
    body: {
      supplierId: string;
      lengthM: number;
      widthM: number;
      thicknessM: number;
      sliceCount: number;
      purchasePerSqm: number;
      sellingPerSqm: number;
      wastes?: SliceWasteRect[];
    },
  ) =>
    request<MarbleSlice>(`/marble-kinds/${kindId}/slices`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateMarbleSlice: (
    sliceId: string,
    body: Partial<{
      wastes: SliceWasteRect[];
      sliceCount: number;
      lengthM: number;
      widthM: number;
      thicknessM: number;
      purchasePerSqm: number;
      sellingPerSqm: number;
      supplierId: string;
    }>,
  ) =>
    request<MarbleSlice>(`/marble-kinds/slices/${sliceId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteMarbleSlice: (sliceId: string) =>
    request<void>(`/marble-kinds/slices/${sliceId}`, { method: 'DELETE' }),
  getStaff: () => request<StaffMember[]>('/staff'),
  createStaff: (body: Omit<StaffMember, 'id'>) =>
    request<StaffMember>('/staff', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateStaff: (id: string, body: Partial<StaffMember>) =>
    request<StaffMember>(`/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteStaff: (id: string) =>
    request<void>(`/staff/${id}`, { method: 'DELETE' }),
  getDashboardMetrics: () =>
    request<DashboardMetrics>('/dashboard/metrics'),
  getFinanceOverview: () => request<FinanceOverview>('/finance/overview'),
};
