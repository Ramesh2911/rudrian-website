import { z } from "zod";

export const partySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  phone: z.string().trim().regex(/^\d{10,13}$/, "Enter a valid phone number"),
  address: z.string().trim().min(5, "Address is required").max(300),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().max(80).optional(),
});

export const parcelSchema = z.object({
  category: z.enum(["DOCUMENT", "GENERAL", "FRAGILE", "LIQUID", "ELECTRONICS"]).default("GENERAL"),
  lengthCm: z.coerce.number().positive().max(300),
  widthCm: z.coerce.number().positive().max(300),
  heightCm: z.coerce.number().positive().max(300),
  physicalWeight: z.coerce.number().positive().max(500),
  declaredValue: z.coerce.number().min(0).max(1_000_000).default(0),
  codAmount: z.coerce.number().min(0).max(1_000_000).default(0),
});

export const createShipmentSchema = z.object({
  sender: partySchema,
  receiver: partySchema,
  parcel: parcelSchema,
  serviceType: z.enum(["STANDARD", "EXPRESS", "SURFACE"]).default("STANDARD"),
  paymentMethod: z.enum(["CASH", "UPI_QR", "RAZORPAY"]).default("CASH"),
  locationId: z.string().optional(),
});

export const quoteSchema = z.object({
  originPincode: z.string().regex(/^\d{6}$/, "Origin pincode must be 6 digits"),
  destPincode: z.string().regex(/^\d{6}$/, "Destination pincode must be 6 digits"),
  weight: z.coerce.number().positive().max(500),
  lengthCm: z.coerce.number().positive().max(300).default(30),
  widthCm: z.coerce.number().positive().max(300).default(20),
  heightCm: z.coerce.number().positive().max(300).default(10),
  serviceType: z.enum(["STANDARD", "EXPRESS", "SURFACE"]).default("STANDARD"),
  codAmount: z.coerce.number().min(0).default(0),
  declaredValue: z.coerce.number().min(0).default(0),
});
