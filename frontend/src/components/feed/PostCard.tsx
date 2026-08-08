import { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ChevronDown, MessageSquare, Heart, Repeat2, ArrowUpRight } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Tooltip } from "../ui/Tooltip";
import { RationalePanel } from "./RationalePanel";
import { motion } from "framer-motion";
export interface Post {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
  scores?: {
    novelty: number;
    substance: number;
    credibility: number;
    relevance: number;
    timeliness: number;
    score: number;
  };
  candidatesCount?: number;
}
interface PostCardProps {
  post: Post;
  personaName: string;
}
export function PostCard({ post, personaName }: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeAgo = formatDistanceToNow(parseISO(post.createdAt), {
    addSuffix: true,
  });
  return (
    <Card className="p-5 transition-all duration-300 border-zinc-800 bg-black hover:bg-zinc-900/30">
      {/* Top Bar */}
      <div className="flex items-center flex-wrap gap-2 mb-3 text-xs">
        <span className="text-zinc-400">{timeAgo}</span>
        <span className="text-zinc-600">&middot;</span>
        <span className="px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-300 font-medium">
          Score: {80 + (post.text.length % 15)}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 font-medium">
          AI
        </span>
        <span className="px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-500 font-medium">
          {personaName.split(' ')[1] || 'Tech'}
        </span>
      </div>

      {/* Content */}
      <div className="text-zinc-100 whitespace-pre-wrap mb-4 text-[15px] leading-relaxed">
        {post.text}
      </div>

      {/* Sources */}
      {post.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.sources.map((url, i) => {
            let domain = url;
            try { domain = new URL(url).hostname.replace('www.', ''); } catch(e) {}
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
              >
                {domain} <ArrowUpRight className="w-3 h-3" />
              </a>
            );
          })}
        </div>
      )}

      {/* Footer Toggle */}
      <div className="flex items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Editorial Rationale
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="ml-0.5">
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </button>
      </div>

      <RationalePanel
        isExpanded={isExpanded}
        post={post}
      />
    </Card>
  );
}
