import { Router } from "express";
import { authenticate, requirePermission } from "../../common/auth";
import { dateKeyToDate, localDateKey, todayDate } from "../../common/dates";
import { ok } from "../../common/response";
import { prisma } from "../../config/prisma";

const router = Router();

router.use(authenticate);

router.get("/stats", requirePermission("dashboard:read"), async (req, res, next) => {
  try {
    const today = todayDate();
    const now = new Date();
    const dateKey = localDateKey();

    const [totalBookings, todayBookings, inTransit, delivered, ndr, outForDelivery, pendingPod, ridersActive, revenueAgg, openTickets, pendingLeaves] =
      await Promise.all([
        prisma.shipment.count(),
        prisma.shipment.count({ where: { createdAt: { gte: today } } }),
        prisma.shipment.count({ where: { status: { in: ["BOOKED", "PICKED_UP", "IN_TRANSIT"] } } }),
        prisma.shipment.count({ where: { status: "DELIVERED" } }),
        prisma.shipment.count({ where: { status: "NDR" } }),
        prisma.shipment.count({ where: { status: "OUT_FOR_DELIVERY" } }),
        prisma.shipment.count({ where: { status: "OUT_FOR_DELIVERY", pod: null } }),
        prisma.riderTask.groupBy({ by: ["riderId"], where: { date: today, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
        prisma.shipment.aggregate({ _sum: { totalCharge: true }, where: { createdAt: { gte: today } } }),
        prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      ]);

    const since = new Date(now.getTime() - 6 * 86_400_000);
    since.setHours(0, 0, 0, 0);
    const trendRows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE(\`createdAt\`) AS day, COUNT(*) AS count
      FROM Shipment
      WHERE \`createdAt\` >= ${since}
      GROUP BY DATE(\`createdAt\`)
      ORDER BY day ASC
    `;
    const trendMap = new Map(trendRows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));
    const trend: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      trend.push({ day: key, count: trendMap.get(key) ?? 0 });
    }

    const deliveredToday = await prisma.shipment.count({ where: { status: "DELIVERED", deliveredAt: { gte: today } } });
    const openManifests = await prisma.manifest.count({ where: { status: "OPEN" } });

    ok(res, {
      date: dateKey,
      totalBookings,
      todayBookings,
      inTransit,
      delivered,
      deliveredToday,
      ndr,
      outForDelivery,
      pendingPod,
      ridersActive: ridersActive.length,
      revenueToday: Number(revenueAgg._sum.totalCharge ?? 0),
      openTickets,
      pendingLeaves,
      openManifests,
      trend,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
