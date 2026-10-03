/**
 * One-time fix for MarbleSlice docs created before lengthM / consumedNetAreaSqm.
 * Converts legacy lengthCm/widthCm/thicknessCm to meters when present.
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(rootDir, ".env") });

async function main() {
  const result = await prisma.$runCommandRaw({
    update: "MarbleSlice",
    updates: [
      {
        q: {
          $or: [
            { lengthM: null },
            { lengthM: { $exists: false } },
            { widthM: null },
            { widthM: { $exists: false } },
          ],
        },
        u: [
          {
            $set: {
              lengthM: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$lengthM", null] },
                      { $gt: ["$lengthM", 0] },
                    ],
                  },
                  then: "$lengthM",
                  else: {
                    $cond: {
                      if: { $gt: [{ $ifNull: ["$lengthCm", 0] }, 0] },
                      then: { $divide: ["$lengthCm", 100] },
                      else: 0,
                    },
                  },
                },
              },
              widthM: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$widthM", null] },
                      { $gt: ["$widthM", 0] },
                    ],
                  },
                  then: "$widthM",
                  else: {
                    $cond: {
                      if: { $gt: [{ $ifNull: ["$widthCm", 0] }, 0] },
                      then: { $divide: ["$widthCm", 100] },
                      else: 0,
                    },
                  },
                },
              },
              thicknessM: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$thicknessM", null] },
                      { $gt: ["$thicknessM", 0] },
                    ],
                  },
                  then: "$thicknessM",
                  else: {
                    $cond: {
                      if: { $gt: [{ $ifNull: ["$thicknessCm", 0] }, 0] },
                      then: { $divide: ["$thicknessCm", 100] },
                      else: 0.02,
                    },
                  },
                },
              },
              consumedNetAreaSqm: { $ifNull: ["$consumedNetAreaSqm", 0] },
              wastes: { $ifNull: ["$wastes", []] },
            },
          },
        ],
        multi: true,
      },
    ],
  });

  console.log("MarbleSlice migration result:", JSON.stringify(result));

  const invalid = await prisma.marbleSlice.findMany({
    where: {
      OR: [{ lengthM: { lte: 0 } }, { widthM: { lte: 0 } }],
    },
    select: { id: true, lengthM: true, widthM: true },
  });

  if (invalid.length > 0) {
    console.log(
      `Removing ${invalid.length} slice(s) with no valid dimensions:`,
      invalid.map((s) => s.id),
    );
    await prisma.marbleSlice.deleteMany({
      where: { id: { in: invalid.map((s) => s.id) } },
    });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
