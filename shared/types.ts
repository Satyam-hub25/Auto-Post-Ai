// ── Shared Types ── Used by both frontend and backend ──

export interface AgentPersona {
  name: string;
  domain: string;
}

export interface InitRequest {
  persona: AgentPersona;
}

export interface InitResponse {
  agentId: string;
}

export interface PostData {
  id: string;
  createdAt: string; // ISO 8601 UTC
  text: string;
  rationale: string;
  sources: string[];
}

export interface FeedResponse {
  posts: PostData[];
}

export interface TopicCandidateData {
  id: string;
  agentId: string;
  title: string;
  summary: string;
  sourceUrl: string;
  score: number;
  status: 'accepted' | 'rejected';
  reason: string;
  discoveredAt: string;
}

export interface AgentData {
  id: string;
  personaName: string;
  domain: string;
  voiceGuide: string;
  createdAt: string;
}

export interface AnalyticsData {
  postsPerDay: { date: string; count: number }[];
  acceptanceRate: { accepted: number; rejected: number };
  topSources: { source: string; count: number }[];
  totalPosts: number;
  totalTopics: number;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
