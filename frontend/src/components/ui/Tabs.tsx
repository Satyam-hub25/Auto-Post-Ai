import { useState } from "react";
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";
interface Tab {
  id: string;
  label: string;
}
interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}
export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex space-x-1 p-1 bg-gray-100 dark:bg-white dark:bg-zinc-900 rounded-xl",
        className,
      )}
    >
      {" "}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors outline-none",
            activeTab === tab.id
              ? "text-white"
              : "text-white hover:text-white dark:hover:text-gray-200",
          )}
        >
          {" "}
          {activeTab === tab.id && (
            <motion.div
              layoutId="active-tab"
              className="absolute inset-0 bg-white dark:bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}{" "}
          <span className="relative z-10">{tab.label}</span>{" "}
        </button>
      ))}{" "}
    </div>
  );
}
