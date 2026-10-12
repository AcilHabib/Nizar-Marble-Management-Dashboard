import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { prisma } from "@workspace/db";
import { paidTotal, serializeStaff } from "../lib/serializers";
import { sliceRowMetrics } from "../lib/slice-math";
import { actorFromRequest } from "../middleware/staff-actor";

const FINANCE_CODE = "nezar123";

const router: IRouter = Router();

function requireFinanceCode(req: Request, res: Response, next: NextFunction) {
  if (req.get("X-Finance-Code") !== FINANCE_CODE) {
    res.status(401).json({ error: "invalid_code" });
    return;
  }
  next();
}

function nonNegativeInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > max) return null;
  return text;
}

router.post("/unlock", (req, res) => {
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (code !== FINANCE_CODE) {
    res.status(401).json({ error: "invalid_code" });
    return;
  }
  res.json({ ok: true });
});

router.use(requireFinanceCode);

router.get("/ledger", async (_req, res, next) => {
  try {
    const [orders, slices, charges, staff, salaries] = await Promise.all([
      prisma.order.findMany({
        include: { deposits: true },
        orderBy: { orderDate: "desc" },
      }),
      prisma.marbleSlice.findMany({
        include: { kind: true, supplier: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.charge.findMany({ orderBy: { chargeDate: "desc" } }),
      prisma.staffMember.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.salaryEntry.findMany({ orderBy: { month: "desc" } }),
    ]);

    res.json({
      sales: orders.map((order) => {
        const paid = paidTotal(order.deposits);
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          customer: order.customer,
          kind: order.kind,
          orderDate: order.orderDate.toISOString(),
          total: order.total,
          paid,
          remaining: Math.max(order.total - paid, 0),
          status: order.status,
        };
      }),
      purchases: slices.map((slice) => {
        const metrics = sliceRowMetrics(slice);
        return {
          id: slice.id,
          purchasedAt: slice.createdAt.toISOString(),
          kind: slice.kind.name,
          supplier: slice.supplier.name,
          dimensions: `${slice.lengthM} × ${slice.widthM} × ${slice.thicknessM} m`,
          sliceCount: slice.sliceCount,
          areaSqm: metrics.totalAreaSqm,
          amount: metrics.purchaseTotal,
        };
      }),
      charges: charges.map((charge) => ({
        id: charge.id,
        title: charge.title,
        category: charge.category,
        amount: charge.amount,
        chargeDate: charge.chargeDate.toISOString(),
        note: charge.note,
        recordedBy: charge.recordedBy,
      })),
      staff: staff.map(serializeStaff),
      salaries: salaries.map((row) => ({
        id: row.id,
        staffId: row.staffId,
        month: row.month,
        amount: row.amount,
        paid: row.paid,
        note: row.note,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/charges", async (req, res, next) => {
  try {
    const title = cleanText(req.body?.title, 120);
    const category = cleanText(req.body?.category, 80);
    const amount = nonNegativeInt(req.body?.amount);
    const chargeDate = parseDay(req.body?.chargeDate);
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 400) : "";
    if (!title || !category || amount === null || !chargeDate) {
      res.status(400).json({ error: "invalid_charge" });
      return;
    }
    const charge = await prisma.charge.create({
      data: {
        title,
        category,
        amount,
        chargeDate,
        note,
        recordedBy: actorFromRequest(req).staffName,
      },
    });
    res.status(201).json({
      id: charge.id,
      title: charge.title,
      category: charge.category,
      amount: charge.amount,
      chargeDate: charge.chargeDate.toISOString(),
      note: charge.note,
      recordedBy: charge.recordedBy,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/charges/:id", async (req, res, next) => {
  try {
    const existing = await prisma.charge.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const title = cleanText(req.body?.title, 120);
    const category = cleanText(req.body?.category, 80);
    const amount = nonNegativeInt(req.body?.amount);
    const chargeDate = parseDay(req.body?.chargeDate);
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 400) : "";
    if (!title || !category || amount === null || !chargeDate) {
      res.status(400).json({ error: "invalid_charge" });
      return;
    }
    const charge = await prisma.charge.update({
      where: { id: existing.id },
      data: { title, category, amount, chargeDate, note },
    });
    res.json({
      id: charge.id,
      title: charge.title,
      category: charge.category,
      amount: charge.amount,
      chargeDate: charge.chargeDate.toISOString(),
      note: charge.note,
      recordedBy: charge.recordedBy,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/charges/:id", async (req, res, next) => {
  try {
    const existing = await prisma.charge.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    await prisma.charge.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.put("/salaries", async (req, res, next) => {
  try {
    const staffId = typeof req.body?.staffId === "string" ? req.body.staffId : "";
    const month = typeof req.body?.month === "string" ? req.body.month : "";
    const amount = nonNegativeInt(req.body?.amount);
    const paid = req.body?.paid === true;
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 400) : "";
    if (!/^[a-f0-9]{24}$/i.test(staffId) || !/^\d{4}-\d{2}$/.test(month) || amount === null) {
      res.status(400).json({ error: "invalid_salary" });
      return;
    }
    const member = await prisma.staffMember.findUnique({ where: { id: staffId } });
    if (!member) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const row = await prisma.salaryEntry.upsert({
      where: { staffId_month: { staffId, month } },
      create: { staffId, month, amount, paid, note },
      update: { amount, paid, note },
    });
    res.json({
      id: row.id,
      staffId: row.staffId,
      month: row.month,
      amount: row.amount,
      paid: row.paid,
      note: row.note,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/salaries/:id", async (req, res, next) => {
  try {
    const existing = await prisma.salaryEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    await prisma.salaryEntry.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
