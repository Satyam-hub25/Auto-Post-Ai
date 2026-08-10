import { NavLink, useParams } from "react-router-dom";
import { LayoutDashboard, FileText, BarChart3, Cpu } from "lucide-react";
import { cn } from "../../lib/utils";
export function Sidebar() {
  const { agentId } = useParams();
  const navItems = [
    { name: "New Agent", href: `/`, icon: LayoutDashboard },
    { name: "Dashboard", href: `/dashboard/${agentId}`, icon: LayoutDashboard },
    { name: "Editorial", href: `/editorial/${agentId}`, icon: FileText },
    { name: "Analytics", href: `/analytics/${agentId}`, icon: BarChart3 },
  ];
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r border-slate-800 bg-black">
      {" "}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        {" "}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 dark:from-blue-400 to-blue-800 dark:to-blue-600 flex items-center justify-center text-white shadow-lg shadow-zinc-900/5 dark:shadow-none">
          {" "}
          <Cpu className="w-5 h-5 text-white" />{" "}
        </div>{" "}
        <span className="font-semibold text-lg tracking-tight text-white">
          Auto-Post AI
        </span>{" "}
      </div>{" "}
      <nav className="flex-1 py-6 px-4 space-y-2">
        {" "}
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                isActive
                  ? "bg-zinc-100 dark:bg-zinc-800/50 text-white font-semibold font-semibold"
                  : "text-white hover:bg-gray-100 dark:hover:bg-zinc-100 dark:bg-zinc-800 hover:text-white dark:hover:text-white",
              )
            }
          >
            {" "}
            <item.icon className="w-5 h-5" /> {item.name}{" "}
          </NavLink>
        ))}{" "}
      </nav>{" "}
      <div className="p-4 border-t border-gray-200 dark:border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        {" "}
        <div className="text-xs text-white">
          Agent:{" "}
          <span className="font-mono">
            {agentId?.slice(0, 8) || "Unknown"}
          </span>
        </div>
      </div>
    </aside>
  );
}
