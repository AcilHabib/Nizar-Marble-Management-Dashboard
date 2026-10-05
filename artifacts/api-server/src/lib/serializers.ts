import type { Deposit, Order, StaffMember } from "@workspace/db";
import { normalizeOrderStatus } from "./order-status";

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function paidTotal(deposits: Pick<Deposit, "amount">[]): number {
  return deposits.reduce((sum, d) => sum + d.amount, 0);
}

export type OrderDto = {
  id: string;
  orderNumber: string;
  customer: string;
  date: string;
  orderDate: string;
  kind: string;
  total: number;
  paid: number;
  remaining: number;
  status: string;
  staff: string;
  dimensions?: string | null;
  thickness?: string | null;
  edges?: string | null;
  linesSubtotal: number;
  edgeRoundingPrice: number;
  pieces: Order["pieces"];
};

export function serializeOrder(
  order: Order & { deposits: Deposit[] },
): OrderDto {
  const paid = paidTotal(order.deposits);
  return {
    id: order.orderNumber,
    orderNumber: order.orderNumber,
    customer: order.customer,
    date: formatDisplayDate(order.orderDate),
    orderDate: order.orderDate.toISOString(),
    kind: order.kind,
    total: order.total,
    paid,
    remaining: Math.max(order.total - paid, 0),
    status: normalizeOrderStatus(order.status),
    staff: order.staff,
    dimensions: order.dimensions,
    thickness: order.thickness,
    edges: order.edges,
    linesSubtotal: order.linesSubtotal ?? order.total,
    edgeRoundingPrice: order.edgeRoundingPrice ?? 0,
    pieces: order.pieces,
  };
}

export type DepositDto = {
  id: string;
  amount: number;
  method: string;
  recordedBy: string;
  date: string;
  depositDate: string;
};

export function serializeDeposit(deposit: Deposit): DepositDto {
  return {
    id: deposit.id,
    amount: deposit.amount,
    method: deposit.method,
    recordedBy: deposit.recordedBy ?? "",
    date: formatDisplayDate(deposit.depositDate),
    depositDate: deposit.depositDate.toISOString(),
  };
}

export type StaffDto = {
  id: string;
  name: string;
  role: string;
  email: string;
  status: string;
};

export function serializeStaff(member: StaffMember): StaffDto {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    email: member.email,
    status: member.status,
  };
}
