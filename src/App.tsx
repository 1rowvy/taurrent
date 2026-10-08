import { useEffect, useState } from "react";
import { Plus, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/settings-dialog";
import { api, type EngineStatus } from "@/lib/api";

function App() {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function refresh() {
    try {
      setStatus(await api.engineStatus());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Taurrent</h1>
        <div className="flex gap-2">
          <Button size="sm" disabled>
            <Plus /> Add torrent
          </Button>
          <Button size="sm" variant="outline" onClick={refresh}>
            <RefreshCw />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings />
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : status ? (
          <span>
            Engine v{status.version} · port {status.listenPort ?? "—"} ·{" "}
            {status.torrentCount} torrents
          </span>
        ) : (
          <span>Starting engine…</span>
        )}
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default App;
