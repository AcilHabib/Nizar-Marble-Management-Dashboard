import { Router, type IRouter } from "express";
import { prisma } from "@workspace/db";
import { paidTotal, serializeOrder } from "../lib/serializers";
import { sliceAvailableNetAreaSqm } from "../lib/slice-availability";

const router: IRouter = Router();

router.get("/metrics", async (_req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [orders, slices] = await Promise.all([
      prisma.order.findMany({
        include: { deposits: true },
        orderBy: { orderDate: "desc" },
      }),
      prisma.marbleSlice.findMany(),
    ]);

    const monthOrders = orders.filter((o) => o.orderDate >= monthStart);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
    const totalDue = orders.reduce(
      (sum, o) => sum + Math.max(o.total - paidTotal(o.deposits), 0),
      0,
    );
    const availableInventorySqm = Math.round(
      slices.reduce((sum, s) => sum + sliceAvailableNetAreaSqm(s), 0) * 100,
    ) / 100;

    const kindCounts = new Map<string, number>();
    for (const order of orders) {
      for (const part of order.kind.split("،")) {
        const name = part.trim();
        if (name) kindCounts.set(name, (kindCounts.get(name) ?? 0) + 1);
      }
    }
    const sortedKinds = [...kindCounts.entries()].sort((a, b) => b[1] - a[1]);
    const maxCount = sortedKinds[0]?.[1] ?? 1;
    const topMarble = sortedKinds.slice(0, 5).map(([name, count]) => ({
      name,
      count,
      width: Math.round((count / maxCount) * 100),
      pct: `${((count / Math.max(orders.length, 1)) * 100).toFixed(1)}%`,
    }));

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
    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const revenue = orders
        .filter((o) => o.orderDate >= d && o.orderDate <= end)
        .reduce((sum, o) => sum + o.total, 0);
      return {
        month: monthLabels[d.getMonth()],
        revenue,
        target: Math.round(revenue * 1.15),
      };
    });

    res.json({
      monthRevenue,
      monthOrderCount: monthOrders.length,
      totalDue,
      availableInventorySqm,
      recentOrders: orders.slice(0, 4).map(serializeOrder),
      topMarble,
      monthlyRevenue,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
