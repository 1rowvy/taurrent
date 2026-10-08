import { File, FolderOpen } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { SpeedChart } from "@/components/transfer/speed-chart";
import { TransferStats } from "@/components/transfer/transfer-stats";
import { formatBytes } from "@/lib/format";
import type {
  SessionStats,
  SpeedSample,
  TorrentDetails,
  TorrentFile,
  TorrentSummary,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "general" | "files" | "peers" | "trackers";
const TABS: Tab[] = ["general", "files", "peers", "trackers"];

interface DetailsPanelProps {
  torrent: TorrentSummary | null;
  details: TorrentDetails | null;
  session: SessionStats;
  history: SpeedSample[];
  onSetFiles: (id: number, files: number[]) => void;
  onOpenFolder: (id: number) => void;
  onOpenFile: (id: number, index: number) => void;
  onRevealFile: (id: number, index: number) => void;
}

export function DetailsPanel({
  torrent,
  details,
  session,
  history,
  ...actions
}: DetailsPanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("general");
  // Without a torrent only the session-wide overview makes sense.
  const active = torrent ? tab : "general";

  return (
    <div className="flex h-72 shrink-0 flex-col border-t border-border">
      <div className="flex shrink-0 gap-1 px-5 pt-3">
        {TABS.map((id) => (
          <button
            key={id}
            disabled={!torrent && id !== "general"}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
              active === id && "bg-muted text-foreground",
            )}
          >
            {t(`details.${id}`)}
            {id === "files" && details && details.files.length > 1 && (
              <span className="ml-1 text-muted-foreground">{details.files.length}</span>
            )}
            {id === "peers" && details && details.peers.length > 0 && (
              <span className="ml-1 text-muted-foreground">{details.peers.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 px-6 pt-3 pb-5">
        {active === "general" && (
          <div className="flex min-w-0 flex-1 gap-6">
            <SpeedChart history={history} />
            <TransferStats torrent={torrent} session={session} />
          </div>
        )}
        {active === "files" && torrent && (
          <FilesTab torrent={torrent} details={details} {...actions} />
        )}
        {active === "peers" && <PeersTab details={details} />}
        {active === "trackers" && torrent && (
          <InfoTab torrent={torrent} details={details} onOpenFolder={actions.onOpenFolder} />
        )}
      </div>
    </div>
  );
}

const HEAD = "text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground/70 uppercase";

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function FilesTab({
  torrent,
  details,
  onSetFiles,
  onOpenFile,
  onRevealFile,
}: {
  torrent: TorrentSummary;
  details: TorrentDetails | null;
} & Pick<DetailsPanelProps, "onSetFiles" | "onOpenFile" | "onRevealFile">) {
  const { t } = useTranslation();
  if (!details) return <Placeholder text={t("details.loading")} />;
  if (details.files.length === 0) return <Placeholder text={t("details.noMetadata")} />;

  const included = details.files.filter((f) => f.included).map((f) => f.index);

  function toggle(file: TorrentFile, on: boolean) {
    const next = on ? [...included, file.index] : included.filter((i) => i !== file.index);
    // librqbit needs at least one file; pausing is the way to stop everything.
    if (next.length > 0) onSetFiles(torrent.id, next);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        className={cn(
          HEAD,
          "grid shrink-0 grid-cols-[1.5rem_minmax(0,1fr)_5.5rem_8rem] gap-3 px-2 pb-1.5",
        )}
      >
        <span />
        <span>{t("table.name")}</span>
        <span className="text-right">{t("table.size")}</span>
        <span>{t("table.progress")}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {details.files.map((f) => {
          const progress = f.size > 0 ? f.downloaded / f.size : 1;
          return (
            <ContextMenu key={f.index}>
              <ContextMenuTrigger asChild>
                <div
                  onDoubleClick={() => onOpenFile(torrent.id, f.index)}
                  className={cn(
                    "grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem_8rem] items-center gap-3 rounded-md px-2 py-1 text-xs tabular-nums hover:bg-muted/50",
                    !f.included && "text-muted-foreground",
                  )}
                >
                  <Checkbox
                    checked={f.included}
                    disabled={f.included && included.length === 1}
                    onCheckedChange={(on) => toggle(f, on === true)}
                  />
                  <span className="flex min-w-0 items-center gap-2" title={f.path.join("/")}>
                    <File className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {f.path.length > 1 && (
                        <span className="text-muted-foreground">
                          {f.path.slice(0, -1).join("/")}/
                        </span>
                      )}
                      <span className="font-semibold">{f.path[f.path.length - 1]}</span>
                    </span>
                  </span>
                  <span className="text-right">{formatBytes(f.size)}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          progress >= 1 ? "bg-success" : "bg-primary",
                          !f.included && "bg-muted-foreground/60",
                        )}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </span>
                    <span className="w-9 text-right text-muted-foreground">
                      {Math.floor(progress * 100)}%
                    </span>
                  </span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <ContextMenuItem onSelect={() => onOpenFile(torrent.id, f.index)}>
                  {t("details.openFile")}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onRevealFile(torrent.id, f.index)}>
                  {t("details.showInFolder")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
}

function PeersTab({ details }: { details: TorrentDetails | null }) {
  const { t } = useTranslation();
  if (!details) return <Placeholder text={t("details.loading")} />;
  if (details.peers.length === 0) return <Placeholder text={t("details.noPeers")} />;

  const grid = "grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_3.5rem_6rem_6rem] gap-3";
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={cn(HEAD, grid, "shrink-0 px-2 pb-1.5")}>
        <span>{t("details.address")}</span>
        <span>{t("details.client")}</span>
        <span>{t("details.connection")}</span>
        <span className="text-right">{t("transfer.downloaded")}</span>
        <span className="text-right">{t("transfer.uploaded")}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {details.peers.map((p) => (
          <div
            key={p.address}
            className={cn(
              grid,
              "items-center rounded-md px-2 py-1 text-xs tabular-nums hover:bg-muted/50",
            )}
          >
            <span className="truncate font-semibold">{p.address}</span>
            <span className="truncate text-muted-foreground">{p.client ?? "—"}</span>
            <span className="text-muted-foreground uppercase">{p.connection ?? "—"}</span>
            <span className="text-right">{formatBytes(p.downloaded)}</span>
            <span className="text-right">{formatBytes(p.uploaded)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoTab({
  torrent,
  details,
  onOpenFolder,
}: {
  torrent: TorrentSummary;
  details: TorrentDetails | null;
  onOpenFolder: (id: number) => void;
}) {
  const { t } = useTranslation();
  if (!details) return <Placeholder text={t("details.loading")} />;

  return (
    <div className="flex min-w-0 flex-1 gap-8">
      <dl className="grid w-80 shrink-0 content-start gap-3 text-xs">
        <div>
          <dt className="text-[0.6rem] font-semibold text-muted-foreground">
            {t("details.saveTo")}
          </dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-semibold">
            <span className="truncate select-text" title={details.outputFolder}>
              {details.outputFolder}
            </span>
            <button
              onClick={() => onOpenFolder(torrent.id)}
              title={t("actions.openFolder")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <FolderOpen className="size-3.5" />
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-[0.6rem] font-semibold text-muted-foreground">
            {t("details.infoHash")}
          </dt>
          <dd className="mt-0.5 font-mono text-[0.7rem] break-all select-text">
            {details.infoHash}
          </dd>
        </div>
        {details.pieceCount > 0 && (
          <div>
            <dt className="text-[0.6rem] font-semibold text-muted-foreground">
              {t("details.pieces")}
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {t("details.piecesValue", {
                count: details.pieceCount,
                size: formatBytes(details.pieceLength, 0),
              })}
            </dd>
          </div>
        )}
      </dl>

      <div className="flex min-w-0 flex-1 flex-col">
        <h4 className={cn(HEAD, "shrink-0 pb-1.5")}>{t("details.trackers")}</h4>
        {details.trackers.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("details.noTrackers")}</p>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {details.trackers.map((url) => (
              <li key={url} className="truncate py-0.5 text-xs select-text" title={url}>
                {url}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
