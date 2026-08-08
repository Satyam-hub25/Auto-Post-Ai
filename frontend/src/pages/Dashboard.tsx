import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../lib/api";
import { useFeed } from "../hooks/useFeed";
import { PersonaStrip } from "../components/persona/PersonaStrip";
import { FeedTimeline } from "../components/feed/FeedTimeline";
import { ErrorState } from "../components/ui/ErrorState";
import { Activity, RefreshCw } from "lucide-react";
export function Dashboard() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const {
    data: agentData,
    isLoading: isAgentLoading,
    error: agentError,
  } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => (agentId ? api.getAgent(agentId) : null),
    enabled: !!agentId,
    retry: false,
  });
  useEffect(() => {
    if (agentError) {
      navigate("/", { replace: true });
    }
  }, [agentError, navigate]);
  const { data, isLoading, error, refetch } = useFeed(agentId || null);
  const personaName = agentData?.agent?.personaName || "Loading...";
  const personaDomain = agentData?.agent?.domain || "";
  if (error) {
    return (
      <div className="max-w-3xl mx-auto pt-8">
        {" "}
        <ErrorState onRetry={() => refetch()} />{" "}
      </div>
    );
  }
  const feed = data?.posts || [];
  return (
    <div className="max-w-3xl mx-auto">
      {" "}
      <PersonaStrip
        name={personaName}
        domain={personaDomain}
        description="Autonomous agent curating the latest content."
      />{" "}
      <div className="flex items-center justify-between mb-6">
        {" "}
        <h2 className="text-2xl font-extrabold text-white tracking-wide">
          Live Feed
        </h2>{" "}
        <div className="flex items-center gap-4">
          {" "}
          <button
            onClick={() => {
              api
                .forceCycle(agentId!, "")
                .then(() =>
                  alert("Cycle triggered! It will run in the background."),
                );
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors rounded-full text-xs font-medium border border-blue-700 shadow-sm cursor-pointer"
          >
            {" "}
            <RefreshCw className="w-3.5 h-3.5" /> Trigger Cycle{" "}
          </button>{" "}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-xs font-medium border border-green-500/20">
            {" "}
            <Activity className="w-3.5 h-3.5 animate-pulse" /> Agent Active{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <FeedTimeline
        posts={feed}
        isLoading={isLoading || isAgentLoading}
        personaName={personaName}
      />{" "}
    </div>
  );
}
