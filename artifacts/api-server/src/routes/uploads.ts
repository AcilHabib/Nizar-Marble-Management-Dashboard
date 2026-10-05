import { Router, type IRouter } from "express";
import multer from "multer";
import { loadMarbleImage, saveMarbleImage } from "../lib/mongo-image-store";
import { sanityConfigured, uploadImageToSanity } from "../lib/sanity-upload";
import { recordStaffAction } from "../lib/staff-action";
import { actorFromRequest } from "../middleware/staff-actor";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.get("/marble-image/:id", async (req, res, next) => {
  try {
    const row = await loadMarbleImage(req.params.id);
    if (!row) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", row.contentType);
    res.send(Buffer.from(row.data));
  } catch (err) {
    next(err);
  }
});

router.post(
  "/marble-image",
  upload.single("file"),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "file is required" });
        return;
      }

      let url: string;
      if (sanityConfigured()) {
        url = await uploadImageToSanity(
          file.buffer,
          file.originalname || "marble.jpg",
          file.mimetype || "image/jpeg",
        );
      } else {
        url = await saveMarbleImage(
          file.buffer,
          file.mimetype || "image/jpeg",
          file.originalname || "marble.jpg",
        );
      }

      await recordStaffAction(
        actorFromRequest(req),
        "marble_image.upload",
        file.originalname,
      );
      res.json({ url });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
