import { cn } from "../../lib/utils";
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "cyber" | "amber" | "neon" | "success" | "danger";
}
export function Badge({ className, variant = "cyber", ...props }: BadgeProps) {
  const variants = {
    cyber:
      "bg-zinc-100 dark:bg-zinc-800/50 text-white font-semibold border-zinc-300 dark:border-zinc-700",
    amber:
      "bg-zinc-100 dark:bg-zinc-800/50 text-white border-zinc-200 dark:border-zinc-800",
    neon: "bg-zinc-100 dark:bg-zinc-800/50 text-white border-zinc-200 dark:border-zinc-800",
    success:
      "bg-green-50 dark:bg-green-900/20 text-green-700 border-green-200 dark:border-green-800",
    danger:
      "bg-red-50 dark:bg-red-900/20 text-red-700 border-red-200 dark:border-red-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
