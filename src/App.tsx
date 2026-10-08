import { useState } from "react";
import { Plus } from "lucide-react";
import { Sidebar, type View } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useDashboard } from "@/hooks/use-dashboard";
import { useTheme } from "@/hooks/use-theme";
import { DashboardView } from "@/views/dashboard-view";
import { SettingsView } from "@/views/settings-view";
import { TorrentsView } from "@/views/torrents-view";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const { theme, toggle } = useTheme();
  const { torrents, stats, disk } = useDashboard();

  const q = query.trim().toLowerCase();
  const filtered = q ? torrents.filter((t) => t.name.toLowerCase().includes(q)) : torrents;

  return (
    <div className="flex h-full bg-background text-foreground">
      <Sidebar view={view} onViewChange={setView} theme={theme} onToggleTheme={toggle} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar query={query} onQueryChange={setQuery} stats={stats} />

        <main className="relative mr-4 mb-4 min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-card">
          <div className="h-full overflow-y-auto p-7 pb-24">
            {view === "dashboard" && (
              <DashboardView
                torrents={filtered}
                stats={stats}
                disk={disk}
                onSeeAll={() => setView("torrents")}
              />
            )}
            {view === "torrents" && <TorrentsView torrents={filtered} />}
            {view === "settings" && <SettingsView />}
          </div>

          {view !== "settings" && (
            <button
              className="absolute right-6 bottom-6 grid size-13 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
              aria-label="Add torrent"
            >
              <Plus className="size-6" />
            </button>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
