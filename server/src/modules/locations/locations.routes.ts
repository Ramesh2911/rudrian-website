import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { param } from "../../common/http";
import { optionalString } from "../../common/pagination";
import { created, ok } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";

const router = Router();

router.use(authenticate);

const locationSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(120),
  type: z.enum(["BRANCH", "HUB"]).default("HUB"),
  address: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits").optional(),
  phone: z.string().max(15).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  parentId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const type = optionalString(req.query.type);
    const includeInactive = req.query.all === "true";
    const items = await prisma.location.findMany({
      where: {
        ...(type === "BRANCH" || type === "HUB" ? { type } : {}),
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: { _count: { select: { users: true } } },
    });
    ok(
      res,
      items.map((l) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        type: l.type,
        address: l.address,
        city: l.city,
        state: l.state,
        pincode: l.pincode,
        phone: l.phone,
        latitude: l.latitude,
        longitude: l.longitude,
        active: l.active,
        staffCount: l._count.users,
        createdAt: l.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/", requirePermission("locations:manage"), validateBody(locationSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof locationSchema>;
    const exists = await prisma.location.findFirst({ where: { OR: [{ code: body.code }, ...(body.pincode ? [{ pincode: body.pincode }] : [])] } });
    if (exists) throw ApiError.conflict("A location with this code or pincode already exists");
    const location = await prisma.location.create({ data: body });
    created(res, location);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("locations:manage"), async (req, res, next) => {
  try {
    const parsed = locationSchema.partial().safeParse(req.body ?? {});
    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }
    const existing = await prisma.location.findUnique({ where: { id: param(req, "id") } });
    if (!existing) throw ApiError.notFound("Location not found");
    const location = await prisma.location.update({ where: { id: existing.id }, data: parsed.data });
    ok(res, location);
  } catch (err) {
    next(err);
  }
});

export default router;
