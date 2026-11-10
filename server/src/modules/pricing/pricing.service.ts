import { prisma } from "../../config/prisma";
import type { ServiceType } from "../../generated/prisma/client";

export type ChargeInput = {
  serviceType: ServiceType;
  physicalWeight: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
  codAmount: number;
  originPincode: string;
  destPincode: string;
};

export type ChargeResult = {
  volumetricWeight: number;
  chargeableWeight: number;
  baseCharge: number;
  fuelSurcharge: number;
  codCharge: number;
  insuranceCharge: number;
  gstAmount: number;
  total: number;
  estimatedDays: number;
  fromZone: string;
  toZone: string;
};

export type QuoteResult = ChargeResult & {
  serviceType: ServiceType;
  fromZoneName: string;
  toZoneName: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

const DEFAULT_RULES: Record<ServiceType, { baseCharge: number; perKgRate: number; minCharge: number; fuelPercent: number; codPercent: number; insurancePercent: number; gstPercent: number; estimatedDays: number }> = {
  STANDARD: { baseCharge: 40, perKgRate: 28, minCharge: 55, fuelPercent: 9, codPercent: 3, insurancePercent: 0.5, gstPercent: 18, estimatedDays: 3 },
  EXPRESS: { baseCharge: 70, perKgRate: 55, minCharge: 99, fuelPercent: 12, codPercent: 3, insurancePercent: 0.5, gstPercent: 18, estimatedDays: 2 },
  SURFACE: { baseCharge: 30, perKgRate: 20, minCharge: 45, fuelPercent: 7, codPercent: 3, insurancePercent: 0.5, gstPercent: 18, estimatedDays: 5 },
};

export async function resolveZoneCode(pincode: string): Promise<string> {
  try {
    const row = await prisma.zonePincode.findUnique({
      where: { pincode },
      include: { zone: { select: { code: true } } },
    });
    if (row) return row.zone.code;
  } catch {
    // zone lookup is best-effort; pricing falls back to ANY rules
  }
  return "DEFAULT";
}

async function findRule(serviceType: ServiceType, fromZone: string, toZone: string) {
  const exact = await prisma.pricingRule.findFirst({
    where: { serviceType, active: true, fromZone, toZone },
  });
  if (exact) return exact;
  const fromMatch = await prisma.pricingRule.findFirst({
    where: { serviceType, active: true, fromZone, toZone: "ANY" },
  });
  if (fromMatch) return fromMatch;
  const anyMatch = await prisma.pricingRule.findFirst({
    where: { serviceType, active: true, fromZone: "ANY", toZone: "ANY" },
  });
  return anyMatch;
}

export async function computeCharges(input: ChargeInput): Promise<ChargeResult> {
  const fromZone = await resolveZoneCode(input.originPincode);
  const toZone = await resolveZoneCode(input.destPincode);
  const rule = await findRule(input.serviceType, fromZone, toZone);
  const fallback = DEFAULT_RULES[input.serviceType];

  const baseCharge = rule ? Number(rule.baseCharge) : fallback.baseCharge;
  const perKgRate = rule ? Number(rule.perKgRate) : fallback.perKgRate;
  const minCharge = rule ? Number(rule.minCharge) : fallback.minCharge;
  const fuelPercent = rule ? Number(rule.fuelPercent) : fallback.fuelPercent;
  const codPercent = rule ? Number(rule.codPercent) : fallback.codPercent;
  const insurancePercent = rule ? Number(rule.insurancePercent) : fallback.insurancePercent;
  const gstPercent = rule ? Number(rule.gstPercent) : fallback.gstPercent;
  const estimatedDays = rule ? rule.estimatedDays : fallback.estimatedDays;

  const volumetricWeight = round3((input.lengthCm * input.widthCm * input.heightCm) / 5000);
  const chargeableWeight = round3(Math.max(input.physicalWeight, volumetricWeight));

  const freight = Math.max(minCharge, round2(baseCharge + perKgRate * chargeableWeight));
  const fuelSurcharge = round2((freight * fuelPercent) / 100);
  const codCharge = input.codAmount > 0 ? round2((input.codAmount * codPercent) / 100) : 0;
  const insuranceCharge = input.declaredValue > 0 ? round2((input.declaredValue * insurancePercent) / 100) : 0;
  const subtotal = freight + fuelSurcharge + codCharge + insuranceCharge;
  const gstAmount = round2((subtotal * gstPercent) / 100);

  return {
    volumetricWeight,
    chargeableWeight,
    baseCharge: freight,
    fuelSurcharge,
    codCharge,
    insuranceCharge,
    gstAmount,
    total: round2(subtotal + gstAmount),
    estimatedDays,
    fromZone,
    toZone,
  };
}

export async function quote(input: ChargeInput): Promise<QuoteResult> {
  const charges = await computeCharges(input);
  const [fromZone, toZone] = await Promise.all([
    prisma.zone.findUnique({ where: { code: charges.fromZone }, select: { name: true } }),
    prisma.zone.findUnique({ where: { code: charges.toZone }, select: { name: true } }),
  ]);
  return {
    ...charges,
    serviceType: input.serviceType,
    fromZoneName: fromZone?.name ?? "Any zone",
    toZoneName: toZone?.name ?? "Any zone",
  };
}
