export type TaskType = 'DELIVERY' | 'PICKUP';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type PunchAction = 'IN' | 'OUT';

export type SyncActionType = 'COMPLETE' | 'PUNCH' | 'SCAN';

export interface Party {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
}

export interface ShipmentPackage {
  category: string;
  physicalWeight: number;
  volumetricWeight: number;
}

export interface Task {
  id: string;
  type: TaskType;
  awbNumber: string;
  status: TaskStatus;
  sequence: number;
  codAmount?: number | null;
  otpRequired: boolean;
  receiver?: Party;
  sender?: Party;
  package: ShipmentPackage;
  createdAt: string;
}

export interface UserLocation {
  id: string;
  name: string;
  type: string;
  city?: string | null;
  address?: string | null;
}

export interface VehicleInfo {
  vehicleType?: string | null;
  vehicleNumber?: string | null;
}

export interface User {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string | null;
  location?: UserLocation | null;
  profile?: VehicleInfo | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Runsheet {
  date: string;
  deliveries: Task[];
  pickups: Task[];
}

export interface Attendance {
  id: string;
  action: PunchAction;
  inTime: string | null;
  outTime: string | null;
  createdAt: string;
}

export interface AttendanceToday {
  action: PunchAction;
  inTime: string | null;
  outTime: string | null;
  status?: string;
}

export interface RiderStats {
  deliveredToday: number;
  pickedToday: number;
  pendingToday: number;
  completedWeek: number;
}

export interface ProfileData {
  user: User;
  attendanceToday: AttendanceToday | null;
  stats: RiderStats;
}

export interface ScanShipment {
  awbNumber: string;
  status: TaskStatus;
  physicalWeight: number;
  otpRequired: boolean;
}

export interface ScanResult {
  task: Task;
  shipment: ScanShipment;
}

export interface CompletePayload {
  otp?: string;
  signatureUrl?: string;
  photoUrl?: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface SyncAction {
  localId: string;
  type: SyncActionType;
  taskId?: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface SyncResultItem {
  localId: string;
  status: 'SYNCED' | 'FAILED';
  message?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocalTaskState {
  status: TaskStatus;
  completedAt?: string;
  pendingSync?: boolean;
}
