import Image from "next/image";
import { cx } from "@/lib/utils";

const LOGO_W = 1181;
const LOGO_H = 509;

export function Logo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-trimmed.jpeg"
      alt="Rudrian Logistics Solutions"
      width={LOGO_W}
      height={LOGO_H}
      priority={priority}
      className={cx("h-10 w-auto sm:h-12", className)}
    />
  );
}
