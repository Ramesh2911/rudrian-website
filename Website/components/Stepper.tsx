import { Check } from "lucide-react";
import { cx } from "@/lib/utils";

interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-start gap-0" aria-label="Booking progress">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="flex w-full items-center">
              <span
                aria-hidden="true"
                className={cx("h-0.5 flex-1 rounded-full", index === 0 ? "opacity-0" : done ? "bg-brand" : "bg-line")}
              />
              <span
                className={cx(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold transition-all duration-300",
                  done && "bg-brand text-white",
                  active && "bg-brand-50 text-brand ring-4 ring-brand/15",
                  !done && !active && "bg-page text-muted ring-1 ring-line",
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span
                aria-hidden="true"
                className={cx(
                  "h-0.5 flex-1 rounded-full",
                  index === steps.length - 1 ? "opacity-0" : done ? "bg-brand" : "bg-line",
                )}
              />
            </div>
            <span
              className={cx(
                "hidden max-w-[88px] text-center text-[11px] font-semibold leading-tight sm:block",
                active ? "text-brand" : done ? "text-ink" : "text-muted",
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
