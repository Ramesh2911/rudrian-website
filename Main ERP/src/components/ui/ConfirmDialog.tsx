import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, loading = false, onConfirm, onClose }: Props) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => setMounted(open), [open]);
  if (!mounted && !open) return null;

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"}`}>
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="pt-2 text-sm text-body">{message}</p>
      </div>
    </Modal>
  );
}
