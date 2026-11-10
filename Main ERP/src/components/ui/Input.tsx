import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
};

export function Input({ label, error, hint, wrapperClassName = "", id, className = "", ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={wrapperClassName}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-ink">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`h-10 w-full rounded-xl border bg-card px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none ${error ? "border-danger" : "border-line"} ${className}`}
        {...rest}
      />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      {!error && hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
