import { ReactNode } from "react";
import { Card } from "./Card";
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
}
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center h-full">
      {" "}
      {icon && <div className="mb-4 text-white">{icon}</div>}{" "}
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>{" "}
      <p className="text-white max-w-sm">{description}</p>{" "}
    </Card>
  );
}
