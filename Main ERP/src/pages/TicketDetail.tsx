import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, MessageSquare, Send } from "lucide-react";
import { locationsApi, ticketsApi } from "../api/endpoints";
import type { TicketStatus } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { Textarea } from "../components/ui/Textarea";
import { useToast } from "../components/ui/Toast";
import { formatDateTime, titleCase } from "../lib/format";
import { Badge } from "../components/ui/Badge";

export function TicketDetailPage() {
  const { id = "" } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tickets", "detail", id],
    queryFn: () => ticketsApi.get(id),
    enabled: Boolean(id),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => locationsApi.list({ all: true }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["tickets"] });
  };

  const comment = useMutation({
    mutationFn: () => ticketsApi.comment(id, message.trim(), visibility),
    onSuccess: () => {
      toast.success("Reply posted");
      setMessage("");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not post reply"),
  });

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) => ticketsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Ticket status updated");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update status"),
  });

  const assignMutation = useMutation({
    mutationFn: (locationId: string) => ticketsApi.assign(id, locationId),
    onSuccess: () => {
      toast.success("Ticket assigned");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not assign"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-line bg-card">
        <EmptyState title="Ticket not found" description="This ticket may have been removed." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link to="/tickets" className="inline-flex items-center gap-1 hover:text-brand">
            <ArrowLeft className="h-3.5 w-3.5" />
            Tickets
          </Link>
        }
        title={data.ticketNumber}
        description={data.subject}
        actions={
          <>
            <Select
              value={data.status}
              onChange={(e) => statusMutation.mutate(e.target.value as TicketStatus)}
              className="w-44"
              aria-label="Ticket status"
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </Select>
            <Select
              value={data.assignedLocationId ?? ""}
              onChange={(e) => e.target.value && assignMutation.mutate(e.target.value)}
              className="w-48"
              aria-label="Assign to location"
            >
              <option value="">Assign location...</option>
              {(locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-ink">Conversation</h2>
          </div>
          {data.comments.length === 0 ? (
            <p className="text-sm text-muted">No replies yet.</p>
          ) : (
            <ol className="space-y-4">
              {data.comments.map((c) => (
                <li key={c.id} className={`rounded-2xl border p-4 ${c.visibility === "INTERNAL" ? "border-warning/40 bg-warning-bg" : "border-line bg-page"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{c.authorName}</span>
                    {c.authorRole ? <span className="text-xs text-muted">{titleCase(c.authorRole)}</span> : null}
                    <Badge tone={c.visibility === "INTERNAL" ? "amber" : "slate"}>{c.visibility}</Badge>
                    <span className="ml-auto text-xs text-muted">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-body">{c.message}</p>
                </li>
              ))}
            </ol>
          )}
          <form
            className="mt-5 border-t border-line pt-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!message.trim()) return;
              comment.mutate();
            }}
          >
            <Textarea
              label="Reply"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a reply to the customer..."
              required
              minLength={2}
              maxLength={2000}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Select value={visibility} onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "INTERNAL")} className="w-44" aria-label="Visibility">
                <option value="PUBLIC">Public (SMS)</option>
                <option value="INTERNAL">Internal note</option>
              </Select>
              <Button type="submit" loading={comment.isPending} icon={<Send className="h-4 w-4" />}>
                Post reply
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink">Customer</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-muted">Name</dt><dd className="text-ink">{data.name}</dd></div>
              <div><dt className="text-xs text-muted">Phone</dt><dd className="text-ink">{data.phone}</dd></div>
              {data.email ? <div><dt className="text-xs text-muted">Email</dt><dd className="text-ink">{data.email}</dd></div> : null}
              {data.awbNumber ? (
                <div>
                  <dt className="text-xs text-muted">AWB</dt>
                  <dd>
                    <Link to={`/shipments/${data.awbNumber}`} className="font-mono text-sm text-brand hover:underline">{data.awbNumber}</Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink">Case</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-muted">Category</dt><dd className="text-ink">{titleCase(data.category)}</dd></div>
              <div><dt className="text-xs text-muted">Priority</dt><dd className="text-ink">{data.priority}</dd></div>
              <div><dt className="text-xs text-muted">Status</dt><dd className="text-ink">{data.status.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-xs text-muted">Assigned hub</dt><dd className="text-ink">{data.assignedLocation?.name ?? "-"}</dd></div>
              <div><dt className="text-xs text-muted">Created</dt><dd className="text-ink">{formatDateTime(data.createdAt)}</dd></div>
              {data.resolvedAt ? <div><dt className="text-xs text-muted">Resolved</dt><dd className="text-ink">{formatDateTime(data.resolvedAt)}</dd></div> : null}
            </dl>
            <p className="mt-3 rounded-xl bg-page p-3 text-sm text-body">{data.message}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted">
              <Building2 className="h-3 w-3" />
              {data.assignedLocation ? `${data.assignedLocation.name}, ${data.assignedLocation.city ?? ""}` : "Unassigned"}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
