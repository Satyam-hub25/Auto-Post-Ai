import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
export function useFeed(agentId: string | null) {
  return useQuery({
    queryKey: ["feed", agentId],
    queryFn: () => (agentId ? api.getFeed(agentId) : null),
    enabled: !!agentId,
    refetchInterval: 30000,
  });
}
