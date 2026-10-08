import { Router, type IRouter } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "@workspace/db";
import { cutFitsOnSlice, sliceAvailableCount } from "../lib/slice-availability";
import {
  consumeReservations,
  releaseReservations,
  reservationOf,
  SliceStockError,
  wholeSliceReservation,
} from "../lib/slice-reservation";
import {
  serializeDeposit,
  serializeOrder,
  paidTotal,
} from "../lib/serializers";
import { nextOrderNumber, resolveUniqueOrderNumber } from "../lib/order-number";
import { isOrderStatus, normalizeOrderStatus } from "../lib/order-status";
import { recordStaffAction } from "../lib/staff-action";
import { actorFromRequest } from "../middleware/staff-actor";
import {
  computeEdgeRoundingTotal,
  formatOrderEdgesSummary,
  normalizeEdgeMeters,
} from "../lib/edge-rounding";

const router: IRouter = Router();

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
  sliceId?: string;
  kindId?: string;
  cutLengthM: number;
  cutWidthM: number;
  thicknessM?: number;
  qty: number;
  sellingPerSqm?: number | null;
};

router.post("/", async (req, res, next) => {
  try {
    const actor = actorFromRequest(req);
    const {
      customerId,
      status = "مؤكدة",
      lines = [],
      edgeRoundingPrice,
      edgeRoundingPricePerM = 0,
      edgeRoundingMeters = [],
    } = req.body as {
      customerId?: string;
      status?: string;
      lines?: OrderLineInput[];
      edgeRoundingPrice?: number;
      edgeRoundingPricePerM?: number;
      edgeRoundingMeters?: number[];
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
          sliceId: String(l.sliceId ?? "").trim(),
          kindId: String(l.kindId ?? "").trim(),
          cutLengthM: Number(l.cutLengthM),
          cutWidthM: Number(l.cutWidthM),
          thicknessM: Number(l.thicknessM),
          qty: Math.max(1, Math.round(Number(l.qty) || 1)),
          sellingPerSqm:
            l.sellingPerSqm === undefined || l.sellingPerSqm === null
              ? undefined
              : Number(l.sellingPerSqm),
        }))
      : [];

    if (normalizedLines.length === 0) {
      res.status(400).json({ error: "At least one cut line is required" });
      return;
    }

    for (const line of normalizedLines) {
      if (
        !Number.isFinite(line.cutLengthM) ||
        !Number.isFinite(line.cutWidthM) ||
        line.cutLengthM <= 0 ||
        line.cutWidthM <= 0
      ) {
        res.status(400).json({ error: "Invalid cut dimensions" });
        return;
      }
      if (!line.sliceId && !line.kindId) {
        res.status(400).json({ error: "Marble kind is required" });
        return;
      }
      if (
        !line.sliceId &&
        (!Number.isFinite(line.thicknessM) || line.thicknessM <= 0)
      ) {
        res.status(400).json({ error: "Thickness is required" });
        return;
      }
      if (
        line.sellingPerSqm !== undefined &&
        (!Number.isFinite(line.sellingPerSqm) || line.sellingPerSqm < 0)
      ) {
        res.status(400).json({ error: "Invalid unit price" });
        return;
      }
      if (!line.sliceId && line.sellingPerSqm === undefined) {
        res.status(400).json({
          error: "Unit price is required when the order does not use a slice",
        });
        return;
      }
    }

    const pricePerM = Math.max(0, Math.round(Number(edgeRoundingPricePerM) || 0));
    const meters = normalizeEdgeMeters(edgeRoundingMeters);
    let edgesPrice = computeEdgeRoundingTotal(pricePerM, meters);
    if (
      edgesPrice === 0 &&
      edgeRoundingPrice !== undefined &&
      edgeRoundingPrice !== null
    ) {
      edgesPrice = Math.max(0, Math.round(Number(edgeRoundingPrice) || 0));
    }

    const order = await prisma.$transaction(async (tx) => {
      const slicesNeeded = new Map<string, number>();
      for (const line of normalizedLines) {
        if (!line.sliceId) continue;
        slicesNeeded.set(
          line.sliceId,
          (slicesNeeded.get(line.sliceId) ?? 0) + line.qty,
        );
      }

      const sliceCache = new Map<
        string,
        Prisma.MarbleSliceGetPayload<{ include: { kind: true } }>
      >();

      for (const [sliceId, needed] of slicesNeeded) {
        const slice = await tx.marbleSlice.findUnique({
          where: { id: sliceId },
          include: { kind: true },
        });
        if (!slice) {
          throw new Error(`Slice not found: ${sliceId}`);
        }
        sliceCache.set(sliceId, slice);
        const available = sliceAvailableCount(slice);
        if (needed > available) {
          throw new SliceStockError(
            `Not enough whole slices for ${slice.kind.name}. Available ${available}, requested ${needed}.`,
          );
        }
      }

      for (const line of normalizedLines) {
        if (!line.sliceId) continue;
        const slice = sliceCache.get(line.sliceId)!;
        if (!cutFitsOnSlice(line.cutLengthM, line.cutWidthM, slice)) {
          const err = new Error(
            `Cut does not fit on slice ${slice.kind.name} (${formatDims(slice.lengthM, slice.widthM, slice.thicknessM)})`,
          );
          (err as Error & { statusCode?: number }).statusCode = 400;
          throw err;
        }
      }

      const kindCache = new Map<string, { name: string }>();
      for (const line of normalizedLines) {
        if (line.sliceId || kindCache.has(line.kindId)) continue;
        const kind = await tx.marbleKind.findUnique({
          where: { id: line.kindId },
        });
        if (!kind) {
          const err = new Error("Marble kind not found");
          (err as Error & { statusCode?: number }).statusCode = 400;
          throw err;
        }
        kindCache.set(line.kindId, kind);
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
        inventorySlices: number;
        inventoryAreaSqm: number;
      }> = [];

      let linesSubtotal = 0;

      for (const line of normalizedLines) {
        const area = line.cutLengthM * line.cutWidthM * line.qty;
        if (!line.sliceId) {
          const kind = kindCache.get(line.kindId)!;
          const unitPrice = Math.max(0, Math.round(line.sellingPerSqm ?? 0));
          const lineTotal = Math.round(area * unitPrice);
          linesSubtotal += lineTotal;
          pieces.push({
            kind: kind.name,
            dims: formatDims(line.cutLengthM, line.cutWidthM, line.thicknessM),
            thickness: `${line.thicknessM} m`,
            edges: "—",
            qty: line.qty,
            price: unitPrice,
            sliceId: "",
            cutLengthM: line.cutLengthM,
            cutWidthM: line.cutWidthM,
            lineTotal,
            sellingPerSqm: unitPrice,
            inventorySlices: 0,
            inventoryAreaSqm: 0,
          });
          continue;
        }
        const slice = sliceCache.get(line.sliceId)!;
        const unitPrice =
          line.sellingPerSqm === undefined
            ? slice.sellingPerSqm
            : Math.max(0, Math.round(line.sellingPerSqm));
        const lineTotal = Math.round(area * unitPrice);
        linesSubtotal += lineTotal;
        const reserved = wholeSliceReservation(slice, line.qty);
        pieces.push({
          kind: slice.kind.name,
          dims: formatDims(line.cutLengthM, line.cutWidthM, slice.thicknessM),
          thickness: `${slice.thicknessM} m`,
          edges: "—",
          qty: line.qty,
          price: unitPrice,
          sliceId: line.sliceId,
          cutLengthM: line.cutLengthM,
          cutWidthM: line.cutWidthM,
          lineTotal,
          sellingPerSqm: unitPrice,
          inventorySlices: reserved.inventorySlices,
          inventoryAreaSqm: reserved.inventoryAreaSqm,
        });
      }

      await consumeReservations(tx, pieces);

      const total = linesSubtotal + edgesPrice;
      const kind =
        [...new Set(pieces.map((p) => p.kind))].filter(Boolean).join("، ") ||
        "—";
      const orderNumber = await nextOrderNumber(tx);

      return tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customer: customer.fullName,
          kind,
          total,
          linesSubtotal,
          edgeRoundingPrice: edgesPrice,
          edgeRoundingPricePerM: edgesPrice > 0 ? pricePerM : 0,
          edgeRoundingMeters: edgesPrice > 0 ? meters : [],
          status: normalizeOrderStatus(String(status)),
          staff: actor.staffName,
          inventoryDisposition: "reserved",
          pieces,
          dimensions: pieces[0]?.dims,
          thickness: pieces[0]?.thickness,
          edges:
            edgesPrice > 0
              ? formatOrderEdgesSummary(pricePerM, meters, edgesPrice)
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
    if (statusCode && err instanceof Error) {
      res.status(statusCode).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message.startsWith("Slice not found")) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof SliceStockError) {
      res.status(409).json({ error: err.message });
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

    const { amount, method, depositKind = "payment" } = req.body as {
      amount?: number;
      method?: string;
      depositKind?: string;
    };
    if (!amount || !method) {
      res.status(400).json({ error: "amount and method are required" });
      return;
    }

    const kind = depositKind === "refund" ? "refund" : "payment";
    const value = Math.abs(Math.round(Number(amount)));
    if (value <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    if (kind === "refund") {
      if (normalizeOrderStatus(order.status) !== "ملغاة") {
        res.status(400).json({
          error: "Refunds are only allowed for cancelled orders",
        });
        return;
      }
      const existing = await prisma.deposit.findMany({
        where: { orderId: order.id },
      });
      const paid = paidTotal(existing);
      if (value > paid) {
        res.status(400).json({ error: "Refund exceeds amount paid" });
        return;
      }
    }

    const actor = actorFromRequest(req);
    const deposit = await prisma.deposit.create({
      data: {
        orderId: order.id,
        amount: value,
        method: String(method),
        depositKind: kind,
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
    res.status(201).json(serializeDeposit(deposit));
  } catch (err) {
    next(err);
  }
});

router.patch("/:orderNumber", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
    });
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const body = req.body as {
      status?: string;
      orderNumber?: string;
      sliceDisposition?: string;
    };
    const data: {
      status?: string;
      orderNumber?: string;
      inventoryDisposition?: string;
    } = {};

    if (body.status !== undefined) {
      const normalized = normalizeOrderStatus(String(body.status));
      if (!isOrderStatus(normalized)) {
        res.status(400).json({ error: "Invalid order status" });
        return;
      }
      data.status = normalized;
    }

    if (body.orderNumber !== undefined) {
      const desired = String(body.orderNumber).trim();
      data.orderNumber = await resolveUniqueOrderNumber(
        prisma,
        desired,
        order.id,
      );
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const previous = normalizeOrderStatus(order.status);
    const currentDisposition = order.inventoryDisposition || "reserved";
    let inventoryOp: "release" | "consume" | null = null;

    const holdsSlices = order.pieces.some((piece) => reservationOf(piece));

    if (data.status === "ملغاة" && previous !== "ملغاة" && holdsSlices) {
      const choice = body.sliceDisposition;
      if (choice !== "return" && choice !== "waste") {
        res.status(400).json({
          error:
            "Choose whether the slice returns to inventory or is wasted",
        });
        return;
      }
      if (choice === "return") {
        if (currentDisposition !== "returned") inventoryOp = "release";
        data.inventoryDisposition = "returned";
      } else {
        if (currentDisposition === "returned") inventoryOp = "consume";
        data.inventoryDisposition = "wasted";
      }
    } else if (
      data.status !== undefined &&
      data.status !== "ملغاة" &&
      previous === "ملغاة" &&
      currentDisposition === "returned"
    ) {
      inventoryOp = "consume";
      data.inventoryDisposition = "reserved";
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (inventoryOp === "release") {
        await releaseReservations(tx, order.pieces);
      }
      if (inventoryOp === "consume") {
        await consumeReservations(tx, order.pieces);
      }
      return tx.order.update({
        where: { id: order.id },
        data,
        include: { deposits: true },
      });
    });

    await recordStaffAction(
      actorFromRequest(req),
      "order.update",
      `${updated.orderNumber}`,
    );

    res.json(serializeOrder(updated));
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if ((statusCode || err instanceof SliceStockError) && err instanceof Error) {
      res.status(statusCode || 409).json({ error: err.message });
      return;
    }
    next(err);
  }
});

router.delete("/:orderNumber", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
    });
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      if ((order.inventoryDisposition || "reserved") === "reserved") {
        await releaseReservations(tx, order.pieces);
      }
      await tx.order.delete({ where: { id: order.id } });
    });

    await recordStaffAction(
      actorFromRequest(req),
      "order.delete",
      order.orderNumber,
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
