import { motion, AnimatePresence } from "framer-motion";
import { Brain, Link as LinkIcon } from "lucide-react";
interface RationalePanelProps {
  isExpanded: boolean;
  rationale: string;
  sources: string[];
}
export function RationalePanel({
  isExpanded,
  rationale,
  sources,
}: RationalePanelProps) {
  return (
    <AnimatePresence initial={false}>
      {" "}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          {" "}
          <div className="p-4 mt-4 bg-zinc-900 rounded-xl border border-zinc-800 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <Brain className="w-4 h-4" /> <span>AI Rationale</span>
              </div>
              <p className="text-sm text-white leading-relaxed">
                {rationale}
              </p>
            </div>
          </div>{" "}
        </motion.div>
      )}{" "}
    </AnimatePresence>
  );
}
