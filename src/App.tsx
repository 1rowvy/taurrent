import { useEffect, useMemo, useState } from "react";
import { Sidebar, type Selection, type StatusFilter } from "@/components/layout/sidebar";
import { Titlebar } from "@/components/layout/titlebar";
import { UpdateCard } from "@/components/layout/update-card";
import { TorrentTable } from "@/components/torrents/torrent-table";
import { SpeedChart } from "@/components/transfer/speed-chart";
import { TransferStats } from "@/components/transfer/transfer-stats";
import { useSettings } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";
import { useTorrents } from "@/hooks/use-torrents";
import { useUpdater } from "@/hooks/use-updater";
import { applyLanguage } from "@/i18n";
import type { TorrentSummary } from "@/lib/types";
import { SettingsView } from "@/views/settings-view";

const STATUS_MATCH: Record<StatusFilter, (t: TorrentSummary) => boolean> = {
  all: () => true,
  downloading: (t) => t.state === "downloading",
  seeding: (t) => t.state === "seeding",
  completed: (t) => t.progress >= 1,
};

function App() {
  const [selection, setSelection] = useState<Selection>({ kind: "status", status: "all" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { theme, setTheme } = useTheme();
  const { torrents, stats, history } = useTorrents();
  const { settings, error, setDownloadDir, setNotifications, setAutoUpdate, setLanguage } =
    useSettings();
  const updater = useUpdater(settings?.autoUpdate);

  useEffect(() => applyLanguage(settings?.language), [settings?.language]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STATUS_MATCH).map(([k, match]) => [k, torrents.filter(match).length]),
      ) as Record<StatusFilter, number>,
    [torrents],
  );

  const visible =
    selection.kind === "status" ? torrents.filter(STATUS_MATCH[selection.status]) : torrents;

  const selected = torrents.find((t) => t.id === selectedId) ?? visible[0] ?? null;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <Titlebar />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          selection={selection}
          onSelect={setSelection}
          counts={counts}
          dark={theme === "dark"}
          onDarkChange={(dark) => setTheme(dark ? "dark" : "light")}
          notifications={settings?.notifications}
          onNotificationsChange={setNotifications}
          footer={<UpdateCard state={updater.state} onInstall={updater.install} />}
        />

        <main className="mr-2 mb-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-card">
          {selection.kind === "settings" ? (
            <SettingsView
              settings={settings}
              error={error}
              onDownloadDirChange={setDownloadDir}
              onLanguageChange={setLanguage}
              onAutoUpdateChange={setAutoUpdate}
              appVersion={updater.version}
              updater={updater.state}
              onCheckUpdates={updater.checkNow}
              onInstallUpdate={updater.install}
            />
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col px-3 pt-5">
                <TorrentTable
                  torrents={visible}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelectedId}
                />
              </div>
              <div className="flex h-64 shrink-0 gap-6 border-t border-border px-6 py-5">
                <SpeedChart history={history} />
                <TransferStats torrent={selected} session={stats} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
