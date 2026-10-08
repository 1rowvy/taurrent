import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Sidebar, type Selection, type StatusFilter } from "@/components/layout/sidebar";
import { Titlebar } from "@/components/layout/titlebar";
import { UpdateCard } from "@/components/layout/update-card";
import {
  type AddSource,
  AddTorrentButton,
  AddTorrentDialog,
} from "@/components/torrents/add-torrent";
import { DetailsPanel } from "@/components/details/details-panel";
import { TorrentTable } from "@/components/torrents/torrent-table";
import { Toaster } from "@/components/ui/sonner";
import { useSettings } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";
import { useSystemIntegration } from "@/hooks/use-system-integration";
import { useTorrentDetails } from "@/hooks/use-torrent-details";
import { useTorrentDrop } from "@/hooks/use-torrent-drop";
import { DemoModeError, useTorrents } from "@/hooks/use-torrents";
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
  const { t } = useTranslation();
  const [selection, setSelection] = useState<Selection>({ kind: "status", status: "all" });
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(new Set());
  const [focusedId, setFocusedId] = useState<number | null>(null);
  // Torrents waiting for the add dialog, shown one at a time.
  const [addQueue, setAddQueue] = useState<{ source?: AddSource }[]>([]);
  const adding = addQueue[0] ?? null;
  const queueAdd = (...requests: { source?: AddSource }[]) =>
    setAddQueue((q) => [...q, ...requests]);
  const { theme, setTheme } = useTheme();
  const { torrents, stats, history, actions } = useTorrents();
  const {
    settings,
    error,
    restartNeeded,
    setDownloadDir,
    setNotifications,
    setAutoUpdate,
    setLanguage,
    setCloseToTray,
    setConnection,
    setLimits,
  } = useSettings();
  const updater = useUpdater(settings?.autoUpdate);

  useEffect(() => applyLanguage(settings?.language), [settings?.language]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STATUS_MATCH).map(([k, match]) => [k, torrents.filter(match).length]),
      ) as Record<StatusFilter, number>,
    [torrents],
  );

  const showError = (e: unknown) =>
    toast.error(e instanceof DemoModeError ? t("errors.demo") : String(e));
  /** Runs an action on each torrent; failures are reported one by one. */
  const runAll = (ids: number[], action: (id: number) => Promise<void>) =>
    ids.forEach((id) => action(id).catch(showError));

  const dragging = useTorrentDrop((paths) => {
    if (paths.length === 1) {
      queueAdd({ source: { kind: "file", path: paths[0] } });
    } else {
      // Several files at once skip the dialog and use the default folder.
      paths.forEach((path) => actions.addTorrentFile(path).catch(showError));
    }
  });

  const visible =
    selection.kind === "status" ? torrents.filter(STATUS_MATCH[selection.status]) : torrents;

  const selected = torrents.find((t) => t.id === focusedId) ?? visible[0] ?? null;
  const { details, setFiles } = useTorrentDetails(selected);

  useSystemIntegration({
    onOpenRequests: (requests) => queueAdd(...requests.map((source) => ({ source }))),
    notifications: settings?.notifications,
  });

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
          header={<AddTorrentButton onClick={() => queueAdd({})} />}
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
              onCloseToTrayChange={setCloseToTray}
              onConnectionChange={setConnection}
              onLimitsChange={setLimits}
              restartNeeded={restartNeeded}
              updater={updater.state}
              onCheckUpdates={updater.checkNow}
              onInstallUpdate={updater.install}
            />
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col px-3 pt-5">
                <TorrentTable
                  torrents={visible}
                  selection={selectedIds}
                  focusedId={selected?.id ?? null}
                  onSelectionChange={(ids, focused) => {
                    setSelectedIds(ids);
                    setFocusedId(focused);
                  }}
                  onPause={(ids) => runAll(ids, actions.pause)}
                  onResume={(ids) => runAll(ids, actions.resume)}
                  onRemove={(ids, deleteFiles) =>
                    runAll(ids, (id) => actions.remove(id, deleteFiles))
                  }
                  onOpenFolder={(id) => actions.openFolder(id).catch(showError)}
                />
              </div>
              <DetailsPanel
                torrent={selected}
                details={details}
                session={stats}
                history={history}
                onSetFiles={(id, files) => setFiles(id, files).catch(showError)}
                onOpenFolder={(id) => actions.openFolder(id).catch(showError)}
                onOpenFile={(id, index) => actions.openFile(id, index).catch(showError)}
                onRevealFile={(id, index) => actions.revealFile(id, index).catch(showError)}
              />
            </>
          )}
        </main>
      </div>

      <AddTorrentDialog
        open={adding != null}
        onOpenChange={(open) => !open && setAddQueue((q) => q.slice(1))}
        initialSource={adding?.source}
        defaultDir={settings?.downloadDir}
        actions={actions}
        onError={showError}
      />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/70 p-6 backdrop-blur-sm">
          <div className="flex size-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/60 text-primary">
            <FileDown className="size-10" />
            <span className="text-base font-bold">{t("add.dropTitle")}</span>
            <span className="text-xs text-muted-foreground">{t("add.dropHint")}</span>
          </div>
        </div>
      )}

      <Toaster theme={theme} position="bottom-right" />
    </div>
  );
}

export default App;
