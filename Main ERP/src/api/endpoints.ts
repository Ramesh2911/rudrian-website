import { api } from "./client";
import type {
  AttendanceResponse,
  AuthUser,
  ClosingRow,
  CreateShipmentPayload,
  DashboardStats,
  LedgerResponse,
  LocationPayload,
  LocationRow,
  Manifest,
  ManifestDetail,
  MyAttendance,
  NdrRow,
  NotificationRow,
  PageMeta,
  Paginated,
  PayrollRow,
  RateCardsResponse,
  RateRule,
  RateRulePayload,
  LeaveRow,
  RiderRow,
  Runsheet,
  Session,
  ShiftRow,
  ShipmentDetail,
  ShipmentLite,
  StaffPayload,
  StaffRow,
  TicketDetail,
  TicketRow,
  UpdateStatusPayload,
} from "./types";

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const str = sp.toString();
  return str ? `?${str}` : "";
}

export const authApi = {
  login: (identifier: string, password: string): Promise<Session> =>
    api.post<Session>("/auth/login", { identifier, password }),
  me: (): Promise<AuthUser> => api.get<AuthUser>("/auth/me"),
  logout: (refreshToken?: string): Promise<{ ok: boolean }> =>
    api.post<{ ok: boolean }>("/auth/logout", refreshToken ? { refreshToken } : {}),
};

export const dashboardApi = {
  stats: (): Promise<DashboardStats> => api.get<DashboardStats>("/dashboard/stats"),
};

export type ShipmentListParams = {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  phone?: string;
  serviceType?: string;
};

export const shipmentsApi = {
  list: (params: ShipmentListParams = {}): Promise<Paginated<ShipmentLite>> =>
    api.get<Paginated<ShipmentLite>>(`/shipments${qs(params)}`),
  get: (id: string): Promise<ShipmentDetail> => api.get<ShipmentDetail>(`/shipments/${encodeURIComponent(id)}`),
  create: (payload: CreateShipmentPayload): Promise<ShipmentDetail> => api.post<ShipmentDetail>("/shipments", payload),
  updateStatus: (id: string, payload: UpdateStatusPayload): Promise<ShipmentDetail> =>
    api.post<ShipmentDetail>(`/shipments/${encodeURIComponent(id)}/status`, payload),
  pods: (page = 1, limit = 20): Promise<Paginated<ShipmentLite & { pod: ShipmentDetail["pod"] }>> =>
    api.get<Paginated<ShipmentLite & { pod: ShipmentDetail["pod"] }>>(`/shipments/pods${qs({ page, limit })}`),
};

export const manifestsApi = {
  list: (params: { status?: string; locationId?: string; page?: number; limit?: number } = {}): Promise<Paginated<Manifest>> =>
    api.get<Paginated<Manifest>>(`/manifests${qs(params)}`),
  get: (id: string): Promise<ManifestDetail> => api.get<ManifestDetail>(`/manifests/${encodeURIComponent(id)}`),
  create: (payload: {
    fromLocationId: string;
    toLocationId: string;
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
  }): Promise<Manifest> => api.post<Manifest>("/manifests", payload),
  addItem: (id: string, awbNumber: string): Promise<{ manifest: Manifest; added: ShipmentDetail }> =>
    api.post<{ manifest: Manifest; added: ShipmentDetail }>(`/manifests/${encodeURIComponent(id)}/items`, { awbNumber }),
  close: (id: string): Promise<Manifest> => api.post<Manifest>(`/manifests/${encodeURIComponent(id)}/close`),
  receive: (id: string): Promise<Manifest> => api.post<Manifest>(`/manifests/${encodeURIComponent(id)}/receive`),
};

export const ridersApi = {
  list: (locationId?: string): Promise<{ items: RiderRow[] }> =>
    api.get<{ items: RiderRow[] }>(`/riders${qs({ locationId })}`),
  tasks: (id: string, date?: string): Promise<Runsheet> =>
    api.get<Runsheet>(`/riders/${encodeURIComponent(id)}/tasks${qs({ date })}`),
  assign: (id: string, awbNumber: string): Promise<{ task: unknown; shipment: ShipmentDetail }> =>
    api.post<{ task: unknown; shipment: ShipmentDetail }>(`/riders/${encodeURIComponent(id)}/assign`, { awbNumber }),
  unassign: (id: string, awbNumber: string): Promise<ShipmentLite> =>
    api.post<ShipmentLite>(`/riders/${encodeURIComponent(id)}/unassign`, { awbNumber }),
};

export const posApi = {
  createBooking: (payload: CreateShipmentPayload & { locationId?: string }): Promise<{ shipment: ShipmentDetail; ledgerEntry: unknown }> =>
    api.post<{ shipment: ShipmentDetail; ledgerEntry: unknown }>("/pos/bookings", payload),
  ledger: (params: { date?: string; locationId?: string } = {}): Promise<LedgerResponse> =>
    api.get<LedgerResponse>(`/pos/ledger${qs(params)}`),
  closeDay: (payload: { date?: string; closedAmount: number; remarks?: string }): Promise<unknown> =>
    api.post<unknown>("/pos/closings", payload),
  closings: (params: { month?: string; locationId?: string } = {}): Promise<{ items: ClosingRow[] }> =>
    api.get<{ items: ClosingRow[] }>(`/pos/closings${qs(params)}`),
  search: (awb: string): Promise<ShipmentDetail> => api.get<ShipmentDetail>(`/pos/search${qs({ awb })}`),
};

export const ndrApi = {
  list: (params: { page?: number; limit?: number } = {}): Promise<Paginated<NdrRow>> =>
    api.get<Paginated<NdrRow>>(`/ndr${qs(params)}`),
  attempt: (
    shipmentId: string,
    payload: { reason: string; remarks?: string; nextAttemptDate?: string; action: string },
  ): Promise<ShipmentDetail> => api.post<ShipmentDetail>(`/ndr/${encodeURIComponent(shipmentId)}/attempt`, payload),
};

export const ticketsApi = {
  list: (params: { status?: string; search?: string; locationId?: string; page?: number; limit?: number } = {}): Promise<
    Paginated<TicketRow>
  > => api.get<Paginated<TicketRow>>(`/tickets${qs(params)}`),
  get: (id: string): Promise<TicketDetail> => api.get<TicketDetail>(`/tickets/${encodeURIComponent(id)}`),
  create: (payload: {
    name: string;
    phone: string;
    email?: string;
    category: string;
    awbNumber?: string;
    subject: string;
    message: string;
  }): Promise<TicketRow> => api.post<TicketRow>("/tickets", payload),
  comment: (id: string, message: string, visibility: "PUBLIC" | "INTERNAL" = "PUBLIC"): Promise<unknown> =>
    api.post<unknown>(`/tickets/${encodeURIComponent(id)}/comment`, { message, visibility }),
  updateStatus: (id: string, status: string): Promise<TicketRow> =>
    api.post<TicketRow>(`/tickets/${encodeURIComponent(id)}/status`, { status }),
  assign: (id: string, locationId: string): Promise<TicketRow> =>
    api.post<TicketRow>(`/tickets/${encodeURIComponent(id)}/assign`, { locationId }),
};

export const staffApi = {
  list: (params: { search?: string; role?: string; locationId?: string; status?: string; page?: number; limit?: number } = {}): Promise<
    Paginated<StaffRow>
  > => api.get<Paginated<StaffRow>>(`/staff${qs(params)}`),
  create: (payload: StaffPayload): Promise<StaffRow> => api.post<StaffRow>("/staff", payload),
  update: (id: string, payload: Partial<StaffPayload> & { status?: "ACTIVE" | "INACTIVE" }): Promise<StaffRow> =>
    api.put<StaffRow>(`/staff/${encodeURIComponent(id)}`, payload),
};

export const hrmsApi = {
  attendance: (params: { month?: string; date?: string; userId?: string; locationId?: string } = {}): Promise<AttendanceResponse> =>
    api.get<AttendanceResponse>(`/attendance${qs(params)}`),
  punch: (action: "IN" | "OUT"): Promise<unknown> => api.post<unknown>("/attendance/punch", { action }),
  me: (): Promise<MyAttendance> => api.get<MyAttendance>("/attendance/me"),
  leaves: (params: { month?: string; status?: string } = {}): Promise<{ month: string; items: LeaveRow[] }> =>
    api.get<{ month: string; items: LeaveRow[] }>(`/leaves${qs(params)}`),
  createLeave: (payload: { type: string; fromDate: string; toDate: string; reason: string }): Promise<LeaveRow> =>
    api.post<LeaveRow>("/leaves", payload),
  decideLeave: (id: string, action: "APPROVE" | "REJECT"): Promise<LeaveRow> =>
    api.post<LeaveRow>(`/leaves/${encodeURIComponent(id)}/approve`, { action }),
  payroll: (params: { month?: string } = {}): Promise<{ month: string; items: PayrollRow[]; totals: { gross: number; count: number } }> =>
    api.get<{ month: string; items: PayrollRow[]; totals: { gross: number; count: number } }>(`/payroll${qs(params)}`),
  runPayroll: (month?: string): Promise<{ month: string; generated: number; workingDays: number }> =>
    api.post<{ month: string; generated: number; workingDays: number }>("/payroll/run", month ? { month } : {}),
  shifts: (): Promise<{ items: ShiftRow[] }> => api.get<{ items: ShiftRow[] }>("/shifts"),
};

export const rateCardsApi = {
  list: (): Promise<RateCardsResponse> => api.get<RateCardsResponse>("/rate-cards"),
  create: (payload: RateRulePayload): Promise<RateRule> => api.post<RateRule>("/rate-cards", payload),
  update: (id: string, payload: Partial<RateRulePayload>): Promise<RateRule> =>
    api.put<RateRule>(`/rate-cards/${encodeURIComponent(id)}`, payload),
};

export const locationsApi = {
  list: (params: { type?: string; all?: boolean } = {}): Promise<LocationRow[]> =>
    api.get<LocationRow[]>(`/locations${qs({ type: params.type, all: params.all ? "true" : undefined })}`),
  create: (payload: LocationPayload): Promise<LocationRow> => api.post<LocationRow>("/locations", payload),
  update: (id: string, payload: Partial<LocationPayload>): Promise<LocationRow> =>
    api.put<LocationRow>(`/locations/${encodeURIComponent(id)}`, payload),
};

export const notificationsApi = {
  list: (params: { search?: string; channel?: string; status?: string; page?: number; limit?: number } = {}): Promise<
    Paginated<NotificationRow>
  > => api.get<Paginated<NotificationRow>>(`/notifications${qs(params)}`),
};

export type { PageMeta };
