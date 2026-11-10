export type Role =
  | "SUPER_ADMIN"
  | "BRANCH_MANAGER"
  | "HUB_MANAGER"
  | "COUNTER_STAFF"
  | "OPERATIONS"
  | "HR_ADMIN"
  | "RIDER"
  | "CUSTOMER";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type ShipmentStatus =
  | "BOOKED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "NDR"
  | "RETURNED"
  | "RTS"
  | "CANCELLED";

export type ServiceType = "STANDARD" | "EXPRESS" | "SURFACE";
export type PaymentMethod = "CASH" | "UPI_QR" | "RAZORPAY";
export type ParcelCategory = "DOCUMENT" | "GENERAL" | "FRAGILE" | "LIQUID" | "ELECTRONICS";
export type LocationType = "BRANCH" | "HUB";
export type ManifestStatus = "OPEN" | "IN_TRANSIT" | "CLOSED" | "RECEIVED";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TicketCategory = "DELAY" | "NON_DELIVERY" | "DAMAGED" | "ADDRESS_CHANGE" | "OTHER";
export type LeaveType = "CASUAL" | "SICK" | "EARNED";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE" | "LEAVE" | "WEEK_OFF";
export type TaskType = "DELIVERY" | "PICKUP";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
export type LedgerType = "CASH_IN" | "CASH_OUT" | "ADJUSTMENT";
export type NotifyChannel = "WHATSAPP" | "SMS";
export type NotifyStatus = "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
export type NdrReason =
  | "CUSTOMER_UNAVAILABLE"
  | "WRONG_ADDRESS"
  | "RESCHEDULED"
  | "REFUSED"
  | "DAMAGE"
  | "ADDRESS_UNTRACEABLE"
  | "OTHER";
export type NdrAction = "REATTEMPT" | "RETURN" | "REROUTE";

export type LocationRef = {
  id: string;
  name: string;
  type: string;
  city?: string | null;
  pincode?: string | null;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: UserStatus;
  locationId: string | null;
  location: LocationRef | null;
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  meta: PageMeta;
};

export type Party = {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state?: string | null;
};

export type ParcelInfo = {
  category: ParcelCategory;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  physicalWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  declaredValue: number;
  codAmount: number;
};

export type ShipmentCharges = {
  baseCharge: number;
  fuelSurcharge: number;
  codCharge: number;
  insuranceCharge: number;
  gstAmount: number;
  total: number;
};

export type PodInfo = {
  signatureUrl: string | null;
  photoUrl: string | null;
  recipientName: string | null;
  otpVerified: boolean;
  notes?: string | null;
  capturedAt: string;
};

export type RiderRef = {
  id: string;
  name: string;
  phone: string | null;
};

export type ShipmentLite = {
  id: string;
  awbNumber: string;
  status: ShipmentStatus;
  statusLabel: string;
  serviceType: ServiceType;
  bookingSource: string;
  receiverName: string;
  receiverCity: string;
  receiverPincode: string;
  senderName: string;
  senderCity: string;
  originLocation: LocationRef | null;
  destLocation: LocationRef | null;
  currentLocation: LocationRef | null;
  rider: RiderRef | null;
  chargeableWeight: number;
  codAmount: number;
  totalCharge: number;
  createdAt: string;
  deliveredAt: string | null;
};

export type ShipmentTimelineEntry = {
  status: ShipmentStatus;
  statusLabel: string;
  remarks: string | null;
  location: string | null;
  locationType: string | null;
  at: string;
};

export type ShipmentDetail = {
  id: string;
  awbNumber: string;
  status: ShipmentStatus;
  statusLabel: string;
  serviceType: ServiceType;
  bookingSource: string;
  sender: Party;
  receiver: Party;
  parcel: ParcelInfo;
  charges: ShipmentCharges;
  originLocation: LocationRef | null;
  destLocation: LocationRef | null;
  currentLocation: LocationRef | null;
  rider: RiderRef | null;
  timeline: ShipmentTimelineEntry[];
  pod: PodInfo | null;
  hasOtp: boolean;
  createdAt: string;
  updatedAt: string;
  pickedUpAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
};

export type DashboardStats = {
  date: string;
  totalBookings: number;
  todayBookings: number;
  inTransit: number;
  delivered: number;
  deliveredToday: number;
  ndr: number;
  outForDelivery: number;
  pendingPod: number;
  ridersActive: number;
  revenueToday: number;
  openTickets: number;
  pendingLeaves: number;
  openManifests: number;
  trend: { day: string; count: number }[];
};

export type Manifest = {
  id: string;
  manifestNumber: string;
  status: ManifestStatus;
  fromLocation: LocationRef | null;
  toLocation: LocationRef | null;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  scannedCount: number;
  closedBy: { id: string; name: string } | null;
  createdAt: string;
  closedAt: string | null;
  receivedAt: string | null;
};

export type ManifestItem = {
  scannedAt: string;
  shipment: ShipmentLite;
};

export type ManifestDetail = Manifest & {
  items: ManifestItem[];
};

export type RiderRow = {
  id: string;
  name: string;
  phone: string | null;
  status: UserStatus;
  location: LocationRef | null;
  vehicle: { vehicleType: string; vehicleNumber: string | null } | null;
  totalTasks: number;
  deliveredToday: number;
  pendingToday: number;
};

export type RiderTask = {
  id: string;
  type: TaskType;
  status: TaskStatus;
  sequence: number;
  awbNumber: string;
  shipmentStatus: ShipmentStatus;
  codAmount: number;
  otpRequired: boolean;
  customer: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
    city: string;
  };
  package: {
    category: ParcelCategory;
    physicalWeight: number;
    volumetricWeight: number;
    chargeableWeight: number;
  };
  originLocation: LocationRef | null;
  destLocation: LocationRef | null;
  currentLocation: LocationRef | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type Runsheet = {
  date: string;
  deliveries: RiderTask[];
  pickups: RiderTask[];
  pending: number;
  completed: number;
};

export type LedgerEntry = {
  id: string;
  type: LedgerType;
  amount: number;
  description: string;
  reference: string | null;
  by: string | null;
  at: string;
};

export type DayClosingInfo = {
  expectedAmount: number;
  closedAmount: number;
  difference: number;
  remarks: string | null;
  closedAt: string;
};

export type LedgerResponse = {
  locationId: string;
  date: string;
  entries: LedgerEntry[];
  totals: {
    cashIn: number;
    cashOut: number;
    adjustments: number;
    expectedClosing: number;
    count: number;
  };
  closing: DayClosingInfo | null;
};

export type ClosingRow = {
  id: string;
  date: string;
  expectedAmount: number;
  closedAmount: number;
  difference: number;
  remarks: string | null;
  closedBy: string | null;
  createdAt: string;
};

export type NdrRow = ShipmentLite & {
  lastNdr: {
    reason: NdrReason | string;
    remarks: string | null;
    action: NdrAction | string;
    at: string;
  } | null;
};

export type TicketComment = {
  id: string;
  ticketId: string;
  authorName: string;
  authorRole: string | null;
  visibility: "PUBLIC" | "INTERNAL";
  message: string;
  createdAt: string;
};

export type TicketRow = {
  id: string;
  ticketNumber: string;
  name: string;
  phone: string;
  email: string | null;
  category: TicketCategory;
  awbNumber: string | null;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedLocationId: string | null;
  assignedLocation: { id: string; name: string; city: string | null } | null;
  slaDueAt: string | null;
  slaRemainingMs: number | null;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  _count?: { comments: number };
};

export type TicketDetail = Omit<TicketRow, "slaRemainingMs" | "slaBreached" | "_count"> & {
  comments: TicketComment[];
};

export type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
  status: UserStatus;
  locationId: string | null;
  location: LocationRef | null;
  profile: { vehicleType: string; vehicleNumber: string | null } | null;
  createdAt: string;
};

export type AttendanceRow = {
  id: string;
  userId: string;
  user: { id: string; name: string; role: Role; phone: string | null; locationId: string | null };
  date: string;
  status: AttendanceStatus;
  inTime: string | null;
  outTime: string | null;
  source: string;
};

export type AttendanceResponse = {
  month: string;
  items: AttendanceRow[];
  summary: Record<string, number>;
};

export type MyAttendance = {
  today: {
    id: string;
    date: string;
    status: AttendanceStatus;
    inTime: string | null;
    outTime: string | null;
  } | null;
  recent: {
    id: string;
    date: string;
    status: AttendanceStatus;
    inTime: string | null;
    outTime: string | null;
  }[];
};

export type LeaveRow = {
  id: string;
  userId: string;
  user: { id: string; name: string; role: Role; locationId: string | null };
  type: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  approver: { id: string; name: string } | null;
  decidedAt: string | null;
  createdAt: string;
};

export type PayrollRow = {
  id: string;
  month: string;
  userId: string;
  user: { id: string; name: string; role: Role; phone: string | null };
  basic: number;
  hra: number;
  travelAllowance: number;
  otherEarnings: number;
  deductions: number;
  incentives: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  status: "DRAFT" | "PAID";
};

export type ShiftRow = {
  id: string;
  name: string;
  type: "MORNING" | "DAY" | "NIGHT";
  startTime: string;
  endTime: string;
  locationId: string | null;
};

export type RateRule = {
  id: string;
  serviceType: ServiceType;
  fromZone: string;
  toZone: string;
  baseCharge: number;
  perKgRate: number;
  minCharge: number;
  fuelPercent: number;
  codPercent: number;
  insurancePercent: number;
  gstPercent: number;
  estimatedDays: number;
  active: boolean;
  updatedAt: string;
};

export type RateZone = {
  id: string;
  code: string;
  name: string;
  pincodeCount: number;
};

export type RateCardsResponse = {
  rules: RateRule[];
  zones: RateZone[];
};

export type LocationRow = {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  staffCount: number;
  createdAt: string;
};

export type NotificationRow = {
  id: string;
  channel: NotifyChannel;
  recipient: string;
  template: string;
  title: string | null;
  body: string;
  status: NotifyStatus;
  providerRef: string | null;
  error: string | null;
  shipmentId: string | null;
  userId: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type CreateShipmentPayload = {
  sender: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
    city: string;
    state?: string;
  };
  receiver: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
    city: string;
    state?: string;
  };
  parcel: {
    category: ParcelCategory;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    physicalWeight: number;
    declaredValue: number;
    codAmount: number;
  };
  serviceType: ServiceType;
  paymentMethod: PaymentMethod;
  locationId?: string;
};

export type UpdateStatusPayload = {
  status: ShipmentStatus;
  remarks?: string;
  locationId?: string;
};

export type StaffPayload = {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: Role;
  locationId?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
};

export type RateRulePayload = {
  serviceType: ServiceType;
  fromZone?: string;
  toZone?: string;
  baseCharge: number;
  perKgRate: number;
  minCharge: number;
  fuelPercent?: number;
  codPercent?: number;
  insurancePercent?: number;
  gstPercent?: number;
  estimatedDays?: number;
  active?: boolean;
};

export type LocationPayload = {
  code: string;
  name: string;
  type: LocationType;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  parentId?: string | null;
  active?: boolean;
};
