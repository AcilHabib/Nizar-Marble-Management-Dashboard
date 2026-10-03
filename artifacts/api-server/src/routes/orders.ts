import { Router, type IRouter } from "express";
import { prisma } from "@workspace/db";
import {
  cutAreaSqm,
  sliceAvailableNetAreaSqm,
} from "../lib/slice-availability";
import {
  serializeDeposit,
  serializeOrder,
  paidTotal,
} from "../lib/serializers";
import { recordStaffAction } from "../lib/staff-action";
import { actorFromRequest } from "../middleware/staff-actor";

const router: IRouter = Router();

async function nextOrderNumber(): Promise<string> {
  const latest = await prisma.order.findFirst({
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  if (!latest?.orderNumber?.startsWith("NZ-")) {
    return "NZ-2481";
  }
  const num = Number(latest.orderNumber.replace("NZ-", ""));
  return `NZ-${Number.isFinite(num) ? num + 1 : 2481}`;
}

function formatDims(cutLengthM: number, cutWidthM: number, thicknessM: number) {
  return `${cutLengthM} × ${cutWidthM} × ${thicknessM} m`;
}

router.get("/", async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: { deposits: true },
      orderBy: { orderDate: "desc" },
    });
    res.json(orders.map(serializeOrder));
  } catch (err) {
    next(err);
  }
});

router.get("/:orderNumber", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      include: { deposits: { orderBy: { depositDate: "desc" } } },
    });
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({
      order: serializeOrder(order),
      deposits: order.deposits.map(serializeDeposit),
    });
  } catch (err) {
    next(err);
  }
});

type OrderLineInput = {
  sliceId: string;
  cutLengthM: number;
  cutWidthM: number;
  qty: number;
};

router.post("/", async (req, res, next) => {
  try {
    const actor = actorFromRequest(req);
    const {
      customerId,
      status = "مؤكد",
      lines = [],
      edgeRoundingPrice = 0,
    } = req.body as {
      customerId?: string;
      status?: string;
      lines?: OrderLineInput[];
      edgeRoundingPrice?: number;
    };

    if (!customerId || typeof customerId !== "string") {
      res.status(400).json({ error: "customerId is required" });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      res.status(400).json({ error: "Customer not found" });
      return;
    }

    const normalizedLines = Array.isArray(lines)
      ? lines.map((l) => ({
          sliceId: String(l.sliceId ?? ""),
          cutLengthM: Number(l.cutLengthM),
          cutWidthM: Number(l.cutWidthM),
          qty: Math.max(1, Number(l.qty) || 1),
        }))
      : [];

    if (normalizedLines.length === 0) {
      res.status(400).json({ error: "At least one cut line is required" });
      return;
    }

    for (const line of normalizedLines) {
      if (
        !line.sliceId ||
        !Number.isFinite(line.cutLengthM) ||
        !Number.isFinite(line.cutWidthM) ||
        line.cutLengthM <= 0 ||
        line.cutWidthM <= 0
      ) {
        res.status(400).json({ error: "Invalid cut dimensions or slice" });
        return;
      }
    }

    const edgesPrice = Math.max(0, Math.round(Number(edgeRoundingPrice) || 0));

    const order = await prisma.$transaction(async (tx) => {
      const usageBySlice = new Map<string, number>();
      for (const line of normalizedLines) {
        const area = cutAreaSqm(line.cutLengthM, line.cutWidthM, line.qty);
        usageBySlice.set(
          line.sliceId,
          (usageBySlice.get(line.sliceId) ?? 0) + area,
        );
      }

      const sliceCache = new Map<
        string,
        Awaited<ReturnType<typeof tx.marbleSlice.findUnique>>
      >();

      for (const [sliceId, neededArea] of usageBySlice) {
        const slice = await tx.marbleSlice.findUnique({
          where: { id: sliceId },
          include: { kind: true },
        });
        if (!slice) {
          throw new Error(`Slice not found: ${sliceId}`);
        }
        sliceCache.set(sliceId, slice);
        const available = sliceAvailableNetAreaSqm(slice);
        if (neededArea > available + 1e-6) {
          const err = new Error(
            `Insufficient area on slice ${slice.kind.name} (${formatDims(slice.lengthM, slice.widthM, slice.thicknessM)}). Available ${available.toFixed(2)} m², requested ${neededArea.toFixed(2)} m²`,
          );
          (err as Error & { statusCode?: number }).statusCode = 409;
          throw err;
        }
      }

      const pieces: Array<{
        kind: string;
        dims: string;
        thickness: string;
        edges: string;
        qty: number;
        price: number;
        sliceId: string;
        cutLengthM: number;
        cutWidthM: number;
        lineTotal: number;
        sellingPerSqm: number;
      }> = [];

      let linesSubtotal = 0;

      for (const line of normalizedLines) {
        const slice = sliceCache.get(line.sliceId)!;
        const area = cutAreaSqm(line.cutLengthM, line.cutWidthM, line.qty);
        const lineTotal = Math.round(area * slice.sellingPerSqm);
        linesSubtotal += lineTotal;
        pieces.push({
          kind: slice.kind.name,
          dims: formatDims(line.cutLengthM, line.cutWidthM, slice.thicknessM),
          thickness: `${slice.thicknessM} m`,
          edges: "—",
          qty: line.qty,
          price: slice.sellingPerSqm,
          sliceId: line.sliceId,
          cutLengthM: line.cutLengthM,
          cutWidthM: line.cutWidthM,
          lineTotal,
          sellingPerSqm: slice.sellingPerSqm,
        });
      }

      for (const [sliceId, neededArea] of usageBySlice) {
        await tx.marbleSlice.update({
          where: { id: sliceId },
          data: {
            consumedNetAreaSqm: {
              increment: neededArea,
            },
          },
        });
      }

      const total = linesSubtotal + edgesPrice;
      const kind =
        [...new Set(pieces.map((p) => p.kind))].filter(Boolean).join("، ") ||
        "—";
      const orderNumber = await nextOrderNumber();

      return tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customer: customer.fullName,
          kind,
          total,
          linesSubtotal,
          edgeRoundingPrice: edgesPrice,
          status,
          staff: actor.staffName,
          pieces,
          dimensions: pieces[0]?.dims,
          thickness: pieces[0]?.thickness,
          edges:
            edgesPrice > 0
              ? `${edgesPrice} د.ج`
              : pieces[0]?.edges,
        },
        include: { deposits: true },
      });
    });

    await recordStaffAction(
      actor,
      "order.create",
      `${order.orderNumber} · ${customer.fullName}`,
    );

    res.status(201).json(serializeOrder(order));
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 409 && err instanceof Error) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message.startsWith("Slice not found")) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

router.post("/:orderNumber/deposits", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
    });
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const { amount, method } = req.body as { amount?: number; method?: string };
    if (!amount || !method) {
      res.status(400).json({ error: "amount and method are required" });
      return;
    }

    const actor = actorFromRequest(req);
    const deposit = await prisma.deposit.create({
      data: {
        orderId: order.id,
        amount: Number(amount),
        method: String(method),
        recordedBy: actor.staffName,
      },
    });

    await recordStaffAction(
      actor,
      "deposit.create",
      `${order.orderNumber} · ${amount}`,
    );

    const deposits = await prisma.deposit.findMany({
      where: { orderId: order.id },
    });
    const paid = paidTotal(deposits);
    if (paid >= order.total && order.status !== "تم التسليم") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "قيد التنفيذ" },
      });
    }

    res.status(201).json(serializeDeposit(deposit));
  } catch (err) {
    next(err);
  }
});

export default router;
