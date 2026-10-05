import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "order">;

export function formatOrderNumberPrefix(date = new Date()): string {
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}-`;
}

function parseCounter(orderNumber: string, prefix: string): number | null {
  if (!orderNumber.startsWith(prefix)) return null;
  const rest = orderNumber.slice(prefix.length);
  const m = rest.match(/^(\d{2})(?:\s*\(\d+\))?$/);
  if (!m) return null;
  return Number(m[1]);
}

export async function nextOrderNumber(
  db: Db,
  date = new Date(),
): Promise<string> {
  const prefix = formatOrderNumberPrefix(date);
  const orders = await db.order.findMany({
    where: { orderNumber: { startsWith: prefix } },
    select: { orderNumber: true },
  });
  let max = 0;
  for (const o of orders) {
    const n = parseCounter(o.orderNumber, prefix);
    if (n !== null && n > max) max = n;
  }
  const next = max + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

/** If `desired` is taken, append ` (n)` where n counts existing duplicates of that base code. */
export async function resolveUniqueOrderNumber(
  db: Db,
  desired: string,
  excludeOrderId?: string,
): Promise<string> {
  const base = desired.trim().replace(/\s*\(\d+\)\s*$/, "").trim();
  if (!base) {
    throw new Error("Order number is required");
  }

  const existing = await db.order.findMany({
    where: {
      OR: [{ orderNumber: base }, { orderNumber: { startsWith: `${base} (` } }],
      ...(excludeOrderId ? { NOT: { id: excludeOrderId } } : {}),
    },
    select: { orderNumber: true },
  });

  const taken = new Set(existing.map((o) => o.orderNumber));
  if (!taken.has(base)) return base;

  let n = 1;
  while (taken.has(`${base} (${n})`)) n += 1;
  return `${base} (${n})`;
}
