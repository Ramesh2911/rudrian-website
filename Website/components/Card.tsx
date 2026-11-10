import type { HTMLAttributes } from "react";
import { cx } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padded?: boolean;
}

export function Card({ hover = false, padded = true, className, children, ...rest }: CardProps) {
  return (
    <div className={cx("card", hover && "card-hover", padded && "p-6", className)} {...rest}>
      {children}
    </div>
  );
}
