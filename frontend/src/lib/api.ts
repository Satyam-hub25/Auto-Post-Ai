let API_URL = import.meta.env.VITE_API_URL || "";
if (API_URL && !API_URL.startsWith("http")) {
  API_URL = `https://${API_URL}`;
}
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}
export const api = {
  initAgent: (persona: { name: string; domain: string }) =>
    request<{ agentId: string }>("/api/agent/init", {
      method: "POST",
      body: JSON.stringify({ persona }),
    }),
  getFeed: (agentId: string) =>
    request<{
      posts: Array<{
        id: string;
        createdAt: string;
        text: string;
        rationale: string;
        sources: string[];
        candidatesCount?: number;
        scores?: {
          novelty: number;
          substance: number;
          credibility: number;
          relevance: number;
          timeliness: number;
          score: number;
        };
      }>;
    }>(`/api/agent/feed?agentId=${agentId}`),
  getAgents: () =>
    request<{
      agents: Array<{
        id: string;
        personaName: string;
        domain: string;
        createdAt: string;
      }>;
    }>("/api/agent/list"),
  getAgent: (agentId: string) =>
    request<{
      agent: {
        id: string;
        personaName: string;
        domain: string;
        voiceGuide: string;
        createdAt: string;
      };
    }>(`/api/admin/agent/${agentId}`),
  getTopics: (agentId: string) =>
    request<{
      candidates: Array<{
        id: string;
        title: string;
        summary: string;
        sourceUrl: string;
        score: number;
        status: string;
        reason: string;
        discoveredAt: string;
      }>;
    }>(`/api/admin/topics/${agentId}`),
  getAnalytics: (agentId: string) =>
    request<{
      postsPerDay: Array<{ date: string; count: number }>;
      acceptanceRate: { accepted: number; rejected: number };
      topSources: Array<{ source: string; count: number }>;
      totalPosts: number;
      totalTopics: number;
      averages?: {
        score: number;
        novelty: number;
        substance: number;
        credibility: number;
        relevance: number;
        timeliness: number;
      } | null;
      topRejections?: Array<{ reason: string; count: number }>;
    }>(`/api/admin/analytics/${agentId}`),
  forceCycle: (agentId: string, token: string) =>
    request<{ message: string }>(`/api/admin/force-cycle/${agentId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
};
