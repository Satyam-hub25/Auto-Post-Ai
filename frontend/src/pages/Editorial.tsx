import { useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs } from "../components/ui/Tabs";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { useTopics } from "../hooks/useTopics";
import { Skeleton } from "../components/ui/Skeleton";
export function Editorial() {
  const { agentId } = useParams();
  const [activeTab, setActiveTab] = useState("all");
  const { data, isLoading, error } = useTopics(agentId || null);
  const topics = data?.candidates || [];
  const filteredTopics = topics.filter(
    (t) => activeTab === "all" || t.status === activeTab,
  );
  return (
    <div className="max-w-4xl mx-auto">
      {" "}
      <div className="mb-8">
        {" "}
        <h1 className="text-3xl font-extrabold text-white tracking-wide mb-2">
          Editorial Queue
        </h1>{" "}
        <p className="text-white">
          Review what the agent considered posting and why.
        </p>{" "}
      </div>{" "}
      <Tabs
        tabs={[
          { id: "all", label: "All Topics" },
          { id: "accepted", label: "Accepted" },
          { id: "rejected", label: "Rejected" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-8 w-fit"
      />{" "}
      <div className="space-y-4">
        {" "}
        {isLoading && <Skeleton className="h-32 w-full" />}{" "}
        {error && <div className="text-red-500">Failed to load topics.</div>}{" "}
        {!isLoading && !error && filteredTopics.length === 0 && (
          <div className="text-center py-12 bg-black rounded-lg border border-slate-800">
            {" "}
            <p className="text-white">The editorial queue is empty.</p>{" "}
          </div>
        )}{" "}
        {filteredTopics.map((topic) => (
          <Card key={topic.id} className="p-5">
            {" "}
            <div className="flex items-start justify-between mb-3">
              {" "}
              <h3 className="text-lg font-extrabold text-white tracking-wide">
                {topic.title}
              </h3>{" "}
              <Badge
                variant={topic.status === "accepted" ? "success" : "danger"}
              >
                {" "}
                {topic.status === "accepted" ? (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                ) : (
                  <XCircle className="w-3 h-3 mr-1" />
                )}{" "}
                {topic.status}{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="text-sm text-white space-y-1">
              {" "}
              <p>
                <span className="font-bold text-white">Reason:</span>{" "}
                {topic.reason}
              </p>{" "}
              <p>
                <span className="font-bold text-white">Source:</span>{" "}
                <a
                  href={topic.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 font-semibold hover:underline"
                >
                  {topic.sourceUrl}
                </a>
              </p>{" "}
              <p>
                <span className="font-bold text-white">Discovered:</span>{" "}
                {new Date(topic.discoveredAt).toLocaleString()}
              </p>{" "}
            </div>{" "}
          </Card>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
