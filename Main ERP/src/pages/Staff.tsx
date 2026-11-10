import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus, Search, UserCog, UserRound, Users } from "lucide-react";
import { locationsApi, staffApi } from "../api/endpoints";
import type { Role, StaffPayload, StaffRow, UserStatus } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { useToast } from "../components/ui/Toast";
import { formatDate, titleCase } from "../lib/format";

const STAFF_ROLES: Role[] = [
  "SUPER_ADMIN",
  "BRANCH_MANAGER",
  "HUB_MANAGER",
  "COUNTER_STAFF",
  "OPERATIONS",
  "HR_ADMIN",
  "RIDER",
];

const ROLE_STYLE: Record<Role, { pill: string; gradient: string }> = {
  SUPER_ADMIN: { pill: "bg-slate-500/12 text-slate-600", gradient: "bg-gradient-to-br from-[#475569] to-[#64748b]" },
  BRANCH_MANAGER: { pill: "bg-indigo-500/12 text-indigo-600", gradient: "bg-gradient-to-br from-[#6366f1] to-[#818cf8]" },
  HUB_MANAGER: { pill: "bg-violet-500/12 text-violet-600", gradient: "bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa]" },
  COUNTER_STAFF: { pill: "bg-sky-500/12 text-sky-600", gradient: "bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8]" },
  OPERATIONS: { pill: "bg-[#f59e0b]/12 text-[#b45309]", gradient: "bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]" },
  HR_ADMIN: { pill: "bg-rose-500/12 text-rose-600", gradient: "bg-gradient-to-br from-[#f43f5e] to-[#fb7185]" },
  RIDER: { pill: "bg-[#12b2aa]/12 text-[#0b7a75]", gradient: "bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]" },
  CUSTOMER: { pill: "bg-emerald-500/12 text-emerald-600", gradient: "bg-gradient-to-br from-[#10b981] to-[#34d399]" },
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: Role;
  locationId: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  email: "",
  password: "",
  role: "COUNTER_STAFF",
  locationId: "",
  vehicleType: "BIKE",
  vehicleNumber: "",
  licenseNumber: "",
};

const TEAL = "focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CountCard({
  label,
  value,
  icon,
  gradient,
  ring,
  active,
  onClick,
}: {
  label: string;
  value: number | undefined;
  icon: ReactNode;
  gradient: string;
  ring: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift focus:outline-none ${
        active ? `border-transparent ring-2 ring-offset-2 ring-offset-page ${ring}` : "border-line"
      }`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-[24px] opacity-[0.08] transition-transform duration-300 group-hover:scale-125 ${gradient}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
            {value === undefined ? "—" : value}
          </p>
        </div>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 ${gradient}`}
        >
          {icon}
        </span>
      </div>
    </button>
  );
}

export function StaffPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => locationsApi.list({ all: true }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["staff", "list", { page, search, role }],
    queryFn: () =>
      staffApi.list({ page, limit: 20, search: search || undefined, role: role || undefined }),
  });

  const totalQ = useQuery({
    queryKey: ["staff", "count", "total"],
    queryFn: () => staffApi.list({ limit: 1 }),
    select: (d) => d.meta.total,
  });
  const riderQ = useQuery({
    queryKey: ["staff", "count", "RIDER"],
    queryFn: () => staffApi.list({ limit: 1, role: "RIDER" }),
    select: (d) => d.meta.total,
  });
  const counterQ = useQuery({
    queryKey: ["staff", "count", "COUNTER_STAFF"],
    queryFn: () => staffApi.list({ limit: 1, role: "COUNTER_STAFF" }),
    select: (d) => d.meta.total,
  });
  const managerQ = useQuery({
    queryKey: ["staff", "count", "BRANCH_MANAGER"],
    queryFn: () => staffApi.list({ limit: 1, role: "BRANCH_MANAGER" }),
    select: (d) => d.meta.total,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: StaffRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      phone: row.phone,
      email: row.email ?? "",
      password: "",
      role: row.role,
      locationId: row.locationId ?? "",
      vehicleType: row.profile?.vehicleType ?? "BIKE",
      vehicleNumber: row.profile?.vehicleNumber ?? "",
      licenseNumber: "",
    });
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (payload: StaffPayload) => staffApi.create(payload),
    onSuccess: (user) => {
      toast.success(`${user.name} added to staff`);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create staff"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<StaffPayload> & { status?: UserStatus } }) =>
      staffApi.update(id, payload),
    onSuccess: () => {
      toast.success("Staff member updated");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update staff"),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => staffApi.update(id, { status }),
    onSuccess: () => {
      toast.success("Status changed");
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not change status"),
  });

  const buildPayload = (): StaffPayload => {
    const base: StaffPayload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      role: form.role,
      locationId: form.locationId || undefined,
    };
    if (form.role === "RIDER") {
      base.vehicleType = form.vehicleType;
      base.vehicleNumber = form.vehicleNumber || undefined;
      base.licenseNumber = form.licenseNumber || undefined;
    }
    if (!editing || form.password) base.password = form.password;
    return base;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (editing) updateMutation.mutate({ id: editing.id, payload });
    else createMutation.mutate(payload);
  };

  const setRoleFilter = (value: string) => {
    setRole(value);
    setPage(1);
  };

  const columns: DataTableColumn<StaffRow>[] = [
    {
      key: "name",
      header: "Staff member",
      sortValue: (row) => row.name,
      cellClassName: "min-w-[210px]",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white shadow-soft transition-transform duration-300 group-hover:scale-105 ${
              ROLE_STYLE[row.role]?.gradient ?? ROLE_STYLE.COUNTER_STAFF.gradient
            }`}
          >
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{row.name}</p>
            {row.profile ? (
              <p className="truncate text-[11px] text-muted">
                {row.profile.vehicleType} {row.profile.vehicleNumber ?? ""}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (row) => (
        <div>
          <p className="text-sm text-ink">{row.phone}</p>
          <p className="text-[11px] text-muted">{row.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (row) => row.role,
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            ROLE_STYLE[row.role]?.pill ?? ROLE_STYLE.COUNTER_STAFF.pill
          }`}
        >
          {titleCase(row.role)}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      sortValue: (row) => row.location?.name ?? "",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-body">
          <Building2 className="h-3.5 w-3.5 text-muted" />
          {row.location?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      render: (row) =>
        row.status === "ACTIVE" ? (
          <span className="inline-flex rounded-full bg-gradient-to-r from-[#16a34a]/15 to-[#4ade80]/15 px-2.5 py-0.5 text-[11px] font-bold text-success ring-1 ring-[#16a34a]/30">
            ACTIVE
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-slate-500/12 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-400/30">
            {row.status}
          </span>
        ),
    },
    {
      key: "joined",
      header: "Joined",
      align: "right",
      sortValue: (row) => row.createdAt,
      render: (row) => <span className="text-xs text-body">{formatDate(row.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 cursor-pointer transition hover:border-[#12b2aa]! hover:text-[#0b7a75]"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
            icon={<Pencil className="h-3.5 w-3.5" />}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 cursor-pointer"
            loading={toggleStatus.isPending}
            onClick={(e) => {
              e.stopPropagation();
              toggleStatus.mutate({
                id: row.id,
                status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
              });
            }}
            icon={<UserCog className="h-3.5 w-3.5" />}
          >
            {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  const counts: {
    value: string;
    label: string;
    icon: ReactNode;
    gradient: string;
    ring: string;
    count: number | undefined;
    filter: string;
  }[] = [
    {
      value: "total",
      label: "Total staff",
      icon: <Users className="h-5 w-5" />,
      gradient: "bg-gradient-to-br from-[#2563eb] to-[#4f46e5]",
      ring: "ring-[#2563eb]/55",
      count: totalQ.data,
      filter: "",
    },
    {
      value: "RIDER",
      label: "Riders",
      icon: <UserRound className="h-5 w-5" />,
      gradient: ROLE_STYLE.RIDER.gradient,
      ring: "ring-[#12b2aa]/55",
      count: riderQ.data,
      filter: "RIDER",
    },
    {
      value: "COUNTER_STAFF",
      label: "Counter staff",
      icon: <Building2 className="h-5 w-5" />,
      gradient: ROLE_STYLE.COUNTER_STAFF.gradient,
      ring: "ring-[#0ea5e9]/55",
      count: counterQ.data,
      filter: "COUNTER_STAFF",
    },
    {
      value: "BRANCH_MANAGER",
      label: "Branch managers",
      icon: <UserCog className="h-5 w-5" />,
      gradient: ROLE_STYLE.BRANCH_MANAGER.gradient,
      ring: "ring-[#6366f1]/55",
      count: managerQ.data,
      filter: "BRANCH_MANAGER",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Command bar */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c4a6e] via-[#0e7490] to-[#0b1220] p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.3),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">People</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Staff</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Manage internal users, roles and branch assignments.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Users className="h-3.5 w-3.5 text-[#7dd3fc]" />
              {data ? data.meta.total : "—"} on this page view
            </span>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-ink shadow-lift transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(0,0,0,0.5)]"
          >
            <Plus className="h-4 w-4 text-[#0e7490]" />
            Add staff
          </button>
        </div>
      </section>

      {/* Count cards (clickable role filters) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((c) => (
          <CountCard
            key={c.value}
            label={c.label}
            value={c.count}
            icon={c.icon}
            gradient={c.gradient}
            ring={c.ring}
            active={role === c.filter}
            onClick={() => setRoleFilter(role === c.filter ? "" : c.filter)}
          />
        ))}
      </div>

      {/* List */}
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone or email…"
              className={`pl-9 ${TEAL}`}
              aria-label="Search staff"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRoleFilter("")}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                role === ""
                  ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-14px_rgba(18,178,170,0.9)]"
                  : "border border-line bg-card text-body hover:border-[#12b2aa]/45 hover:text-[#0b7a75]"
              }`}
            >
              All roles
            </button>
            {STAFF_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(role === r ? "" : r)}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                  role === r
                    ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-14px_rgba(18,178,170,0.9)]"
                    : "border border-line bg-card text-body hover:border-[#12b2aa]/45 hover:text-[#0b7a75]"
                }`}
              >
                {titleCase(r)}
              </button>
            ))}
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          skeletonRows={6}
          minWidth="min-w-[1060px]"
          onRowClick={(row) => openEdit(row)}
          empty={
            <EmptyState
              title="No staff found"
              description="Add your first staff member to get started."
              icon={<Users className="h-6 w-6" />}
              action={
                <Button size="sm" className="cursor-pointer" onClick={openCreate}>
                  Add staff
                </Button>
              }
            />
          }
        />
        {data && data.meta.totalPages > 1 ? (
          <div className="px-4 pb-4">
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPage={setPage}
            />
          </div>
        ) : null}
      </Card>

      {/* Add / edit modal */}
      <Modal
        open={open}
        title={editing ? `Edit ${editing.name}` : "Add staff"}
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" className="cursor-pointer" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="staff-form"
              className="shine cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Save changes" : "Create staff"}
            </Button>
          </>
        }
      >
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#12b2aa]/25 bg-gradient-to-r from-[#12b2aa]/10 to-transparent p-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft">
            <Users className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">
              {editing ? "Update staff profile" : "New team member"}
            </p>
            <p className="text-xs text-muted">
              {editing
                ? "Change role, assignment or credentials."
                : "Role, location and rider vehicle details go over the API."}
            </p>
          </div>
        </div>
        <form id="staff-form" className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              minLength={2}
              className={TEAL}
            />
            <Input
              label="Phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputMode="numeric"
              className={TEAL}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={TEAL}
            />
            <Input
              label={editing ? "New password (optional)" : "Password"}
              type="password"
              required={!editing}
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? "Leave blank to keep current" : "Min 6 characters"}
              className={TEAL}
            />
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className={TEAL}
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {titleCase(r)}
                </option>
              ))}
            </Select>
            <Select
              label="Location"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              placeholder="Select location"
              className={TEAL}
            >
              {(locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </Select>
            {form.role === "RIDER" ? (
              <>
                <Select
                  label="Vehicle type"
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                  className={TEAL}
                >
                  {["BIKE", "CYCLE", "SCOOTER", "VAN", "TRUCK"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Vehicle number"
                  value={form.vehicleNumber}
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                  placeholder="Optional"
                  className={TEAL}
                />
                <Input
                  label="License number"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  placeholder="Optional"
                  className={TEAL}
                />
              </>
            ) : null}
          </div>
          <button type="submit" className="hidden">
            Submit
          </button>
        </form>
      </Modal>
    </div>
  );
}
