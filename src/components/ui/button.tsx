"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-surface-container-high text-on-surface hover:bg-outline-variant disabled:opacity-50",
  outline:
    "bg-transparent text-on-surface border border-outline-variant hover:bg-surface-container-low disabled:opacity-50",
  ghost: "bg-transparent text-on-surface hover:bg-surface-container-low",
  danger:
    "bg-error text-white hover:opacity-90 disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-[0.01em] transition-all active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Icon name="progress_activity" className="animate-spin text-base" /> : null}
      {children}
    </button>
  )
);
Button.displayName = "Button";
