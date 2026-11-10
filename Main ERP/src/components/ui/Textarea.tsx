import { useId, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  wrapperClassName?: string;
};

export function Textarea({ label, error, wrapperClassName = "", id, className = "", ...rest }: Props) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <div className={wrapperClassName}>
      {label ? (
        <label htmlFor={areaId} className="mb-1.5 block text-xs font-medium text-ink">
          {label}
        </label>
      ) : null}
      <textarea
        id={areaId}
        className={`w-full rounded-xl border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none ${error ? "border-danger" : "border-line"} ${className}`}
        {...rest}
      />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
