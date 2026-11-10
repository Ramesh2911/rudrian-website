import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Boxes, CheckCheck, Printer, ScanLine, Truck } from "lucide-react";
import { manifestsApi } from "../api/endpoints";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { TD, TH, THead, TR, Table } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { formatCurrency, formatDateTime } from "../lib/format";
import { STATUS_LABELS } from "../lib/rbac";

export function ManifestDetailPage() {
  const { id = "" } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [awb, setAwb] = useState("");
  const [confirmAction, setConfirmAction] = useState<"close" | "receive" | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manifests", "detail", id],
    queryFn: () => manifestsApi.get(id),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["manifests"] });
    void queryClient.invalidateQueries({ queryKey: ["shipments"] });
  };

  const addItem = useMutation({
    mutationFn: () => manifestsApi.addItem(id, awb.trim().toUpperCase()),
    onSuccess: (res) => {
      toast.success(`${res.added.awbNumber} added to manifest`);
      setAwb("");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add parcel"),
  });

  const closeManifest = useMutation({
    mutationFn: () => manifestsApi.close(id),
    onSuccess: (m) => {
      toast.success(`${m.manifestNumber} closed and dispatched`);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not close manifest"),
  });

  const receiveManifest = useMutation({
    mutationFn: () => manifestsApi.receive(id),
    onSuccess: (m) => {
      toast.success(`${m.manifestNumber} received at destination`);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not receive manifest"),
  });

  const printManifest = () => {
    if (!data) return;
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    const rows = data.items
      .map(
        (it, i) =>
          `<tr><td>${i + 1}</td><td>${it.shipment.awbNumber}</td><td>${it.shipment.receiverName}</td><td>${it.shipment.receiverCity}</td><td>${it.shipment.serviceType}</td><td>${it.shipment.chargeableWeight}</td><td>${it.shipment.codAmount > 0 ? "COD " + it.shipment.codAmount : "-"}</td></tr>`,
      )
      .join("");
    win.document.write(`<!doctype html><html><head><title>${data.manifestNumber}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#0B1220}h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}th,td{border:1px solid #94a3b8;padding:6px;text-align:left}th{background:#F6F8FB}.meta{font-size:12px;color:#475569;margin-top:4px}</style>
</head><body>
<h1>SwiftLogix Manifest ${data.manifestNumber}</h1>
<p class="meta">${data.fromLocation?.name ?? "-"} &rarr; ${data.toLocation?.name ?? "-"} | Vehicle: ${data.vehicleNumber ?? "-"} | Driver: ${data.driverName ?? "-"} ${data.driverPhone ?? ""}</p>
<p class="meta">Status: ${data.status} | Parcels: ${data.scannedCount} | Printed ${new Date().toLocaleString("en-IN")}</p>
<table><thead><tr><th>#</th><th>AWB</th><th>Receiver</th><th>City</th><th>Category</th><th>Wt</th><th>COD</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-line bg-card">
        <EmptyState title="Manifest not found" description="It may have been removed." />
      </div>
    );
  }

  const isOpen = data.status === "OPEN";
  const canReceive = data.status === "CLOSED" || data.status === "IN_TRANSIT";

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link to="/manifests" className="inline-flex items-center gap-1 hover:text-brand">
            <ArrowLeft className="h-3.5 w-3.5" />
            Manifests
          </Link>
        }
        title={data.manifestNumber}
        description={`${data.fromLocation?.name ?? "-"} to ${data.toLocation?.name ?? "-"}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={printManifest} icon={<Printer className="h-3.5 w-3.5" />}>
              Print manifest
            </Button>
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === "close" ? "Close and dispatch manifest?" : "Receive manifest?"}
        message={
          confirmAction === "close"
            ? `Close ${data.manifestNumber}? No further parcels can be added after dispatch.`
            : `Mark ${data.manifestNumber} as received? All parcels will be scanned inbound at ${data.toLocation?.name ?? "the destination"}.`
        }
        confirmLabel={confirmAction === "close" ? "Close manifest" : "Mark received"}
        loading={closeManifest.isPending || receiveManifest.isPending}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction === "close") closeManifest.mutate();
          else receiveManifest.mutate();
          setConfirmAction(null);
        }}
      />

      {isOpen ? (
              <Button size="sm" onClick={() => setConfirmAction("close")} icon={<Truck className="h-3.5 w-3.5" />}>
                Close &amp; dispatch
              </Button>
            ) : null}
            {canReceive ? (
              <Button variant="success" size="sm" onClick={() => setConfirmAction("receive")} icon={<CheckCheck className="h-3.5 w-3.5" />}>
                Mark received
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={data.status === "OPEN" ? "emerald" : data.status === "RECEIVED" ? "indigo" : "amber"}>{data.status}</Badge>
        {data.vehicleNumber ? <span className="text-xs text-body">Vehicle {data.vehicleNumber}</span> : null}
        {data.driverName ? <span className="text-xs text-body">Driver {data.driverName} {data.driverPhone}</span> : null}
        <span className="text-xs text-muted">Created {formatDateTime(data.createdAt)}</span>
        {data.closedAt ? <span className="text-xs text-muted">Closed {formatDateTime(data.closedAt)}</span> : null}
        {data.receivedAt ? <span className="text-xs text-muted">Received {formatDateTime(data.receivedAt)}</span> : null}
        {data.closedBy ? <span className="text-xs text-muted">Closed by {data.closedBy.name}</span> : null}
      </div>

      {isOpen ? (
        <Card className="mb-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Add parcel by AWB</h2>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!awb.trim()) return;
              addItem.mutate();
            }}
          >
            <Input
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              placeholder="Scan or type AWB number"
              className="flex-1 font-mono uppercase"
              required
              minLength={4}
            />
            <Button type="submit" loading={addItem.isPending} icon={<ScanLine className="h-4 w-4" />}>
              Add to manifest
            </Button>
          </form>
        </Card>
      ) : null}

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Boxes className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold text-ink">Parcels ({data.items.length})</h2>
        </div>
        {data.items.length === 0 ? (
          <EmptyState title="No parcels scanned" description="Add shipments by AWB to build this manifest." icon={<ScanLine className="h-6 w-6" />} />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TH>AWB</TH>
                  <TH>Receiver</TH>
                  <TH>Destination</TH>
                  <TH>Status</TH>
                  <TH>COD</TH>
                  <TH>Scanned</TH>
                </THead>
                <tbody>
                  {data.items.map((it) => (
                    <TR key={it.shipment.id}>
                      <TD className="font-mono text-xs font-semibold text-ink">
                        <Link to={`/shipments/${it.shipment.awbNumber}`} className="hover:text-brand">{it.shipment.awbNumber}</Link>
                      </TD>
                      <TD>{it.shipment.receiverName}</TD>
                      <TD>{it.shipment.receiverCity}</TD>
                      <TD><StatusBadge status={it.shipment.status} label={STATUS_LABELS[it.shipment.status]} /></TD>
                      <TD>{it.shipment.codAmount > 0 ? formatCurrency(it.shipment.codAmount) : "-"}</TD>
                      <TD className="text-xs">{formatDateTime(it.scannedAt)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {data.items.map((it) => (
                <li key={it.shipment.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-ink">{it.shipment.awbNumber}</span>
                    <StatusBadge status={it.shipment.status} label={STATUS_LABELS[it.shipment.status]} />
                  </div>
                  <p className="mt-1 text-sm text-body">{it.shipment.receiverName} &middot; {it.shipment.receiverCity}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
