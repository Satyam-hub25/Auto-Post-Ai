import { NavLink, useParams } from "react-router-dom";
import { LayoutDashboard, FileText, BarChart3 } from "lucide-react";
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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="14" height="14" rx="2" stroke="#3b82f6" strokeWidth="1.5"/>
            <rect x="8" y="8" width="8" height="8" rx="1" stroke="#60a5fa" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="1.5" fill="#60a5fa"/>
            <line x1="12" y1="2" x2="12" y2="5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="12" y1="19" x2="12" y2="22" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="12" x2="5" y2="12" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="19" y1="12" x2="22" y2="12" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="2" x2="8" y2="5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="16" y1="2" x2="16" y2="5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="19" x2="8" y2="22" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="16" y1="19" x2="16" y2="22" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="8" x2="5" y2="8" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="16" x2="5" y2="16" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="19" y1="8" x2="22" y2="8" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="19" y1="16" x2="22" y2="16" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="font-bold text-xl tracking-widest text-white" style={{ letterSpacing: '0.15em' }}>
          NOVA
        </span>
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
