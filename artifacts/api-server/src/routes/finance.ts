import { Router, type IRouter } from "express";
import { prisma } from "@workspace/db";
import { paidTotal } from "../lib/serializers";
import { sliceRowMetrics } from "../lib/slice-math";

const router: IRouter = Router();

router.get("/overview", async (_req, res, next) => {
  try {
    const [orders, slices, staff] = await Promise.all([
      prisma.order.findMany({ include: { deposits: true } }),
      prisma.marbleSlice.findMany(),
      prisma.staffMember.findMany(),
    ]);

    const revenueTotal = orders.reduce((sum, o) => sum + o.total, 0);
    const materialCost = slices.reduce(
      (sum, s) => sum + sliceRowMetrics(s).purchaseTotal,
      0,
    );
    const netProfit = Math.max(revenueTotal - materialCost, 0);
    const profitMargin =
      revenueTotal > 0
        ? `${((netProfit / revenueTotal) * 100).toFixed(1)}%`
        : "0%";

    const now = new Date();
    const monthLabels = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ];
    const monthlyFlow = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthOrders = orders.filter(
        (o) => o.orderDate >= d && o.orderDate <= end,
      );
      const revenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
      const expenses = Math.round(revenue * 0.38);
      return { month: monthLabels[d.getMonth()], revenue, expenses };
    });

    const expenseSummary = [
      {
        label: "rawMaterials",
        amount: Math.round(materialCost * 0.5),
        width: "50%",
        color: "#3A3D3F",
      },
      {
        label: "salaries",
        amount: Math.round(materialCost * 0.29),
        width: "29%",
        color: "#CFC3AE",
      },
      {
        label: "transport",
        amount: Math.round(materialCost * 0.14),
        width: "14%",
        color: "#9B8C77",
      },
      {
        label: "other",
        amount: Math.round(materialCost * 0.07),
        width: "7%",
        color: "#E5DED2",
      },
    ];

    const salaryRows = staff.map((member, index) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      salary: [8500, 7200, 6800][index % 3],
      status: index === 0 ? "تم الدفع" : "مستحق",
    }));

    res.json({
      revenueTotal,
      materialCost,
      netProfit,
      profitMargin,
      monthlyFlow,
      expenseSummary,
      salaryRows,
      collectedPaid: orders.reduce((sum, o) => sum + paidTotal(o.deposits), 0),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
