import { Router, type IRouter } from "express";
import { prisma } from "@workspace/db";
import {
  parseWastes,
  serializeKind,
  serializeSlice,
} from "../lib/inventory-serializers";
import { dimensionsKey, wasteAreaSqm } from "../lib/slice-math";
import { recordStaffAction } from "../lib/staff-action";
import { actorFromRequest } from "../middleware/staff-actor";

const router: IRouter = Router();
const sliceInclude = { supplier: true } as const;

async function loadKind(id: string) {
  return prisma.marbleKind.findUnique({
    where: { id },
    include: { slices: { include: sliceInclude, orderBy: { createdAt: "desc" } } },
  });
}

router.get("/", async (req, res, next) => {
  try {
    const visible = req.query.visible as string | undefined;
    const supplierId = req.query.supplierId as string | undefined;
    const sort = (req.query.sort as string | undefined) ?? "newest";
    const minPrice = req.query.minPrice
      ? Number(req.query.minPrice)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? Number(req.query.maxPrice)
      : undefined;

    const kinds = await prisma.marbleKind.findMany({
      include: { slices: { include: sliceInclude } },
      orderBy:
        sort === "oldest"
          ? { createdAt: "asc" }
          : sort === "name"
            ? { name: "asc" }
            : { createdAt: "desc" },
    });

    let result = kinds.map(serializeKind);

    if (visible === "true") {
      result = result.filter((k) => k.visible);
    } else if (visible === "false") {
      result = result.filter((k) => !k.visible);
    }

    if (supplierId) {
      result = result.filter((k) => k.supplierIds.includes(supplierId));
    }

    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      result = result.filter((k) => k.totalPurchaseValue >= minPrice);
    }
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      result = result.filter((k) => k.totalPurchaseValue <= maxPrice);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const kind = await loadKind(req.params.id);
    if (!kind) {
      res.status(404).json({ error: "Marble kind not found" });
      return;
    }
    res.json({
      kind: serializeKind(kind),
      slices: kind.slices.map(serializeSlice),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, color = "", imageUrl = "", visible = true, tone = "cream" } =
      req.body as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const kind = await prisma.marbleKind.create({
      data: {
        name: name.trim(),
        color: typeof color === "string" ? color : "",
        imageUrl: typeof imageUrl === "string" ? imageUrl : "",
        visible: Boolean(visible),
        tone: typeof tone === "string" ? tone : "cream",
      },
      include: { slices: { include: sliceInclude } },
    });
    await recordStaffAction(
      actorFromRequest(req),
      "marble_kind.create",
      kind.name,
    );
    res.status(201).json(serializeKind(kind));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const kind = await prisma.marbleKind.update({
      where: { id: req.params.id },
      data: req.body,
      include: { slices: { include: sliceInclude } },
    });
    await recordStaffAction(
      actorFromRequest(req),
      "marble_kind.update",
      kind.name,
    );
    res.json(serializeKind(kind));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const kind = await prisma.marbleKind.findUnique({
      where: { id: req.params.id },
    });
    await prisma.marbleKind.delete({ where: { id: req.params.id } });
    if (kind) {
      await recordStaffAction(
        actorFromRequest(req),
        "marble_kind.delete",
        kind.name,
      );
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/:id/slices", async (req, res, next) => {
  try {
    const kindId = req.params.id;
    const kind = await prisma.marbleKind.findUnique({ where: { id: kindId } });
    if (!kind) {
      res.status(404).json({ error: "Marble kind not found" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const {
      supplierId,
      lengthM,
      widthM,
      thicknessM,
      sliceCount = 1,
      purchasePerSqm,
      sellingPerSqm,
      merge = true,
      wastes,
    } = body;

    if (
      typeof supplierId !== "string" ||
      lengthM === undefined ||
      widthM === undefined ||
      thicknessM === undefined
    ) {
      res.status(400).json({ error: "supplierId and dimensions are required" });
      return;
    }

    const len = Number(lengthM);
    const wid = Number(widthM);
    const thick = Number(thicknessM);
    const count = Math.max(1, Number(sliceCount) || 1);
    const purchase = Number(purchasePerSqm) || 0;
    const selling = Number(sellingPerSqm) || 0;
    const wasteRects = parseWastes(wastes);

    const gross = len * wid;
    if (wasteAreaSqm(wasteRects) > gross + 1e-9) {
      res.status(400).json({ error: "Waste area exceeds slice area" });
      return;
    }

    const existing = await prisma.marbleSlice.findMany({
      where: { kindId },
      include: sliceInclude,
    });

    const key = dimensionsKey(len, wid, thick, wasteRects);
    const match = merge
      ? existing.find((s) => {
          const w = parseWastes(s.wastes);
          return (
            dimensionsKey(s.lengthM, s.widthM, s.thicknessM, w) === key &&
            s.supplierId === supplierId &&
            s.purchasePerSqm === purchase &&
            s.sellingPerSqm === selling
          );
        })
      : undefined;

    let slice;
    if (match) {
      slice = await prisma.marbleSlice.update({
        where: { id: match.id },
        data: { sliceCount: match.sliceCount + count },
        include: sliceInclude,
      });
    } else {
      slice = await prisma.marbleSlice.create({
        data: {
          kindId,
          supplierId,
          lengthM: len,
          widthM: wid,
          thicknessM: thick,
          wastes: wasteRects,
          sliceCount: count,
          purchasePerSqm: purchase,
          sellingPerSqm: selling,
        },
        include: sliceInclude,
      });
    }

    await recordStaffAction(
      actorFromRequest(req),
      match ? "marble_slice.add_qty" : "marble_slice.create",
      `${kind.name} · ${len}×${wid}m`,
    );
    res.status(match ? 200 : 201).json(serializeSlice(slice));
  } catch (err) {
    next(err);
  }
});

router.patch("/slices/:sliceId", async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = { ...body };

    if (typeof body.supplierId === "string") {
      data.supplier = { connect: { id: body.supplierId } };
      delete data.supplierId;
    }

    if (body.wastes !== undefined) {
      data.wastes = parseWastes(body.wastes);
    }

    const current = await prisma.marbleSlice.findUnique({
      where: { id: req.params.sliceId },
    });
    if (!current) {
      res.status(404).json({ error: "Slice not found" });
      return;
    }

    const len = Number(data.lengthM ?? current.lengthM);
    const wid = Number(data.widthM ?? current.widthM);
    const wastes = parseWastes(data.wastes ?? current.wastes);
    if (wasteAreaSqm(wastes) > len * wid + 1e-9) {
      res.status(400).json({ error: "Waste area exceeds slice area" });
      return;
    }
    data.wastes = wastes;

    const slice = await prisma.marbleSlice.update({
      where: { id: req.params.sliceId },
      data,
      include: sliceInclude,
    });
    await recordStaffAction(
      actorFromRequest(req),
      "marble_slice.update",
      slice.id,
    );
    res.json(serializeSlice(slice));
  } catch (err) {
    next(err);
  }
});

router.delete("/slices/:sliceId", async (req, res, next) => {
  try {
    await prisma.marbleSlice.delete({ where: { id: req.params.sliceId } });
    await recordStaffAction(
      actorFromRequest(req),
      "marble_slice.delete",
      req.params.sliceId,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
