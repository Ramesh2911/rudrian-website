import { hashSync } from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { param } from "../../common/http";
import { getPagination, optionalString } from "../../common/pagination";
import { created, ok, pageMeta } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";
import type { Prisma, Role } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

const staffSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  locationId: true,
  location: { select: { id: true, name: true, type: true, city: true } },
  profile: { select: { vehicleType: true, vehicleNumber: true } },
  createdAt: true,
} satisfies Prisma.UserSelect;

const staffBodySchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^\d{10,13}$/, "Enter a valid phone number"),
  email: z.email().optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["SUPER_ADMIN", "BRANCH_MANAGER", "HUB_MANAGER", "COUNTER_STAFF", "OPERATIONS", "HR_ADMIN", "RIDER"]),
  locationId: z.string().optional(),
  vehicleType: z.string().optional(),
  vehicleNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
});

router.get("/", requirePermission("staff:read"), async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPagination(req.query);
    const search = optionalString(req.query.search);
    const role = optionalString(req.query.role);
    const locationId = optionalString(req.query.locationId);
    const status = optionalString(req.query.status);

    const where: Prisma.UserWhereInput = {
      role: { not: "CUSTOMER" },
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
      ...(role ? { role: role as Role } : {}),
      ...(locationId ? { locationId } : {}),
      ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, select: staffSelect, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.user.count({ where }),
    ]);

    ok(res, { items, meta: pageMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post("/", requirePermission("staff:manage"), validateBody(staffBodySchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof staffBodySchema>;
    const email = body.email ? body.email.toLowerCase() : null;

    const duplicate = await prisma.user.findFirst({
      where: { OR: [{ phone: body.phone }, ...(email ? [{ email }] : [])] },
    });
    if (duplicate) throw ApiError.conflict("A staff member with this phone or email already exists");

    const user = await prisma.user.create({
      data: {
        name: body.name,
        phone: body.phone,
        email,
        passwordHash: hashSync(body.password, 10),
        role: body.role,
        locationId: body.locationId || null,
        ...(body.role === "RIDER"
          ? {
              profile: {
                create: {
                  vehicleType: body.vehicleType || "BIKE",
                  vehicleNumber: body.vehicleNumber || null,
                  licenseNumber: body.licenseNumber || null,
                },
              },
            }
          : {}),
      },
      select: staffSelect,
    });

    created(res, user);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("staff:manage"), async (req, res, next) => {
  try {
    const schema = staffBodySchema.partial().extend({ status: z.enum(["ACTIVE", "INACTIVE"]).optional() });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }
    const body = parsed.data;
    const existing = await prisma.user.findUnique({ where: { id: param(req, "id") } });
    if (!existing) throw ApiError.notFound("Staff member not found");

    const email = body.email ? body.email.toLowerCase() : undefined;
    if (email || body.phone) {
      const duplicate = await prisma.user.findFirst({
        where: {
          id: { not: existing.id },
          OR: [{ phone: body.phone ?? existing.phone }, ...(email ? [{ email }] : [])],
        },
      });
      if (duplicate) throw ApiError.conflict("Another staff member already uses this phone or email");
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(body.password ? { passwordHash: hashSync(body.password, 10) } : {}),
        ...(body.role ? { role: body.role } : {}),
        ...(body.locationId !== undefined ? { locationId: body.locationId || null } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
      select: staffSelect,
    });

    ok(res, user);
  } catch (err) {
    next(err);
  }
});

export default router;
