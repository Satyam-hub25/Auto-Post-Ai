import { motion, AnimatePresence } from "framer-motion";
import { Brain, Link as LinkIcon } from "lucide-react";
import { Post } from "./PostCard";

interface RationalePanelProps {
  isExpanded: boolean;
  post: Post;
}

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center gap-3 text-xs">
    <span className="w-24 text-zinc-400">{label}</span>
    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full bg-blue-500 rounded-full"
      />
    </div>
    <span className="w-8 text-right font-medium text-zinc-300">{value}</span>
  </div>
);

export function RationalePanel({
  isExpanded,
  post,
}: RationalePanelProps) {
  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="p-4 mt-4 bg-zinc-900 rounded-xl border border-zinc-800 space-y-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <Brain className="w-4 h-4" /> <span>Editorial Rationale</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {post.rationale}
              </p>
            </div>

            {post.scores && (
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <span className="w-4 h-4 flex items-center justify-center rounded-sm bg-blue-900/50 text-[10px] text-blue-400">#</span> 
                  <span>Scores</span>
                </div>
                <div className="space-y-2">
                  <ScoreBar label="Novelty" value={post.scores.novelty} />
                  <ScoreBar label="Substance" value={post.scores.substance} />
                  <ScoreBar label="Credibility" value={post.scores.credibility} />
                  <ScoreBar label="Relevance" value={post.scores.relevance} />
                  <ScoreBar label="Timeliness" value={post.scores.timeliness} />
                  <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between text-xs font-semibold">
                    <span className="text-white">Final Score</span>
                    <span className="text-blue-400">{post.scores.score}</span>
                  </div>
                </div>
              </div>
            )}

            {post.candidatesCount !== undefined && post.candidatesCount > 0 && (
              <div className="text-xs text-zinc-500 italic mt-2">
                {post.candidatesCount} candidates considered this cycle
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
