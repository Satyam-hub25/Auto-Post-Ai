import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
export function useTopics(agentId: string | null) {
  return useQuery({
    queryKey: ["topics", agentId],
    queryFn: () => (agentId ? api.getTopics(agentId) : null),
    enabled: !!agentId,
  });
}
