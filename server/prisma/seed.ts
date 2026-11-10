import { hashSync } from "bcryptjs";
import { localDateKey, dateKeyToDate } from "../src/common/dates";
import { hashOtp } from "../src/common/auth";
import { prisma } from "../src/config/prisma";
import { generateManifestNumber, generateTicketNumber } from "../src/common/awb";
import { computeCharges } from "../src/modules/pricing/pricing.service";

const zoneDefs = [
  { code: "NORTH", name: "North India", pincodes: ["110001", "122001", "141001", "201301", "208001", "226001", "302001", "462001", "482001"] },
  { code: "SOUTH", name: "South India", pincodes: ["560001", "500001", "600001", "641001", "682001", "695001", "605001", "530001"] },
  { code: "WEST", name: "West India", pincodes: ["400001", "411001", "422001", "440001", "380001", "452001", "403001"] },
  { code: "EAST", name: "East India", pincodes: ["700001", "751001", "781001", "744001", "712001", "734001"] },
  { code: "DEFAULT", name: "All other pincodes", pincodes: [] },
];

const locationDefs = [
  { code: "HQ-BLR", name: "SwiftLogix HQ - Bengaluru", type: "BRANCH" as const, address: "14, MG Road, Fort", city: "Bengaluru", state: "Karnataka", pincode: "560001", phone: "+918040001000", latitude: 12.9762, longitude: 77.6033 },
  { code: "BR-CBE", name: "Coimbatore Counter", type: "BRANCH" as const, address: "5, Cross Cut Road, Gandhipuram", city: "Coimbatore", state: "Tamil Nadu", pincode: "641001", phone: "+914224001000", latitude: 11.0168, longitude: 76.9558 },
  { code: "HUB-DEL", name: "Delhi North Hub", type: "HUB" as const, address: "Plot 22, Transport Nagar", city: "New Delhi", state: "Delhi", pincode: "110001", phone: "+91114001000", latitude: 28.6517, longitude: 77.2219 },
  { code: "HUB-BOM", name: "Mumbai West Hub", type: "HUB" as const, address: "Unit 7, Andheri East", city: "Mumbai", state: "Maharashtra", pincode: "400001", phone: "+91224001000", latitude: 19.076, longitude: 72.8777 },
  { code: "HUB-CCU", name: "Kolkata East Hub", type: "HUB" as const, address: "9, Salt Lake Sector V", city: "Kolkata", state: "West Bengal", pincode: "700001", phone: "+91334001000", latitude: 22.5726, longitude: 88.3639 },
  { code: "HUB-HYD", name: "Hyderabad South Hub", type: "HUB" as const, address: "3, Kukatpally", city: "Hyderabad", state: "Telangana", pincode: "500001", phone: "+91404001000", latitude: 17.385, longitude: 78.4867 },
];

const userDefs = [
  { phone: "+919000000001", email: "admin@swiftlogix.in", name: "Arjun Mehta", password: "Admin@123", role: "SUPER_ADMIN" as const, locationCode: "HQ-BLR" },
  { phone: "+919000000002", email: "ops@swiftlogix.in", name: "Priya Nair", password: "Ops@123", role: "OPERATIONS" as const, locationCode: "HQ-BLR" },
  { phone: "+919000000003", email: "manager.delhi@swiftlogix.in", name: "Rahul Verma", password: "Hub@123", role: "HUB_MANAGER" as const, locationCode: "HUB-DEL" },
  { phone: "+919000000004", email: "counter@swiftlogix.in", name: "Sneha Iyer", password: "Counter@123", role: "COUNTER_STAFF" as const, locationCode: "BR-CBE" },
  { phone: "+919000000005", email: "hr@swiftlogix.in", name: "Kavita Sharma", password: "Hr@123", role: "HR_ADMIN" as const, locationCode: "HQ-BLR" },
  { phone: "+919000000011", email: "rider1@swiftlogix.in", name: "Amit Kumar", password: "Rider@123", role: "RIDER" as const, locationCode: "HUB-DEL" },
  { phone: "+919000000012", email: "rider2@swiftlogix.in", name: "Vikram Singh", password: "Rider@123", role: "RIDER" as const, locationCode: "HUB-BOM" },
  { phone: "+919000000021", email: "customer@demo.in", name: "Demo Customer", password: "Demo@123", role: "CUSTOMER" as const, locationCode: null },
];

const templateDefs = [
  { code: "booking_confirmed", title: "Booking Confirmed", body: "SwiftLogix: Hi {{name}}, your shipment {{awb}} is booked ({{service}}). Total Rs. {{total}}. Track: {{trackingUrl}}" },
  { code: "out_for_delivery", title: "Out for Delivery", body: "SwiftLogix: Your shipment {{awb}} is out for delivery today. Keep OTP {{otp}} ready. Track: {{trackingUrl}}" },
  { code: "delivered", title: "Delivered", body: "SwiftLogix: Shipment {{awb}} has been delivered. Thank you for choosing SwiftLogix. Track: {{trackingUrl}}" },
  { code: "ndr_update", title: "Delivery Exception", body: "SwiftLogix: Delivery attempt for {{awb}} was not completed ({{reason}}). Team will retry. Track: {{trackingUrl}}" },
  { code: "otp_delivery", title: "Delivery OTP", body: "SwiftLogix: {{otp}} is your delivery OTP for shipment {{awb}}. Valid 10 minutes. Do not share." },
  { code: "ticket_update", title: "Ticket Update", body: "SwiftLogix: Ticket {{ticketNumber}} update: {{status}}. {{remarks}}" },
  { code: "welcome", title: "Welcome", body: "SwiftLogix: Welcome {{name}}! Your account is ready. Start shipping: {{trackingUrl}}" },
];

async function seedZones() {
  for (const zone of zoneDefs) {
    const record = await prisma.zone.upsert({ where: { code: zone.code }, update: { name: zone.name }, create: { code: zone.code, name: zone.name } });
    for (const pincode of zone.pincodes) {
      await prisma.zonePincode.upsert({
        where: { pincode },
        update: { zoneId: record.id },
        create: { pincode, zoneId: record.id },
      });
    }
  }
}

async function seedPricingRules() {
  const rules = [
    { serviceType: "STANDARD" as const, baseCharge: 40, perKgRate: 28, minCharge: 55, fuelPercent: 9, codPercent: 3, insurancePercent: 0.5, gstPercent: 18, estimatedDays: 3 },
    { serviceType: "EXPRESS" as const, baseCharge: 70, perKgRate: 55, minCharge: 99, fuelPercent: 12, codPercent: 3, insurancePercent: 0.5, gstPercent: 18, estimatedDays: 2 },
    { serviceType: "SURFACE" as const, baseCharge: 30, perKgRate: 20, minCharge: 45, fuelPercent: 7, codPercent: 3, insurancePercent: 0.5, gstPercent: 18, estimatedDays: 5 },
  ];
  for (const rule of rules) {
    const key = { serviceType: rule.serviceType, fromZone: "ANY", toZone: "ANY" };
    await prisma.pricingRule.upsert({ where: { serviceType_fromZone_toZone: key }, update: rule, create: { ...key, ...rule } });
  }
}

async function seedLocations() {
  const map = new Map<string, string>();
  for (const loc of locationDefs) {
    const record = await prisma.location.upsert({ where: { code: loc.code }, update: loc, create: loc });
    map.set(loc.code, record.id);
  }
  return map;
}

async function seedUsers(locationIds: Map<string, string>) {
  const ids = new Map<string, string>();
  for (const def of userDefs) {
    const locationId = def.locationCode ? (locationIds.get(def.locationCode) ?? null) : null;
    const user = await prisma.user.upsert({
      where: { phone: def.phone },
      update: { name: def.name, email: def.email, role: def.role, status: "ACTIVE", locationId, passwordHash: hashSync(def.password, 10) },
      create: {
        phone: def.phone,
        email: def.email,
        name: def.name,
        role: def.role,
        locationId,
        passwordHash: hashSync(def.password, 10),
      },
    });
    ids.set(def.phone, user.id);
    if (def.role === "RIDER") {
      await prisma.riderProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, vehicleType: "BIKE", vehicleNumber: def.locationCode === "HUB-DEL" ? "DL-3S-AB-1234" : "MH-02-CD-5678", licenseNumber: "DL0420110012345" },
      });
    }
    if (def.role !== "CUSTOMER") {
      await prisma.salaryStructure.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          basic: def.role === "RIDER" ? 15000 : def.role === "SUPER_ADMIN" ? 65000 : 30000,
          hra: def.role === "SUPER_ADMIN" ? 20000 : 9000,
          travelAllowance: def.role === "RIDER" ? 3000 : 2500,
          deductions: 1200,
          incentives: def.role === "RIDER" ? 2500 : 1000,
        },
      });
    }
  }
  return ids;
}

async function seedTemplates() {
  for (const tpl of templateDefs) {
    await prisma.messageTemplate.upsert({
      where: { code: tpl.code },
      update: { title: tpl.title, body: tpl.body, channel: "WHATSAPP", active: true },
      create: { code: tpl.code, title: tpl.title, body: tpl.body, channel: "WHATSAPP", active: true },
    });
  }
}

async function seedShifts(locationIds: Map<string, string>) {
  const defs = [
    { name: "Morning Shift", type: "MORNING" as const, startTime: "06:00", endTime: "14:00" },
    { name: "Day Shift", type: "DAY" as const, startTime: "09:00", endTime: "18:00" },
    { name: "Night Transit Shift", type: "NIGHT" as const, startTime: "14:00", endTime: "22:00" },
  ];
  for (const def of defs) {
    const existing = await prisma.shift.findFirst({ where: { name: def.name } });
    if (existing) await prisma.shift.update({ where: { id: existing.id }, data: def });
    else await prisma.shift.create({ data: { ...def, locationId: locationIds.get("HQ-BLR") ?? null } });
  }
}

async function seedDemoData(locationIds: Map<string, string>, userIds: Map<string, string>) {
  const count = await prisma.shipment.count();
  if (count > 0) return;

  const dateKey = localDateKey();
  const today = dateKeyToDate(dateKey);
  const now = Date.now();
  const h = (n: number) => new Date(now - n * 3_600_000);

  const del = locationIds.get("HUB-DEL")!;
  const bom = locationIds.get("HUB-BOM")!;
  const blr = locationIds.get("HQ-BLR")!;
  const cbe = locationIds.get("BR-CBE")!;
  const ccu = locationIds.get("HUB-CCU")!;

  const rider1 = userIds.get("+919000000011")!;
  const ops = userIds.get("+919000000002")!;

  const demo = [
    {
      awb: `SLX${dateKey.replaceAll("-", "").slice(2)}${"000001"}`,
      status: "BOOKED" as const,
      sender: { name: "Rohit Malhotra", phone: "+919811000001", address: "221, Rohini Sector 3", pincode: "110001", city: "New Delhi", state: "Delhi" },
      receiver: { name: "Ananya Rao", phone: "+919845000002", address: "44, Indiranagar 100ft Rd", pincode: "560001", city: "Bengaluru", state: "Karnataka" },
      parcel: { category: "DOCUMENT" as const, lengthCm: 30, widthCm: 22, heightCm: 4, physicalWeight: 0.5, declaredValue: 500, codAmount: 0 },
      serviceType: "STANDARD" as const,
      paymentMethod: "CASH" as const,
      origin: del,
      dest: blr,
      created: h(30),
      history: [{ status: "BOOKED" as const, at: h(30), remarks: "Shipment booked (counter)" }],
    },
    {
      awb: `SLX${dateKey.replaceAll("-", "").slice(2)}${"000002"}`,
      status: "IN_TRANSIT" as const,
      sender: { name: "Zoya Fernandes", phone: "+919820000003", address: "12, Linking Road, Bandra", pincode: "400001", city: "Mumbai", state: "Maharashtra" },
      receiver: { name: "Debashish Sen", phone: "+919830000004", address: "78, Park Street", pincode: "700001", city: "Kolkata", state: "West Bengal" },
      parcel: { category: "FRAGILE" as const, lengthCm: 40, widthCm: 30, heightCm: 25, physicalWeight: 4.2, declaredValue: 8500, codAmount: 0 },
      serviceType: "EXPRESS" as const,
      paymentMethod: "RAZORPAY" as const,
      origin: bom,
      dest: ccu,
      created: h(26),
      history: [
        { status: "BOOKED" as const, at: h(26), remarks: "Shipment booked (portal)" },
        { status: "PICKED_UP" as const, at: h(24), remarks: "First-mile pickup completed by rider" },
        { status: "IN_TRANSIT" as const, at: h(20), remarks: "Bagged into manifest" },
        { status: "IN_TRANSIT" as const, at: h(6), remarks: "Received at inbound hub" },
      ],
    },
    {
      awb: `SLX${dateKey.replaceAll("-", "").slice(2)}${"000003"}`,
      status: "OUT_FOR_DELIVERY" as const,
      sender: { name: "Karthik Balaji", phone: "+919842000005", address: "9, Race Course Rd", pincode: "641001", city: "Coimbatore", state: "Tamil Nadu" },
      receiver: { name: "Meera Joshi", phone: "+919880000006", address: "21, Koramangala 5th Block", pincode: "560001", city: "Bengaluru", state: "Karnataka" },
      parcel: { category: "ELECTRONICS" as const, lengthCm: 35, widthCm: 28, heightCm: 12, physicalWeight: 2.4, declaredValue: 15000, codAmount: 2500 },
      serviceType: "EXPRESS" as const,
      paymentMethod: "CASH" as const,
      origin: cbe,
      dest: blr,
      created: h(50),
      riderId: rider1,
      history: [
        { status: "BOOKED" as const, at: h(50), remarks: "Shipment booked (admin)" },
        { status: "PICKED_UP" as const, at: h(48), remarks: "First-mile pickup completed by rider" },
        { status: "IN_TRANSIT" as const, at: h(44), remarks: "Bagged into manifest" },
        { status: "OUT_FOR_DELIVERY" as const, at: h(3), remarks: "Loaded for last-mile delivery" },
      ],
    },
    {
      awb: `SLX${dateKey.replaceAll("-", "").slice(2)}${"000004"}`,
      status: "DELIVERED" as const,
      sender: { name: "Neha Gupta", phone: "+919818000007", address: "88, Sector 14", pincode: "122001", city: "Gurugram", state: "Haryana" },
      receiver: { name: "Sanjay Patil", phone: "+919860000008", address: "5, Aundh Gaon", pincode: "400001", city: "Pune", state: "Maharashtra" },
      parcel: { category: "GENERAL" as const, lengthCm: 25, widthCm: 20, heightCm: 15, physicalWeight: 1.2, declaredValue: 2000, codAmount: 0 },
      serviceType: "STANDARD" as const,
      paymentMethod: "UPI_QR" as const,
      origin: del,
      dest: bom,
      created: h(72),
      history: [
        { status: "BOOKED" as const, at: h(72), remarks: "Shipment booked (counter)" },
        { status: "PICKED_UP" as const, at: h(70), remarks: "First-mile pickup completed by rider" },
        { status: "IN_TRANSIT" as const, at: h(66), remarks: "Bagged into manifest" },
        { status: "OUT_FOR_DELIVERY" as const, at: h(10), remarks: "Loaded for last-mile delivery" },
        { status: "DELIVERED" as const, at: h(8), remarks: "Delivered with digital POD" },
      ],
    },
  ];

  for (const d of demo) {
    const charges = await computeCharges({
      serviceType: d.serviceType,
      physicalWeight: d.parcel.physicalWeight,
      lengthCm: d.parcel.lengthCm,
      widthCm: d.parcel.widthCm,
      heightCm: d.parcel.heightCm,
      declaredValue: d.parcel.declaredValue,
      codAmount: d.parcel.codAmount,
      originPincode: d.sender.pincode,
      destPincode: d.receiver.pincode,
    });

    const deliveredAt = d.status === "DELIVERED" ? h(8) : null;
    const shipment = await prisma.shipment.create({
      data: {
        awbNumber: d.awb,
        status: d.status,
        bookingSource: "COUNTER",
        serviceType: d.serviceType,
        senderName: d.sender.name,
        senderPhone: d.sender.phone,
        senderAddress: d.sender.address,
        senderPincode: d.sender.pincode,
        senderCity: d.sender.city,
        senderState: d.sender.state,
        receiverName: d.receiver.name,
        receiverPhone: d.receiver.phone,
        receiverAddress: d.receiver.address,
        receiverPincode: d.receiver.pincode,
        receiverCity: d.receiver.city,
        receiverState: d.receiver.state,
        parcelCategory: d.parcel.category,
        lengthCm: d.parcel.lengthCm,
        widthCm: d.parcel.widthCm,
        heightCm: d.parcel.heightCm,
        physicalWeight: d.parcel.physicalWeight,
        volumetricWeight: charges.volumetricWeight,
        chargeableWeight: charges.chargeableWeight,
        declaredValue: d.parcel.declaredValue,
        codAmount: d.parcel.codAmount,
        baseCharge: charges.baseCharge,
        fuelSurcharge: charges.fuelSurcharge,
        codCharge: charges.codCharge,
        insuranceCharge: charges.insuranceCharge,
        gstAmount: charges.gstAmount,
        totalCharge: charges.total,
        originLocationId: d.origin,
        destLocationId: d.dest,
        currentLocationId: d.status === "BOOKED" ? d.origin : d.dest,
        createdById: ops,
        assignedRiderId: "riderId" in d ? d.riderId : null,
        otpHash: d.status === "OUT_FOR_DELIVERY" ? hashOtp("123456") : null,
        otpExpiresAt: d.status === "OUT_FOR_DELIVERY" ? new Date(now + 8 * 3_600_000) : null,
        pickedUpAt: d.history.find((x) => x.status === "PICKED_UP")?.at ?? null,
        outForDeliveryAt: d.history.find((x) => x.status === "OUT_FOR_DELIVERY")?.at ?? null,
        deliveredAt,
        createdAt: d.created,
        history: {
          create: d.history.map((entry) => ({
            status: entry.status,
            remarks: entry.remarks,
            locationId: entry.status === "BOOKED" ? d.origin : d.dest,
            actorId: ops,
            createdAt: entry.at,
          })),
        },
        payments: {
          create: {
            method: d.paymentMethod,
            status: d.parcel.codAmount > 0 && d.status !== "DELIVERED" ? "PENDING" : "PAID",
            amount: charges.total,
            verifiedAt: d.created,
          },
        },
        ...(d.status === "DELIVERED"
          ? {
              pod: {
                create: {
                  recipientName: d.receiver.name,
                  otpVerified: false,
                  notes: "Handed over to customer at doorstep",
                  byRiderId: rider1,
                  capturedAt: h(8),
                },
              },
            }
          : {}),
        ...(d.status === "OUT_FOR_DELIVERY" && "riderId" in d
          ? {
              tasks: {
                create: {
                  riderId: d.riderId,
                  type: "DELIVERY",
                  status: "PENDING",
                  date: today,
                  codAmount: d.parcel.codAmount,
                },
              },
            }
          : {}),
      },
    });

    if (d.parcel.codAmount > 0 && d.status === "DELIVERED") {
      await prisma.cashLedgerEntry.create({
        data: {
          locationId: d.dest,
          date: today,
          type: "CASH_IN",
          amount: d.parcel.codAmount,
          description: `COD collected for ${shipment.awbNumber}`,
          reference: shipment.awbNumber,
          shipmentId: shipment.id,
          createdById: rider1,
        },
      });
    }
  }

  const counterName = `awb:${dateKey}`;
  await prisma.$transaction([
    prisma.$executeRaw`INSERT INTO counters (name, value) VALUES (${counterName}, 0) ON DUPLICATE KEY UPDATE value = value`,
    prisma.$executeRaw`UPDATE counters SET value = GREATEST(value, 4) WHERE name = ${counterName}`,
  ]);

  const manifestNumber = await generateManifestNumber();
  await prisma.manifest.create({
    data: {
      manifestNumber,
      fromLocationId: bom,
      toLocationId: ccu,
      status: "IN_TRANSIT",
      vehicleNumber: "MH-04-GJ-9911",
      driverName: "Salim Shaikh",
      driverPhone: "+919876543210",
      scannedCount: 1,
      createdAt: h(22),
      items: { create: { shipmentId: (await prisma.shipment.findUniqueOrThrow({ where: { awbNumber: demo[1].awb } })).id } },
    },
  });

  const ticketNumber = await generateTicketNumber();
  await prisma.ticket.create({
    data: {
      ticketNumber,
      name: "Sanjay Patil",
      phone: "+919860000008",
      email: "sanjay@example.com",
      category: "DELAY",
      awbNumber: demo[3].awb,
      subject: "Parcel arrived a day late",
      message: "My shipment was promised in 3 days but took longer. Please explain the delay and share the route timeline.",
      assignedLocationId: bom,
      slaDueAt: new Date(now + 18 * 3_600_000),
      comments: {
        create: {
          authorName: "Sanjay Patil",
          authorRole: "CUSTOMER",
          visibility: "PUBLIC",
          message: "My shipment was promised in 3 days but took longer. Please explain the delay and share the route timeline.",
        },
      },
    },
  });
}

async function main() {
  console.log("Seeding SwiftLogix ERP demo data...");
  await seedZones();
  await seedPricingRules();
  const locationIds = await seedLocations();
  const userIds = await seedUsers(locationIds);
  await seedTemplates();
  await seedShifts(locationIds);
  await seedDemoData(locationIds, userIds);

  const users = await prisma.user.count();
  const locations = await prisma.location.count();
  const shipments = await prisma.shipment.count();
  console.log(`Seed complete: ${locations} locations, ${users} users, ${shipments} shipments.`);
  console.log("Login -> admin@swiftlogix.in / Admin@123  (Super Admin)");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
