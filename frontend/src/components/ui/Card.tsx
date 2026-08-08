import { forwardRef } from "react";
import { cn } from "../../lib/utils";
export const Card = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-black text-white border border-slate-800 rounded-2xl shadow-sm transition-colors duration-300",
        className,
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";
