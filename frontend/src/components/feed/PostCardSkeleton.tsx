import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
export function PostCardSkeleton() {
  return (
    <Card className="p-5">
      {" "}
      <div className="flex items-center gap-3 mb-4">
        {" "}
        <Skeleton className="w-10 h-10 rounded-full" />{" "}
        <div className="space-y-2">
          {" "}
          <Skeleton className="h-4 w-32" />{" "}
          <Skeleton className="h-3 w-20" />{" "}
        </div>{" "}
      </div>{" "}
      <div className="space-y-2 mb-6">
        {" "}
        <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-[90%]" />{" "}
        <Skeleton className="h-4 w-[60%]" />{" "}
      </div>{" "}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        {" "}
        <Skeleton className="h-4 w-32" /> <Skeleton className="h-4 w-24" />{" "}
      </div>{" "}
    </Card>
  );
}
