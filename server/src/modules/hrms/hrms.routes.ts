import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { param } from "../../common/http";
import { dateKeyToDate, daysInMonth, localDateKey, monthBounds } from "../../common/dates";
import { optionalString } from "../../common/pagination";
import { created, ok } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";
import type { AttendanceStatus, LeaveStatus, Prisma } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

router.get("/attendance", requirePermission("hrms:read"), async (req, res, next) => {
  try {
    const { start, end, key } = monthBounds(optionalString(req.query.month));
    const userId = optionalString(req.query.userId);
    const locationId = optionalString(req.query.locationId);
    const dateFilter = optionalString(req.query.date);

    const where: Prisma.AttendanceWhereInput = {
      ...(dateFilter ? { date: dateKeyToDate(dateFilter) } : { date: { gte: start, lte: end } }),
      ...(userId ? { userId } : {}),
      ...(locationId ? { user: { locationId } } : {}),
    };

    const items = await prisma.attendance.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true, phone: true, locationId: true } } },
      orderBy: [{ date: "desc" }, { user: { name: "asc" } }],
      take: 500,
    });

    const summary = items.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    ok(res, { month: key, items, summary });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/attendance/punch",
  validateBody(
    z.object({
      action: z.enum(["IN", "OUT"]),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as { action: "IN" | "OUT"; lat?: number; lng?: number };
      const userId = req.user!.id;
      const date = dateKeyToDate(localDateKey());
      const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });

      if (body.action === "IN") {
        if (existing?.inTime) return ok(res, existing);
        const attendance = existing
          ? await prisma.attendance.update({
              where: { id: existing.id },
              data: { inTime: new Date(), status: "PRESENT", source: "WEB", inLatitude: body.lat ?? null, inLongitude: body.lng ?? null },
            })
          : await prisma.attendance.create({
              data: {
                userId,
                date,
                status: "PRESENT",
                inTime: new Date(),
                source: "WEB",
                inLatitude: body.lat ?? null,
                inLongitude: body.lng ?? null,
              },
            });
        return ok(res, attendance);
      }

      if (!existing?.inTime) throw ApiError.badRequest("Please check in before checking out");
      if (existing.outTime) return ok(res, existing);
      const attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: { outTime: new Date(), outLatitude: body.lat ?? null, outLongitude: body.lng ?? null },
      });
      ok(res, attendance);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/attendance/me", async (req, res, next) => {
  try {
    const date = dateKeyToDate(localDateKey());
    const [today, weekAgo] = await Promise.all([
      prisma.attendance.findUnique({ where: { userId_date: { userId: req.user!.id, date } } }),
      prisma.attendance.findMany({
        where: { userId: req.user!.id, date: { gte: new Date(date.getTime() - 7 * 86_400_000) } },
        orderBy: { date: "desc" },
      }),
    ]);
    ok(res, { today, recent: weekAgo });
  } catch (err) {
    next(err);
  }
});

router.get("/leaves", requirePermission("hrms:read"), async (req, res, next) => {
  try {
    const { start, end, key } = monthBounds(optionalString(req.query.month));
    const status = optionalString(req.query.status);
    const items = await prisma.leaveRequest.findMany({
      where: {
        ...(status ? { status: status as LeaveStatus } : {}),
        OR: [{ fromDate: { gte: start, lte: end } }, { toDate: { gte: start, lte: end } }],
      },
      include: {
        user: { select: { id: true, name: true, role: true, locationId: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    ok(res, { month: key, items });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/leaves",
  validateBody(
    z.object({
      type: z.enum(["CASUAL", "SICK", "EARNED"]),
      fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().min(5).max(500),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as { type: "CASUAL" | "SICK" | "EARNED"; fromDate: string; toDate: string; reason: string };
      const from = dateKeyToDate(body.fromDate);
      const to = dateKeyToDate(body.toDate);
      if (to < from) throw ApiError.badRequest("toDate must be on or after fromDate");

      const overlap = await prisma.leaveRequest.findFirst({
        where: {
          userId: req.user!.id,
          status: { in: ["PENDING", "APPROVED"] },
          fromDate: { lte: to },
          toDate: { gte: from },
        },
      });
      if (overlap) throw ApiError.conflict("You already have a leave request covering these dates");

      const leave = await prisma.leaveRequest.create({
        data: { userId: req.user!.id, type: body.type, fromDate: from, toDate: to, reason: body.reason },
      });
      created(res, leave);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/leaves/:id/approve",
  requirePermission("hrms:manage"),
  validateBody(z.object({ action: z.enum(["APPROVE", "REJECT"]) })),
  async (req, res, next) => {
    try {
      const body = req.body as { action: "APPROVE" | "REJECT" };
      const leave = await prisma.leaveRequest.findUnique({ where: { id: param(req, "id") } });
      if (!leave) throw ApiError.notFound("Leave request not found");
      if (leave.status !== "PENDING") throw ApiError.unprocessable("This request is already decided");

      const status: LeaveStatus = body.action === "APPROVE" ? "APPROVED" : "REJECTED";
      const updated = await prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status, approverId: req.user!.id, decidedAt: new Date() },
      });

      if (status === "APPROVED") {
        for (let ts = leave.fromDate.getTime(); ts <= leave.toDate.getTime(); ts += 86_400_000) {
          const date = new Date(ts);
          await prisma.attendance.upsert({
            where: { userId_date: { userId: leave.userId, date } },
            update: { status: "LEAVE" },
            create: { userId: leave.userId, date, status: "LEAVE" },
          });
        }
      }

      ok(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/payroll", requirePermission("hrms:read"), async (req, res, next) => {
  try {
    const { key } = monthBounds(optionalString(req.query.month));
    const items = await prisma.payrollRun.findMany({
      where: { month: key },
      include: { user: { select: { id: true, name: true, role: true, phone: true } } },
      orderBy: { user: { name: "asc" } },
    });
    ok(res, {
      month: key,
      items: items.map((r) => ({ ...r, netSalary: Number(r.netSalary), basic: Number(r.basic), hra: Number(r.hra), travelAllowance: Number(r.travelAllowance), otherEarnings: Number(r.otherEarnings), deductions: Number(r.deductions), incentives: Number(r.incentives) })),
      totals: { gross: items.reduce((s, r) => s + Number(r.netSalary), 0), count: items.length },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/payroll/run", requirePermission("hrms:manage"), validateBody(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() })), async (req, res, next) => {
  try {
    const { start, end, key } = monthBounds((req.body as { month?: string }).month);
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE", role: { notIn: ["CUSTOMER"] } },
      select: { id: true, name: true, salary: true },
    });
    if (users.length === 0) throw ApiError.unprocessable("No active staff found");

    const attendance = await prisma.attendance.findMany({ where: { date: { gte: start, lte: end } } });
    const presentByUser = new Map<string, number>();
    for (const row of attendance) {
      const score =
        row.status === "HALF_DAY" ? 0.5 : row.status === "ABSENT" || row.status === "WEEK_OFF" ? 0 : 1;
      presentByUser.set(row.userId, (presentByUser.get(row.userId) ?? 0) + score);
    }

    const totalDays = daysInMonth(key);
    let workingDays = 0;
    for (let day = 1; day <= totalDays; day += 1) {
      const dow = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, day)).getUTCDay();
      if (dow !== 0) workingDays += 1;
    }

    const runs = [];
    for (const user of users) {
      const s = user.salary;
      const basic = Number(s?.basic ?? 18000);
      const hra = Number(s?.hra ?? 7200);
      const travelAllowance = Number(s?.travelAllowance ?? 2000);
      const otherEarnings = Number(s?.otherEarnings ?? 0);
      const deductions = Number(s?.deductions ?? 0);
      const incentives = Number(s?.incentives ?? 0);
      const gross = basic + hra + travelAllowance + otherEarnings + incentives;
      const presentDays = presentByUser.get(user.id) ?? 0;
      const perDay = workingDays > 0 ? gross / workingDays : gross;
      const absentDeduction = Math.round(Math.max(0, workingDays - presentDays) * perDay * 100) / 100;
      const net = Math.round((gross - deductions - absentDeduction) * 100) / 100;

      runs.push(
        await prisma.payrollRun.upsert({
          where: { month_userId: { month: key, userId: user.id } },
          update: { basic, hra, travelAllowance, otherEarnings, deductions: deductions + absentDeduction, incentives, netSalary: net, workingDays, presentDays },
          create: { month: key, userId: user.id, basic, hra, travelAllowance, otherEarnings, deductions: deductions + absentDeduction, incentives, netSalary: net, workingDays, presentDays },
        }),
      );
    }

    ok(res, { month: key, generated: runs.length, workingDays });
  } catch (err) {
    next(err);
  }
});

router.get("/shifts", requirePermission("hrms:read"), async (_req, res, next) => {
  try {
    const shifts = await prisma.shift.findMany({ orderBy: { startTime: "asc" } });
    ok(res, { items: shifts });
  } catch (err) {
    next(err);
  }
});

export default router;
