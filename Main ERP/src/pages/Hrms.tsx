import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  Award,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Fingerprint,
  PlayCircle,
  Stethoscope,
  Sun,
  Wallet,
  XCircle,
} from "lucide-react";
import { hrmsApi } from "../api/endpoints";
import type { AttendanceRow, LeaveRow, LeaveType, PayrollRow } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { Textarea } from "../components/ui/Textarea";
import { useToast } from "../components/ui/Toast";
import { formatCurrency, formatDateTime, formatTime, thisMonthKey, titleCase } from "../lib/format";
import { useAuth } from "../store/auth";

const TEAL = "focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15";

const ATT_PILL: Record<string, string> = {
  PRESENT: "bg-success-bg text-success ring-1 ring-[#16a34a]/30",
  ABSENT: "bg-danger-bg text-danger ring-1 ring-[#dc2626]/30",
  HALF_DAY: "bg-[#f59e0b]/12 text-[#b45309] ring-1 ring-[#f59e0b]/35",
  LATE: "bg-sky-500/12 text-sky-600 ring-1 ring-sky-500/35",
  LEAVE: "bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/35",
  WEEK_OFF: "bg-slate-500/12 text-slate-500 ring-1 ring-slate-400/35",
};

const ATT_TILE: Record<string, { gradient: string; dot: string }> = {
  PRESENT: { gradient: "bg-gradient-to-br from-[#16a34a] to-[#4ade80]", dot: "bg-[#16a34a]" },
  ABSENT: { gradient: "bg-gradient-to-br from-[#dc2626] to-[#f87171]", dot: "bg-[#dc2626]" },
  HALF_DAY: { gradient: "bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]", dot: "bg-[#f59e0b]" },
  LATE: { gradient: "bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8]", dot: "bg-[#0ea5e9]" },
  LEAVE: { gradient: "bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa]", dot: "bg-[#8b5cf6]" },
  WEEK_OFF: { gradient: "bg-gradient-to-br from-[#64748b] to-[#94a3b8]", dot: "bg-[#64748b]" },
};

const LEAVE_STATUS_PILL: Record<string, string> = {
  PENDING: "bg-[#f59e0b]/12 text-[#b45309] ring-1 ring-[#f59e0b]/35",
  APPROVED: "bg-success-bg text-success ring-1 ring-[#16a34a]/30",
  REJECTED: "bg-danger-bg text-danger ring-1 ring-[#dc2626]/30",
};

const LEAVE_TYPE_STYLE: Record<LeaveType, { pill: string; icon: ReactNode }> = {
  CASUAL: { pill: "bg-sky-500/12 text-sky-600 ring-1 ring-sky-500/35", icon: <Sun className="h-3.5 w-3.5" /> },
  SICK: { pill: "bg-rose-500/12 text-rose-600 ring-1 ring-rose-500/35", icon: <Stethoscope className="h-3.5 w-3.5" /> },
  EARNED: {
    pill: "bg-success-bg text-success ring-1 ring-[#16a34a]/30",
    icon: <Award className="h-3.5 w-3.5" />,
  },
};

const SHIFT_STYLE: Record<string, { gradient: string; pill: string }> = {
  MORNING: { gradient: "bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]", pill: "bg-[#f59e0b]/12 text-[#b45309]" },
  DAY: { gradient: "bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8]", pill: "bg-sky-500/12 text-sky-600" },
  NIGHT: { gradient: "bg-gradient-to-br from-[#6366f1] to-[#818cf8]", pill: "bg-indigo-500/12 text-indigo-600" },
};

const TAB_ITEMS = [
  { id: "attendance", label: "Attendance", icon: <Clock3 className="h-4 w-4" /> },
  { id: "leaves", label: "Leaves", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "payroll", label: "Payroll", icon: <Wallet className="h-4 w-4" /> },
  { id: "shifts", label: "Shifts", icon: <AlarmClock className="h-4 w-4" /> },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function daysBetween(from: string, to: string): number {
  const d = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  return Number.isFinite(d) && d >= 0 ? d + 1 : 0;
}

export function HrmsPage() {
  const user = useAuth((s) => s.user);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("attendance");
  const [month, setMonth] = useState(thisMonthKey());
  const [date, setDate] = useState("");
  const [leaveMonth, setLeaveMonth] = useState(thisMonthKey());
  const [leaveStatus, setLeaveStatus] = useState("");
  const [payrollMonth, setPayrollMonth] = useState(thisMonthKey());

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("CASUAL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["hrms", "attendance", { month, date }],
    queryFn: () => hrmsApi.attendance({ month, date: date || undefined }),
  });

  const { data: me } = useQuery({
    queryKey: ["hrms", "attendance-me"],
    queryFn: () => hrmsApi.me(),
  });

  const { data: leaves, isLoading: leavesLoading } = useQuery({
    queryKey: ["hrms", "leaves", { month: leaveMonth, status: leaveStatus }],
    queryFn: () => hrmsApi.leaves({ month: leaveMonth, status: leaveStatus || undefined }),
  });

  const { data: payroll, isLoading: payrollLoading } = useQuery({
    queryKey: ["hrms", "payroll", payrollMonth],
    queryFn: () => hrmsApi.payroll({ month: payrollMonth }),
    enabled: tab === "payroll",
  });

  const { data: shifts } = useQuery({
    queryKey: ["hrms", "shifts"],
    queryFn: () => hrmsApi.shifts(),
    enabled: tab === "shifts",
  });

  const invalidateHrms = () => {
    void queryClient.invalidateQueries({ queryKey: ["hrms"] });
  };

  const punch = useMutation({
    mutationFn: (action: "IN" | "OUT") => hrmsApi.punch(action),
    onSuccess: (_data, action) => {
      toast.success(action === "IN" ? "Punched in" : "Punched out");
      invalidateHrms();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Punch failed"),
  });

  const createLeave = useMutation({
    mutationFn: () => hrmsApi.createLeave({ type: leaveType, fromDate, toDate, reason: leaveReason }),
    onSuccess: () => {
      toast.success("Leave request submitted");
      setLeaveOpen(false);
      setLeaveReason("");
      setFromDate("");
      setToDate("");
      invalidateHrms();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not submit leave"),
  });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "APPROVE" | "REJECT" }) =>
      hrmsApi.decideLeave(id, action),
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "APPROVE" ? "Leave approved" : "Leave rejected");
      invalidateHrms();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action failed"),
  });

  const runPayroll = useMutation({
    mutationFn: () => hrmsApi.runPayroll(payrollMonth),
    onSuccess: (res) => {
      toast.success(`Payroll generated for ${res.month} (${res.generated} staff)`);
      invalidateHrms();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Payroll run failed"),
  });

  const canManage =
    user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN" || user?.role === "BRANCH_MANAGER";

  const submitLeave = () => {
    if (!fromDate || !toDate) {
      toast.error("Select both leave dates");
      return;
    }
    if (toDate < fromDate) {
      toast.error("To date must be on or after From date");
      return;
    }
    if (leaveReason.trim().length < 5) {
      toast.error("Reason must be at least 5 characters");
      return;
    }
    createLeave.mutate();
  };

  const leaveDays = fromDate && toDate && toDate >= fromDate ? daysBetween(fromDate, toDate) : 0;
  const pendingCount = leaves?.items.filter((l) => l.status === "PENDING").length ?? 0;
  const attendanceRows = attendance?.items ?? [];
  const leaveRows = leaves?.items ?? [];
  const payrollRows = payroll?.items ?? [];

  const attCols: DataTableColumn<AttendanceRow>[] = [
    {
      key: "date",
      header: "Date",
      sortValue: (row) => row.date,
      render: (row) => <span className="text-xs font-semibold text-ink">{formatDateTime(row.date)}</span>,
    },
    {
      key: "employee",
      header: "Employee",
      sortValue: (row) => row.user.name,
      cellClassName: "min-w-[170px]",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[11px] font-bold text-white">
            {initials(row.user.name)}
          </span>
          <span className="text-sm font-medium text-ink">{row.user.name}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ATT_PILL[row.status] ?? ATT_PILL.WEEK_OFF}`}
        >
          {row.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "in",
      header: "In",
      align: "right",
      sortValue: (row) => row.inTime ?? "",
      render: (row) => (
        <span className="font-mono text-xs text-success">↑ {formatTime(row.inTime) || "—"}</span>
      ),
    },
    {
      key: "out",
      header: "Out",
      align: "right",
      sortValue: (row) => row.outTime ?? "",
      render: (row) => (
        <span className="font-mono text-xs text-danger">↓ {formatTime(row.outTime) || "—"}</span>
      ),
    },
    {
      key: "source",
      header: "Source",
      align: "right",
      render: (row) => (
        <span className="inline-flex rounded-full bg-page px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted ring-1 ring-line">
          {row.source}
        </span>
      ),
    },
  ];

  const leaveTableCols: DataTableColumn<LeaveRow>[] = [
    {
      key: "employee",
      header: "Employee",
      sortValue: (l) => l.user.name,
      cellClassName: "min-w-[180px]",
      render: (l) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f43f5e] to-[#fb7185] text-[11px] font-bold text-white shadow-soft">
            {initials(l.user.name)}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{l.user.name}</p>
            <p className="text-[11px] text-muted">{titleCase(l.user.role)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortValue: (l) => l.type,
      render: (l) => {
        const style = LEAVE_TYPE_STYLE[l.type] ?? LEAVE_TYPE_STYLE.CASUAL;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.pill}`}>
            {style.icon}
            {l.type}
          </span>
        );
      },
    },
    {
      key: "dates",
      header: "Dates",
      cellClassName: "min-w-[220px]",
      sortValue: (l) => l.fromDate,
      render: (l) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-body">
            {formatDateTime(l.fromDate)} → {formatDateTime(l.toDate)}
          </span>
          <span className="rounded-full bg-[#12b2aa]/10 px-2 py-0.5 text-[10px] font-bold text-[#0b7a75]">
            {daysBetween(l.fromDate, l.toDate)}d
          </span>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cellClassName: "max-w-[240px]",
      render: (l) => <p className="truncate text-xs text-ink">{l.reason}</p>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (l) => l.status,
      render: (l) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${LEAVE_STATUS_PILL[l.status] ?? LEAVE_STATUS_PILL.PENDING}`}
        >
          {l.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (l) =>
        l.status === "PENDING" && canManage ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              className="shine shrink-0 cursor-pointer bg-gradient-to-r from-[#16a34a] to-[#4ade80] text-white shadow-[0_8px_18px_-12px_rgba(22,163,74,0.9)]"
              loading={decide.isPending}
              onClick={(e) => {
                e.stopPropagation();
                decide.mutate({ id: l.id, action: "APPROVE" });
              }}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="shrink-0 cursor-pointer"
              loading={decide.isPending}
              onClick={(e) => {
                e.stopPropagation();
                decide.mutate({ id: l.id, action: "REJECT" });
              }}
              icon={<XCircle className="h-3.5 w-3.5" />}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  const payrollCols: DataTableColumn<PayrollRow>[] = [
    {
      key: "employee",
      header: "Employee",
      sortValue: (r) => r.user.name,
      cellClassName: "min-w-[190px]",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF] text-[11px] font-bold text-white shadow-soft">
            {initials(r.user.name)}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{r.user.name}</p>
            <p className="text-[11px] text-muted">{titleCase(r.user.role)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "basic",
      header: "Basic",
      align: "right",
      sortValue: (r) => r.basic,
      render: (r) => <span className="text-body">{formatCurrency(r.basic)}</span>,
    },
    {
      key: "hra",
      header: "HRA",
      align: "right",
      sortValue: (r) => r.hra,
      render: (r) => <span className="text-body">{formatCurrency(r.hra)}</span>,
    },
    {
      key: "travel",
      header: "Travel",
      align: "right",
      sortValue: (r) => r.travelAllowance,
      render: (r) => <span className="text-body">{formatCurrency(r.travelAllowance)}</span>,
    },
    {
      key: "deductions",
      header: "Deductions",
      align: "right",
      sortValue: (r) => r.deductions,
      render: (r) => (
        <span className="font-semibold text-danger">−{formatCurrency(r.deductions)}</span>
      ),
    },
    {
      key: "days",
      header: "Days",
      align: "center",
      sortValue: (r) => r.presentDays,
      render: (r) => (
        <span className="text-xs font-semibold text-ink">
          {r.presentDays}/{r.workingDays}
        </span>
      ),
    },
    {
      key: "status",
      header: "Pay status",
      sortValue: (r) => r.status,
      render: (r) =>
        r.status === "PAID" ? (
          <span className="inline-flex rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success ring-1 ring-[#16a34a]/30">
            PAID
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-[#f59e0b]/12 px-2.5 py-0.5 text-[11px] font-bold text-[#b45309] ring-1 ring-[#f59e0b]/35">
            DRAFT
          </span>
        ),
    },
    {
      key: "net",
      header: "Net",
      align: "right",
      sortValue: (r) => r.netSalary,
      render: (r) => <span className="text-sm font-bold text-[#0b7a75]">{formatCurrency(r.netSalary)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Command bar */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4c1d95] via-[#7c3aed] to-[#0b1220] p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.32),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c4b5fd]">People ops</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">HRMS</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Attendance, leaves, payroll and shift roster.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Clock3 className="h-3.5 w-3.5 text-[#c4b5fd]" />
              {me?.today
                ? `Today: ${me.today.status.replace(/_/g, " ")} · ${formatTime(me.today.inTime) || "—"} → ${formatTime(me.today.outTime) || "—"}`
                : "Today: not punched in"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-ink shadow-lift transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(0,0,0,0.5)]"
          >
            <CalendarCheck2 className="h-4 w-4 text-[#7c3aed]" />
            Apply leave
          </button>
        </div>
      </section>

      {/* Punch strip */}
      <Card className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-[radial-gradient(closest-side,rgba(18,178,170,0.12),transparent)]"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft">
              <Fingerprint className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Punch your day</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                {me?.today ? (
                  <>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${ATT_PILL[me.today.status] ?? ATT_PILL.WEEK_OFF}`}
                    >
                      {me.today.status.replace(/_/g, " ")}
                    </span>
                    <span>
                      In {formatTime(me.today.inTime) || "—"} · Out {formatTime(me.today.outTime) || "—"}
                    </span>
                  </>
                ) : (
                  <span>Not punched in yet today</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="shine cursor-pointer bg-gradient-to-r from-[#16a34a] to-[#4ade80] text-white shadow-[0_10px_22px_-14px_rgba(22,163,74,0.9)] hover:-translate-y-0.5"
              loading={punch.isPending}
              onClick={() => punch.mutate("IN")}
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              Punch in
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="cursor-pointer transition hover:border-[#dc2626]! hover:text-danger"
              loading={punch.isPending}
              onClick={() => punch.mutate("OUT")}
              icon={<XCircle className="h-4 w-4" />}
            >
              Punch out
            </Button>
          </div>
        </div>
      </Card>

      {/* Segmented tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-page p-1.5">
        {TAB_ITEMS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                active
                  ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-14px_rgba(18,178,170,0.9)]"
                  : "text-body hover:bg-card hover:text-ink"
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === "leaves" && pendingCount > 0 ? (
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold ${
                    active ? "bg-white/25 text-white" : "bg-[#f59e0b]/15 text-[#b45309]"
                  }`}
                >
                  {pendingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ATTENDANCE */}
      {tab === "attendance" ? (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft">
                <Clock3 className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">Monthly attendance</h2>
                <p className="text-[11px] text-muted">
                  {attendance ? `${attendance.items.length} records in ${attendance.month}` : "Loading…"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={`w-40 ${TEAL}`}
                aria-label="Month"
              />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-40 ${TEAL}`}
                aria-label="Date filter"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
            {attendanceLoading || !attendance
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
              : Object.entries(attendance.summary).map(([k, v]) => {
                  const style = ATT_TILE[k] ?? ATT_TILE.WEEK_OFF;
                  return (
                    <div
                      key={k}
                      className="group relative overflow-hidden rounded-2xl border border-line bg-card p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft"
                    >
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute -right-5 -top-5 h-14 w-14 rounded-2xl opacity-[0.1] transition-transform duration-300 group-hover:scale-125 ${style.gradient}`}
                      />
                      <div className="relative flex items-center justify-between">
                        <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                        <span className={`grid h-7 w-7 place-items-center rounded-lg text-white ${style.gradient}`}>
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                      </div>
                      <p className="relative mt-2 text-2xl font-bold tracking-tight text-ink">{v}</p>
                      <p className="relative text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {k.replace(/_/g, " ")}
                      </p>
                    </div>
                  );
                })}
          </div>

          <div className="border-t border-line">
            <DataTable
              columns={attCols}
              rows={attendanceRows}
              rowKey={(row) => row.id}
              loading={attendanceLoading}
              skeletonRows={6}
              minWidth="min-w-[760px]"
              empty={
                <EmptyState
                  title="No attendance records"
                  description="Records for the selected month will appear here."
                  icon={<Clock3 className="h-6 w-6" />}
                />
              }
            />
          </div>
        </Card>
      ) : null}

      {/* LEAVES */}
      {tab === "leaves" ? (
        <Card padded={false}>
          <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#fb7185] text-white shadow-soft">
                <CalendarDays className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">Leave requests</h2>
                <p className="text-[11px] text-muted">
                  {leaves ? `${leaves.items.length} request${leaves.items.length === 1 ? "" : "s"} · ${pendingCount} pending` : "Loading…"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="month"
                value={leaveMonth}
                onChange={(e) => setLeaveMonth(e.target.value)}
                className={`w-40 ${TEAL}`}
                aria-label="Month"
              />
              {[
                { value: "", label: "All" },
                { value: "PENDING", label: "Pending" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
              ].map((s) => (
                <button
                  key={s.value || "all"}
                  type="button"
                  onClick={() => setLeaveStatus(s.value)}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                    leaveStatus === s.value
                      ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-14px_rgba(18,178,170,0.9)]"
                      : "border border-line bg-card text-body hover:border-[#12b2aa]/45 hover:text-[#0b7a75]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setLeaveOpen(true)}
                className="shine inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] px-4 py-1.5 text-xs font-bold text-white shadow-[0_10px_22px_-14px_rgba(18,178,170,0.9)] transition hover:-translate-y-0.5"
              >
                <CalendarCheck2 className="h-3.5 w-3.5" />
                Apply leave
              </button>
            </div>
          </div>
          <DataTable
            columns={leaveTableCols}
            rows={leaveRows}
            rowKey={(l) => l.id}
            loading={leavesLoading}
            skeletonRows={5}
            minWidth="min-w-[1020px]"
            empty={
              <EmptyState
                title="No leave requests"
                description="Leave requests for this month will appear here."
                icon={<CalendarDays className="h-6 w-6" />}
              />
            }
          />
        </Card>
      ) : null}

      {/* PAYROLL */}
      {tab === "payroll" ? (
        <>
          <Card className="relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(22,163,74,0.12),transparent)]"
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#16a34a] to-[#4ade80] text-white shadow-soft">
                  <Wallet className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Payroll run</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-full bg-page px-2.5 py-0.5 text-[11px] font-bold text-body ring-1 ring-line">
                      {payroll ? `${payroll.totals.count} staff` : "—"}
                    </span>
                    <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success">
                      {payroll ? `Gross ${formatCurrency(payroll.totals.gross)}` : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className={`w-40 ${TEAL}`}
                  aria-label="Payroll month"
                />
                {canManage ? (
                  <Button
                    className="shine cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5"
                    loading={runPayroll.isPending}
                    onClick={() => runPayroll.mutate()}
                    icon={<PlayCircle className="h-4 w-4" />}
                  >
                    Run payroll
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
          <Card padded={false}>
            <DataTable
              columns={payrollCols}
              rows={payrollRows}
              rowKey={(r) => r.id}
              loading={payrollLoading}
              skeletonRows={6}
              minWidth="min-w-[1080px]"
              empty={
                <EmptyState
                  title="No payroll rows"
                  description="Run payroll to generate salary rows for the month."
                  icon={<Wallet className="h-6 w-6" />}
                />
              }
            />
          </Card>
        </>
      ) : null}

      {/* SHIFTS */}
      {tab === "shifts" ? (
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#818cf8] text-white shadow-soft">
              <AlarmClock className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Shift roster</h2>
              <p className="text-[11px] text-muted">Read-only shift definitions</p>
            </div>
          </div>
          {shifts && shifts.items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shifts.items.map((s) => {
                const style = SHIFT_STYLE[s.type] ?? SHIFT_STYLE.DAY;
                return (
                  <div
                    key={s.id}
                    className="group relative overflow-hidden rounded-2xl border border-line bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                  >
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-[22px] opacity-[0.1] transition-transform duration-300 group-hover:scale-125 ${style.gradient}`}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">{s.name}</p>
                        <span
                          className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.pill}`}
                        >
                          {s.type}
                        </span>
                      </div>
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 ${style.gradient}`}
                      >
                        <AlarmClock className="h-5 w-5" />
                      </span>
                    </div>
                    <p className="relative mt-3 font-mono text-xs font-semibold text-body">
                      {s.startTime} <span className="text-muted">→</span> {s.endTime}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No shifts configured"
              description="Shift definitions will appear here once seeded."
              icon={<AlarmClock className="h-6 w-6" />}
            />
          )}
        </Card>
      ) : null}

      {/* Apply for leave — premium modal */}
      <Modal
        open={leaveOpen}
        title="Apply for leave"
        onClose={() => setLeaveOpen(false)}
        footer={
          <>
            <Button variant="secondary" className="cursor-pointer" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button
              className="shine cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5"
              loading={createLeave.isPending}
              onClick={submitLeave}
            >
              Submit request
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            submitLeave();
          }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[#12b2aa]/25 bg-gradient-to-r from-[#12b2aa]/10 to-transparent p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft">
              <CalendarCheck2 className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">New leave request</p>
              <p className="text-xs text-muted">Goes to your manager for approval over the API.</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-ink">Leave type</p>
            <div className="grid grid-cols-3 gap-2">
              {(["CASUAL", "SICK", "EARNED"] as LeaveType[]).map((t) => {
                const style = LEAVE_TYPE_STYLE[t];
                const active = leaveType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLeaveType(t)}
                    className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-3 transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                      active
                        ? "border-[#12b2aa] bg-[#12b2aa]/[0.07] shadow-soft"
                        : "border-line hover:bg-page"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl ${
                        active
                          ? "bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft"
                          : "bg-page text-muted ring-1 ring-line"
                      }`}
                    >
                      {style.icon}
                    </span>
                    <span className={`text-xs font-bold ${active ? "text-[#0b7a75]" : "text-body"}`}>
                      {t}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="From"
              type="date"
              required
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={TEAL}
            />
            <Input
              label="To"
              type="date"
              required
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={TEAL}
            />
          </div>

          {leaveDays > 0 ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-[#12b2aa]/10 px-3.5 py-1.5 text-xs font-bold text-[#0b7a75]">
              <CalendarDays className="h-3.5 w-3.5" />
              {leaveDays} day{leaveDays === 1 ? "" : "s"} of leave
            </p>
          ) : fromDate && toDate ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-danger-bg px-3.5 py-1.5 text-xs font-bold text-danger">
              <XCircle className="h-3.5 w-3.5" />
              To date must be on or after From date
            </p>
          ) : null}

          <Textarea
            label="Reason"
            rows={3}
            required
            minLength={5}
            maxLength={500}
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            placeholder="Why are you taking leave?"
            className={TEAL}
          />
          <button type="submit" className="hidden">
            Submit
          </button>
        </form>
      </Modal>
    </div>
  );
}
