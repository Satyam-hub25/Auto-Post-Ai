import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
export function AppShell() {
  const theme = useAppStore((state) => state.theme);
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);
  return (
    <div className="flex h-screen overflow-hidden bg-black text-white transition-colors duration-300">
      {" "}
      <Sidebar />{" "}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {" "}
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {" "}
          <Outlet />{" "}
        </div>{" "}
      </main>{" "}
      <MobileNav />{" "}
    </div>
  );
}
