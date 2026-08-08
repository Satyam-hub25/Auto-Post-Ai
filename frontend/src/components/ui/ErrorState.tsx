import { AlertTriangle } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}
export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this content.",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center border-red-500/20">
      {" "}
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />{" "}
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>{" "}
      <p className="text-white max-w-sm mb-6">{message}</p>{" "}
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          {" "}
          Try Again{" "}
        </Button>
      )}{" "}
    </Card>
  );
}
