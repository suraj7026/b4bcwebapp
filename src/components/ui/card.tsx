import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card",
        className
      )}
    />
  );
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("p-6", className)} />;
}

export function Chip({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center rounded-md bg-surface-container-high px-2.5 py-1 text-xs font-medium text-on-surface-variant",
        className
      )}
    />
  );
}
