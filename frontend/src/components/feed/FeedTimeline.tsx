import { motion } from "framer-motion";
import { PostCard, Post } from "./PostCard";
import { PostCardSkeleton } from "./PostCardSkeleton";
import { EmptyState } from "../ui/EmptyState";
import { Sparkles, Cpu } from "lucide-react";
interface FeedTimelineProps {
  posts: Post[];
  isLoading: boolean;
  personaName: string;
}
export function FeedTimeline({
  posts,
  isLoading,
  personaName,
}: FeedTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {" "}
        {[1, 2, 3].map((i) => (
          <PostCardSkeleton key={i} />
        ))}{" "}
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={
          <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-t-2 border-b-2 border-blue-500 opacity-50"
            />
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Cpu className="w-8 h-8 text-blue-500" />
            </motion.div>
          </div>
        }
        title="Agent is Initializing"
        description="Your AI persona is currently researching and preparing its first post. This usually takes a few minutes."
      />
    );
  }
  return (
    <div className="space-y-6">
      {" "}
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          {" "}
          <PostCard post={post} personaName={personaName} />{" "}
        </motion.div>
      ))}{" "}
    </div>
  );
}
