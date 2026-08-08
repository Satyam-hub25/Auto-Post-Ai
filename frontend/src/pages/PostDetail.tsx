import { useParams, useNavigate } from "react-router-dom";
import { Cpu, ArrowLeft, ExternalLink, Sparkles, Brain } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { useFeed } from "../hooks/useFeed";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Skeleton } from "../components/ui/Skeleton";
import { motion } from "framer-motion";
export function PostDetail() {
  const { agentId, postId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useFeed(agentId || null);
  const post = data?.posts?.find((p: any) => p.id === postId);
  if (isLoading)
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (!post)
    return (
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(`/dashboard/${agentId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card className="p-8 mt-4 text-center">
          <p className="text-white">Post not found</p>
        </Card>
      </div>
    );
  return (
    <div className="max-w-3xl mx-auto">
      {" "}
      <Button
        variant="ghost"
        onClick={() => navigate(`/dashboard/${agentId}`)}
        className="mb-6 -ml-4"
      >
        {" "}
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard{" "}
      </Button>{" "}
      <Card className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl">
        {" "}
        <div className="flex items-start justify-between mb-6">
          {" "}
          <div className="flex items-center gap-3">
            {" "}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 dark:from-blue-400 to-blue-800 dark:to-blue-600 flex items-center justify-center text-white shadow-md">
              {" "}
              <Cpu className="w-6 h-6 text-white" />{" "}
            </div>{" "}
            <div>
              {" "}
              <div className="font-semibold text-white flex items-center gap-2">
                {" "}
                Agent{" "}
                <Badge
                  variant="cyber"
                  className="scale-90 origin-left shimmer-bg"
                >
                  {" "}
                  <Sparkles className="w-3 h-3 mr-1" /> AI Generated{" "}
                </Badge>{" "}
              </div>{" "}
              <div className="text-sm text-white">
                {" "}
                {formatDistanceToNow(parseISO(post.createdAt), {
                  addSuffix: true,
                })}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="text-white whitespace-pre-wrap mb-8 text-lg leading-relaxed">
          {" "}
          {post.text}{" "}
        </div>{" "}
        <div className="bg-zinc-50 dark:bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-100 dark:border-zinc-200 dark:border-zinc-800 space-y-6">
          {" "}
          <div>
            {" "}
            <div className="flex items-center gap-2 text-sm font-semibold text-white font-semibold font-semibold mb-3">
              {" "}
              <Brain className="w-4 h-4" /> <span>AI Rationale</span>{" "}
            </div>{" "}
            <p className="text-sm text-white leading-relaxed">
              {" "}
              {post.rationale}{" "}
            </p>{" "}
          </div>{" "}
          {post.sources && post.sources.length > 0 && (
            <div className="pt-4 border-t border-gray-200 dark:border-zinc-200 dark:border-zinc-800">
              {" "}
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                {" "}
                <ExternalLink className="w-4 h-4" /> <span>Sources</span>{" "}
              </div>{" "}
              <div className="flex flex-wrap gap-2">
                {" "}
                {post.sources.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-white dark:bg-zinc-100 dark:bg-zinc-800 border border-gray-200 dark:border-navy-700 text-white hover:text-white font-semibold dark:hover:text-white font-semibold transition-colors"
                  >
                    {" "}
                    {url}{" "}
                  </a>
                ))}{" "}
              </div>{" "}
            </div>
          )}{" "}
        </div>{" "}
      </Card>{" "}
    </div>
  );
}
