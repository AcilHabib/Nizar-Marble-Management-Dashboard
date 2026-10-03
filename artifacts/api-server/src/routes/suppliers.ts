import { Router, type IRouter } from "express";
import { prisma } from "@workspace/db";
import { serializeSupplier } from "../lib/inventory-serializers";
import { recordStaffAction } from "../lib/staff-action";
import { actorFromRequest } from "../middleware/staff-actor";

const router: IRouter = Router();

router.get("/", async (_req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });
    res.json(suppliers.map(serializeSupplier));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, phone, address } = req.body as Record<string, unknown>;
    if (
      typeof name !== "string" ||
      typeof phone !== "string" ||
      typeof address !== "string"
    ) {
      res.status(400).json({ error: "name, phone, and address are required" });
      return;
    }
    const supplier = await prisma.supplier.create({
      data: { name: name.trim(), phone: phone.trim(), address: address.trim() },
    });
    await recordStaffAction(
      actorFromRequest(req),
      "supplier.create",
      supplier.name,
    );
    res.status(201).json(serializeSupplier(supplier));
  } catch (err) {
    next(err);
  }
});

export default router;
