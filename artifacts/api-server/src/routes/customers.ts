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

export default router;
