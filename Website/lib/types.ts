export type ServiceType = "STANDARD" | "EXPRESS" | "SURFACE";

export type ParcelCategory =
  | "DOCUMENT"
  | "GENERAL"
  | "FRAGILE"
  | "LIQUID"
  | "ELECTRONICS";

export type PaymentMethod = "RAZORPAY" | "COD" | "UPI_QR";

export type TicketCategory =
  | "DELAY"
  | "NON_DELIVERY"
  | "DAMAGED"
  | "ADDRESS_CHANGE"
  | "OTHER";

export type ShipmentStatus =
  | "BOOKED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "NDR"
  | "RETURNED"
  | "CANCELLED";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface Party {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state?: string;
}

export interface TrackingLocation {
  name: string;
  type: string;
}

export interface TimelineEvent {
  status: string;
  remarks: string;
  location: string;
  at: string;
}

export interface ChargeBreakdown {
  baseCharge: number;
  fuelSurcharge: number;
  codCharge: number;
  insuranceCharge: number;
  gstAmount: number;
  total: number;
}

export interface TrackingParcel {
  category?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  physicalWeight?: number;
  volumetricWeight?: number;
  declaredValue?: number;
  codAmount?: number;
  description?: string;
}

export interface TrackingDetails {
  awbNumber: string;
  status: string;
  serviceType: string;
  createdAt: string;
  deliveredAt?: string | null;
  sender: Party;
  receiver: Party;
  originLocation?: TrackingLocation;
  destLocation?: TrackingLocation;
  currentLocation?: TrackingLocation;
  estimatedDelivery?: string | null;
  timeline: TimelineEvent[];
  parcel?: TrackingParcel | null;
  charges?: ChargeBreakdown | null;
}

export interface QuoteRequest {
  originPincode: string;
  destPincode: string;
  weight: number;
  serviceType: ServiceType;
  codAmount: number;
}

export interface QuoteResponse extends ChargeBreakdown {
  estimatedDays: number;
}

export interface BookingParcelInput {
  category: ParcelCategory;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  physicalWeight: number;
  declaredValue: number;
  codAmount: number;
}

export interface BookingRequest {
  sender: Party & { state: string };
  receiver: Party & { state: string };
  parcel: BookingParcelInput;
  serviceType: ServiceType;
  paymentMethod: PaymentMethod;
}

export interface RazorpayOrderInfo {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface BookingResponse {
  awbNumber: string;
  shipment: Record<string, unknown>;
  payment?: RazorpayOrderInfo;
}

export interface PaymentVerifyRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  awbNumber: string;
}

export interface PaymentVerifyResponse {
  ok: boolean;
  awbNumber: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  email?: string;
  password: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface TicketRequest {
  name: string;
  phone: string;
  email?: string;
  category: TicketCategory;
  awbNumber?: string;
  subject: string;
  message: string;
}

export interface TicketComment {
  author: string;
  role: string;
  message: string;
  visibility: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  status: TicketStatus | string;
  createdAt: string;
  updatedAt?: string;
  category?: TicketCategory | string;
  subject?: string;
  message?: string;
  awbNumber?: string | null;
  comments?: TicketComment[];
}

export interface TicketResponse {
  ticket: Ticket;
}
