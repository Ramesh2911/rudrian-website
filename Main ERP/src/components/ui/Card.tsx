import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export function Card({ padded = true, className = "", children, ...rest }: Props) {
  return (
    <div className={`rounded-2xl border border-line bg-card shadow-sm ${padded ? "p-5" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}
