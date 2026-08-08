import { Cpu, Settings } from "lucide-react";
import { Badge } from "../ui/Badge";
interface PersonaStripProps {
  name: string;
  domain: string;
  description?: string;
}
export function PersonaStrip({ name, domain, description }: PersonaStripProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center gap-6">
      {" "}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 dark:from-blue-400 to-blue-800 dark:to-blue-600 flex items-center justify-center text-white shadow-lg shadow-zinc-900/5 dark:shadow-none shrink-0">
        {" "}
        <Cpu className="w-8 h-8 text-white" />{" "}
      </div>{" "}
      <div className="flex-1">
        {" "}
        <div className="flex items-center gap-3 mb-1">
          {" "}
          <h1 className="text-2xl font-bold text-white">{name}</h1>{" "}
          <Badge variant="cyber">AI Persona</Badge>{" "}
        </div>{" "}
        <p className="text-white font-medium">{domain}</p>{" "}
        {description && (
          <p className="text-sm text-white mt-2 max-w-2xl">{description}</p>
        )}{" "}
      </div>{" "}
    </div>
  );
}
