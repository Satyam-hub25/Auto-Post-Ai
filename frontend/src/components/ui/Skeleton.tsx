import { cn } from "../../lib/utils";
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-gray-200 dark:bg-zinc-100 dark:bg-zinc-800 rounded-lg shimmer-bg",
        className,
      )}
      {...props}
    />
  );
}
