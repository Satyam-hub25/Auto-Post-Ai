import { useParams } from "react-router-dom";
import { PostsOverTimeChart } from "../components/analytics/PostsOverTimeChart";
import { AcceptanceRateChart } from "../components/analytics/AcceptanceRateChart";
import { TopSourcesChart } from "../components/analytics/TopSourcesChart";
import { Card } from "../components/ui/Card";
import { useAnalytics } from "../hooks/useAnalytics";
export function Analytics() {
  const { agentId } = useParams();
  const { data, isLoading, error } = useAnalytics(agentId || null);
  if (isLoading)
    return <div className="text-center py-8">Loading analytics...</div>;
  if (error || !data)
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load analytics
      </div>
    );
  const acceptanceRateValue =
    data.totalTopics > 0
      ? Math.round((data.acceptanceRate.accepted / data.totalTopics) * 100)
      : 0;
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {" "}
      <div>
        {" "}
        <h1 className="text-3xl font-extrabold text-white tracking-wide mb-2">
          Analytics
        </h1>{" "}
        <p className="text-white">
          Performance and content metrics for your AI agent.
        </p>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {" "}
        <Card className="p-6">
          {" "}
          <p className="text-sm font-medium text-white mb-1">
            Total Posts
          </p>{" "}
          <p className="text-4xl font-extrabold text-white">
            {data.totalPosts}
          </p>{" "}
        </Card>{" "}
        <Card className="p-6">
          {" "}
          <p className="text-sm font-medium text-white mb-1">
            Acceptance Rate
          </p>{" "}
          <p className="text-4xl font-extrabold text-green-500">
            {acceptanceRateValue}%
          </p>{" "}
        </Card>{" "}
        <Card className="p-6">
          {" "}
          <p className="text-sm font-medium text-white mb-1">
            Topics Analyzed
          </p>{" "}
          <p className="text-4xl font-extrabold text-white">
            {data.totalTopics}
          </p>{" "}
        </Card>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PostsOverTimeChart data={data.postsPerDay} />
        </div>
        <div>
          <AcceptanceRateChart
            accepted={data.acceptanceRate.accepted}
            rejected={data.acceptanceRate.rejected}
          />
        </div>
      </div>

      <TopSourcesChart data={data.topSources} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.averages && (
          <Card className="p-6 border-zinc-800 bg-black">
            <h2 className="text-xl font-bold text-white mb-4">Average Scores</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <span className="text-zinc-400">Overall Score</span>
                <span className="font-bold text-blue-400 text-lg">{data.averages.score}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Novelty</span>
                <span className="font-semibold text-zinc-100">{data.averages.novelty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Substance</span>
                <span className="font-semibold text-zinc-100">{data.averages.substance}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Credibility</span>
                <span className="font-semibold text-zinc-100">{data.averages.credibility}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Relevance</span>
                <span className="font-semibold text-zinc-100">{data.averages.relevance}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Timeliness</span>
                <span className="font-semibold text-zinc-100">{data.averages.timeliness}</span>
              </div>
            </div>
          </Card>
        )}

        {data.topRejections && data.topRejections.length > 0 && (
          <Card className="p-6 border-zinc-800 bg-black">
            <h2 className="text-xl font-bold text-white mb-4">Top Rejection Reasons</h2>
            <div className="space-y-4">
              {data.topRejections.map((r, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-sm">
                    {r.count}
                  </div>
                  <div className="flex-1 text-sm text-zinc-300 leading-tight flex items-center">
                    {r.reason}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

    </div>
  );
}
