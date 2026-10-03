import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(rootDir, ".env") });

async function main() {
  const existing = await prisma.order.count();
  if (existing > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  const supplierA = await prisma.supplier.create({
    data: {
      name: "رخام إيطاليا",
      phone: "+966501234567",
      address: "جدة، حي الصناعية",
    },
  });
  const supplierB = await prisma.supplier.create({
    data: {
      name: "محاجر الأناضول",
      phone: "+966509876543",
      address: "الرياض، طريق الخرج",
    },
  });

  const carrara = await prisma.marbleKind.create({
    data: {
      name: "كرارا أبيض",
      color: "أبيض بخطوط رمادية",
      imageUrl: "carrara-01",
      visible: true,
      tone: "light",
    },
  });

  await prisma.marbleSlice.create({
    data: {
      kindId: carrara.id,
      supplierId: supplierA.id,
      lengthM: 3.2,
      widthM: 1.6,
      thicknessM: 0.02,
      wastes: [],
      sliceCount: 3,
      purchasePerSqm: 172,
      sellingPerSqm: 315,
    },
  });
  await prisma.marbleSlice.create({
    data: {
      kindId: carrara.id,
      supplierId: supplierA.id,
      lengthM: 2.8,
      widthM: 1.4,
      thicknessM: 0.02,
      wastes: [],
      sliceCount: 2,
      purchasePerSqm: 165,
      sellingPerSqm: 290,
    },
  });

  const travertine = await prisma.marbleKind.create({
    data: {
      name: "ترافرتينو كلاسيك",
      color: "عاجي دافئ",
      imageUrl: "travertine-01",
      visible: true,
      tone: "sand",
    },
  });

  await prisma.marbleSlice.create({
    data: {
      kindId: travertine.id,
      supplierId: supplierB.id,
      lengthM: 2.8,
      widthM: 1.4,
      thicknessM: 0.03,
      wastes: [],
      sliceCount: 4,
      purchasePerSqm: 118,
      sellingPerSqm: 260,
    },
  });

  const orders = [
    {
      orderNumber: "NZ-2481",
      customer: "شركة البناء الحديث",
      orderDate: new Date("2024-06-18"),
      kind: "كرارا أبيض",
      total: 18450,
      status: "قيد التنفيذ",
      staff: "سامي ح.",
      dimensions: "120 × 60 سم",
      thickness: "2 سم",
      edges: "مستقيم مصقول",
      pieces: [
        {
          kind: "كرارا أبيض",
          dims: "120 × 60 سم",
          thickness: "2 سم",
          edges: "مستقيم",
          qty: 2,
          price: 3780,
        },
      ],
      deposits: {
        create: [
          { amount: 8000, method: "تحويل بنكي", depositDate: new Date("2024-06-18") },
          { amount: 4000, method: "نقدي", depositDate: new Date("2024-06-18") },
        ],
      },
    },
    {
      orderNumber: "NZ-2480",
      customer: "فيلا عبد الرحمن",
      orderDate: new Date("2024-06-17"),
      kind: "ترافرتينو",
      total: 32700,
      status: "تم التسليم",
      staff: "عمر ن.",
      pieces: [],
      deposits: {
        create: [{ amount: 32700, method: "تحويل بنكي", depositDate: new Date("2024-06-17") }],
      },
    },
  ];

  for (const order of orders) {
    await prisma.order.create({ data: order });
  }

  const staff = [
    {
      name: "سامي الحربي",
      role: "مشرف الإنتاج",
      email: "sami@nizarstone.sa",
      status: "نشط",
    },
    {
      name: "عمر النجار",
      role: "فني قص وتشطيب",
      email: "omar@nizarstone.sa",
      status: "نشط",
    },
  ];

  for (const member of staff) {
    await prisma.staffMember.create({ data: member });
  }

  console.log("Seed completed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
