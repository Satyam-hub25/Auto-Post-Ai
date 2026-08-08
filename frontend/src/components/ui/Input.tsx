import { forwardRef } from "react";
import { cn } from "../../lib/utils";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {" "}
        {label && (
          <label className="text-sm font-medium text-white"> {label} </label>
        )}{" "}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-2 bg-white dark:bg-zinc-100 dark:bg-zinc-800 border border-gray-300 dark:border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyber-500 text-white transition-shadow",
            error && "border-red-500 focus:ring-red-500",
            className,
          )}
          {...props}
        />{" "}
        {error && <p className="text-sm text-red-500">{error}</p>}{" "}
      </div>
    );
  },
);
Input.displayName = "Input";
