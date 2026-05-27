"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: string;
  trailing?: React.ReactNode;
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { leadingIcon, trailing, label, hint, error, className, id, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <div className="flex flex-col gap-1">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-on-surface"
          >
            {label}
          </label>
        ) : null}
        <div className="relative flex items-center">
          {leadingIcon ? (
            <Icon
              name={leadingIcon}
              className="pointer-events-none absolute left-3 text-base text-outline"
            />
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-lg border bg-surface-container-lowest py-3 text-[15px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors",
              leadingIcon ? "pl-10" : "pl-3",
              trailing ? "pr-10" : "pr-3",
              error
                ? "border-error focus:border-error"
                : "border-outline-variant focus:border-primary",
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
          {trailing ? (
            <div className="absolute right-2 flex items-center">{trailing}</div>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs text-error">{error}</p>
        ) : hint ? (
          <p className="text-xs text-on-surface-variant">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
