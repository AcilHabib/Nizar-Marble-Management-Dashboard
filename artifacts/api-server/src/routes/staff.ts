import { Router, type IRouter } from "express";
import { prisma } from "@workspace/db";
import { serializeStaff } from "../lib/serializers";
import { recordStaffAction } from "../lib/staff-action";
import { actorFromRequest } from "../middleware/staff-actor";

const router: IRouter = Router();

router.get("/", async (_req, res, next) => {
  try {
    const staff = await prisma.staffMember.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json(staff.map(serializeStaff));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, role, email, status = "نشط" } = req.body as Record<
      string,
      unknown
    >;
    if (
      typeof name !== "string" ||
      typeof role !== "string" ||
      typeof email !== "string"
    ) {
      res.status(400).json({ error: "name, role, and email are required" });
      return;
    }

    const member = await prisma.staffMember.create({
      data: {
        name,
        role,
        email,
        status: typeof status === "string" ? status : "نشط",
      },
    });
    await recordStaffAction(
      actorFromRequest(req),
      "staff.create",
      member.name,
    );
    res.status(201).json(serializeStaff(member));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const member = await prisma.staffMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(serializeStaff(member));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.staffMember.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
