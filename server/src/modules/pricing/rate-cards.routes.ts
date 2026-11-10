import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { param } from "../../common/http";
import { ok, created } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";

const router = Router();

router.use(authenticate);

const ruleBody = z.object({
  serviceType: z.enum(["STANDARD", "EXPRESS", "SURFACE"]),
  fromZone: z.string().min(2).max(20).default("ANY"),
  toZone: z.string().min(2).max(20).default("ANY"),
  baseCharge: z.coerce.number().min(0),
  perKgRate: z.coerce.number().min(0),
  minCharge: z.coerce.number().min(0),
  fuelPercent: z.coerce.number().min(0).max(100).default(9),
  codPercent: z.coerce.number().min(0).max(100).default(3),
  insurancePercent: z.coerce.number().min(0).max(100).default(0.5),
  gstPercent: z.coerce.number().min(0).max(100).default(18),
  estimatedDays: z.coerce.number().int().min(1).max(30).default(3),
  active: z.boolean().default(true),
});

function serializeRule(rule: {
  id: string;
  serviceType: string;
  fromZone: string;
  toZone: string;
  baseCharge: unknown;
  perKgRate: unknown;
  minCharge: unknown;
  fuelPercent: unknown;
  codPercent: unknown;
  insurancePercent: unknown;
  gstPercent: unknown;
  estimatedDays: number;
  active: boolean;
  updatedAt: Date;
}) {
  return {
    id: rule.id,
    serviceType: rule.serviceType,
    fromZone: rule.fromZone,
    toZone: rule.toZone,
    baseCharge: Number(rule.baseCharge),
    perKgRate: Number(rule.perKgRate),
    minCharge: Number(rule.minCharge),
    fuelPercent: Number(rule.fuelPercent),
    codPercent: Number(rule.codPercent),
    insurancePercent: Number(rule.insurancePercent),
    gstPercent: Number(rule.gstPercent),
    estimatedDays: rule.estimatedDays,
    active: rule.active,
    updatedAt: rule.updatedAt.toISOString(),
  };
}

router.get("/", requirePermission("ratecards:read"), async (_req, res, next) => {
  try {
    const [rules, zones] = await Promise.all([
      prisma.pricingRule.findMany({ orderBy: [{ serviceType: "asc" }, { fromZone: "asc" }] }),
      prisma.zone.findMany({ include: { _count: { select: { pincodes: true } } }, orderBy: { code: "asc" } }),
    ]);
    ok(res, {
      rules: rules.map(serializeRule),
      zones: zones.map((z) => ({ id: z.id, code: z.code, name: z.name, pincodeCount: z._count.pincodes })),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", requirePermission("ratecards:manage"), validateBody(ruleBody), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof ruleBody>;
    const existing = await prisma.pricingRule.findUnique({
      where: { serviceType_fromZone_toZone: { serviceType: body.serviceType, fromZone: body.fromZone, toZone: body.toZone } },
    });
    if (existing) throw ApiError.conflict("A rule for this service and zone pair already exists");
    const rule = await prisma.pricingRule.create({ data: body });
    created(res, serializeRule(rule));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("ratecards:manage"), async (req, res, next) => {
  try {
    const parsed = ruleBody.partial().safeParse(req.body ?? {});
    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }
    const existing = await prisma.pricingRule.findUnique({ where: { id: param(req, "id") } });
    if (!existing) throw ApiError.notFound("Rate rule not found");
    const rule = await prisma.pricingRule.update({ where: { id: existing.id }, data: parsed.data });
    ok(res, serializeRule(rule));
  } catch (err) {
    next(err);
  }
});

export default router;
