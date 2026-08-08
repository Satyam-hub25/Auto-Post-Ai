import { create } from "zustand";
import { persist } from "zustand/middleware";
interface AppState {
  theme: "dark" | "light";
  agentId: string | null;
  authToken: string | null;
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  setAgentId: (id: string | null) => void;
  setAuthToken: (token: string | null) => void;
  logout: () => void;
}
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "dark",
      agentId: null,
      authToken: null,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      setAgentId: (agentId) => set({ agentId }),
      setAuthToken: (authToken) => set({ authToken }),
      logout: () => set({ authToken: null, agentId: null }),
    }),
    { name: "ai-creator-storage" },
  ),
);
