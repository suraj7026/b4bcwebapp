import { cn } from "@/lib/utils";

export function Icon({
  name,
  filled,
  className,
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      aria-hidden="true"
      style={
        filled ? { fontVariationSettings: "'FILL' 1, 'wght' 500" } : undefined
      }
    >
      {name}
    </span>
  );
}
