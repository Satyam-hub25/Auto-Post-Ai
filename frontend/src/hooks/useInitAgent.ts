import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
export function useInitAgent() {
  return useMutation({
    mutationFn: (persona: { name: string; domain: string }) =>
      api.initAgent(persona),
  });
}
