import { useId, type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  placeholder?: string;
  wrapperClassName?: string;
};

export function Select({ label, error, placeholder, wrapperClassName = "", id, className = "", children, ...rest }: Props) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={wrapperClassName}>
      {label ? (
        <label htmlFor={selectId} className="mb-1.5 block text-xs font-medium text-ink">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={`h-10 w-full rounded-xl border bg-card px-3 text-sm text-ink focus:border-brand focus:outline-none ${error ? "border-danger" : "border-line"} ${className}`}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
