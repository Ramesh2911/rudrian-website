export const PERMISSIONS = [
  "dashboard:read",
  "shipments:read",
  "shipments:create",
  "shipments:update",
  "shipments:status",
  "manifests:read",
  "manifests:manage",
  "riders:read",
  "riders:manage",
  "ndr:manage",
  "pos:use",
  "ledger:read",
  "tickets:read",
  "tickets:manage",
  "staff:read",
  "staff:manage",
  "hrms:read",
  "hrms:manage",
  "ratecards:read",
  "ratecards:manage",
  "locations:manage",
  "notifications:read",
  "pods:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const SUPER_ADMIN: Permission | "*" = "*";

const BRANCH_MANAGER: Permission[] = [
  "dashboard:read",
  "shipments:read",
  "shipments:create",
  "shipments:update",
  "shipments:status",
  "manifests:read",
  "manifests:manage",
  "riders:read",
  "riders:manage",
  "ndr:manage",
  "pos:use",
  "ledger:read",
  "tickets:read",
  "tickets:manage",
  "staff:read",
  "hrms:read",
  "hrms:manage",
  "ratecards:read",
  "notifications:read",
  "pods:read",
];

const HUB_MANAGER: Permission[] = [
  "dashboard:read",
  "shipments:read",
  "shipments:status",
  "manifests:read",
  "manifests:manage",
  "riders:read",
  "ndr:manage",
  "tickets:read",
  "tickets:manage",
  "notifications:read",
  "pods:read",
];

const COUNTER_STAFF: Permission[] = [
  "dashboard:read",
  "shipments:read",
  "shipments:create",
  "pos:use",
  "ledger:read",
  "tickets:read",
];

const OPERATIONS: Permission[] = [
  "dashboard:read",
  "shipments:read",
  "shipments:create",
  "shipments:update",
  "shipments:status",
  "manifests:read",
  "manifests:manage",
  "riders:read",
  "ndr:manage",
  "tickets:read",
];

const HR_ADMIN: Permission[] = [
  "dashboard:read",
  "staff:read",
  "staff:manage",
  "hrms:read",
  "hrms:manage",
  "notifications:read",
];

export const ROLE_PERMISSIONS: Record<string, Permission[] | "*"> = {
  SUPER_ADMIN,
  BRANCH_MANAGER,
  HUB_MANAGER,
  COUNTER_STAFF,
  OPERATIONS,
  HR_ADMIN,
  RIDER: [],
  CUSTOMER: [],
};

export function roleHasPermission(role: string, permission: Permission): boolean {
  const granted = ROLE_PERMISSIONS[role];
  if (!granted) return false;
  if (granted === "*") return true;
  return granted.includes(permission);
}
