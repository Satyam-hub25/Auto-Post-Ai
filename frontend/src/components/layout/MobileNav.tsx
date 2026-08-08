import { NavLink, useParams } from "react-router-dom";
import { LayoutDashboard, FileText, BarChart3 } from "lucide-react";
import { cn } from "../../lib/utils";
export function MobileNav() {
  const { agentId } = useParams();
  const navItems = [
    { name: "Dashboard", href: `/dashboard/${agentId}`, icon: LayoutDashboard },
    { name: "Editorial", href: `/editorial/${agentId}`, icon: FileText },
    { name: "Analytics", href: `/analytics/${agentId}`, icon: BarChart3 },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-t flex justify-around p-3 pb-safe z-50">
      {" "}
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              isActive
                ? "text-white font-semibold font-semibold"
                : "text-white hover:text-white dark:hover:text-white",
            )
          }
        >
          {" "}
          <item.icon className="w-6 h-6" />{" "}
          <span className="text-[10px] font-medium">{item.name}</span>{" "}
        </NavLink>
      ))}{" "}
    </nav>
  );
}
