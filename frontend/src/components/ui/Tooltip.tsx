import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
}
export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {" "}
      {children}{" "}
      <AnimatePresence>
        {" "}
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -tranzinc-x-1/2 mb-2 px-2 py-1 bg-white dark:bg-zinc-900 dark:bg-white text-white text-xs rounded shadow-lg whitespace-nowrap z-50 pointer-events-none"
          >
            {" "}
            {content}{" "}
            <div className="absolute top-full left-1/2 -tranzinc-x-1/2 border-4 border-transparent border-t-navy-900 dark:border-t-white" />{" "}
          </motion.div>
        )}{" "}
      </AnimatePresence>{" "}
    </div>
  );
}
