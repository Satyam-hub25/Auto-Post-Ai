import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary:
        "bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:bg-zinc-800 dark:bg-blue-900/40 text-white shadow-lg shadow-zinc-900/5 dark:shadow-none",
      secondary:
        "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 text-white border border-navy-700",
      ghost:
        "hover:bg-zinc-100 dark:bg-zinc-800/50 text-white hover:text-white",
      danger:
        "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2",
      lg: "px-6 py-3 text-lg",
    };
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyber-500/50 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {" "}
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{" "}
        {children}{" "}
      </button>
    );
  },
);
Button.displayName = "Button";
