import { Router } from "express";
import { authenticate, requirePermission } from "../../common/auth";
import { getPagination, optionalString } from "../../common/pagination";
import { ok, pageMeta } from "../../common/response";
import { prisma } from "../../config/prisma";
import type { Prisma } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("notifications:read"), async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPagination(req.query, 25);
    const search = optionalString(req.query.search);
    const channel = optionalString(req.query.channel);
    const status = optionalString(req.query.status);

    const where: Prisma.NotificationLogWhereInput = {
      ...(search ? { OR: [{ recipient: { contains: search } }, { body: { contains: search } }, { template: { contains: search } }] } : {}),
      ...(channel === "WHATSAPP" || channel === "SMS" ? { channel } : {}),
      ...(status ? { status: status as Prisma.EnumNotifyStatusFilter["equals"] } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notificationLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.notificationLog.count({ where }),
    ]);

    ok(res, { items, meta: pageMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

export default router;
