import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
export function useAnalytics(agentId: string | null) {
  return useQuery({
    queryKey: ["analytics", agentId],
    queryFn: () => (agentId ? api.getAnalytics(agentId) : null),
    enabled: !!agentId,
  });
}
