import * as React from "react";
import { cn } from "../../lib/utils.js";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60",
        className
      )}
      ref={ref}
      type={type}
      {...props}
    />
  )
);
Input.displayName = "Input";
