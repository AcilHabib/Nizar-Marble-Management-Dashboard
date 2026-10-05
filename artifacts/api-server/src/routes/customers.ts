import { Router, type IRouter } from "express";
import { prisma } from "@workspace/db";
import { recordStaffAction } from "../lib/staff-action";
import { actorFromRequest } from "../middleware/staff-actor";

const router: IRouter = Router();

router.get("/", async (_req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { fullName: "asc" },
    });
    res.json(
      customers.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        address: c.address,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { fullName, phone, address } = req.body as Record<string, unknown>;
    if (typeof fullName !== "string" || !fullName.trim()) {
      res.status(400).json({ error: "fullName is required" });
      return;
    }
    const customer = await prisma.customer.create({
      data: {
        fullName: fullName.trim(),
        phone: typeof phone === "string" ? phone.trim() : "",
        address: typeof address === "string" ? address.trim() : "",
      },
    });
    await recordStaffAction(
      actorFromRequest(req),
      "customer.create",
      customer.fullName,
    );
    res.status(201).json({
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      address: customer.address,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const data: { fullName?: string; phone?: string; address?: string } = {};
    if (typeof body.fullName === "string" && body.fullName.trim()) {
      data.fullName = body.fullName.trim();
    }
    if (typeof body.phone === "string") data.phone = body.phone.trim();
    if (typeof body.address === "string") data.address = body.address.trim();

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const customer = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: req.params.id },
        data,
      });
      if (data.fullName) {
        await tx.order.updateMany({
          where: { customerId: updated.id },
          data: { customer: data.fullName },
        });
      }
      return updated;
    });

    await recordStaffAction(
      actorFromRequest(req),
      "customer.update",
      customer.fullName,
    );

    res.json({
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      address: customer.address,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { customerId: req.params.id },
        data: { customerId: null },
      });
      await tx.customer.delete({ where: { id: req.params.id } });
    });

    await recordStaffAction(
      actorFromRequest(req),
      "customer.delete",
      existing.fullName,
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
