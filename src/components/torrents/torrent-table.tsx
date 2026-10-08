import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  Pause,
  RefreshCw,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TFunction } from "i18next";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes, formatEta } from "@/lib/format";
import type { TorrentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRID =
  "grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_5.5rem_6.5rem_3.5rem_3.5rem] items-center gap-4";
/** Row height plus the gap between rows, in px. */
const ROW_HEIGHT = 44;
const ROW_GAP = 2;

type SortKey = "name" | "progress" | "size" | "timeLeft" | "seeds" | "peers";
interface Sort {
  key: SortKey;
  desc: boolean;
}

const SORT_STORAGE_KEY = "taurrent.sort";

const COLUMNS: { key: SortKey; align?: "right" }[] = [
  { key: "name" },
  { key: "progress" },
  { key: "size", align: "right" },
  { key: "timeLeft" },
  { key: "seeds", align: "right" },
  { key: "peers", align: "right" },
];

/** Torrents without an ETA (paused, done, stalled) sort after any ETA. */
const SORT_VALUE: Record<SortKey, (t: TorrentSummary) => string | number> = {
  name: (t) => t.name,
  progress: (t) => t.progress,
  size: (t) => t.totalBytes,
  timeLeft: (t) => t.eta ?? Number.POSITIVE_INFINITY,
  seeds: (t) => t.seeds,
  peers: (t) => t.peers,
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compare(sort: Sort) {
  const value = SORT_VALUE[sort.key];
  return (a: TorrentSummary, b: TorrentSummary) => {
    const va = value(a);
    const vb = value(b);
    const order =
      typeof va === "string" && typeof vb === "string"
        ? collator.compare(va, vb)
        : va === vb
          ? 0
          : va < vb
            ? -1
            : 1;
    // Ties keep the order torrents were added in, so rows don't jump around.
    return (sort.desc ? -order : order) || a.id - b.id;
  };
}

function loadSort(): Sort | null {
  try {
    const sort = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY) ?? "null");
    return sort && sort.key in SORT_VALUE ? { key: sort.key, desc: !!sort.desc } : null;
  } catch {
    return null;
  }
}

function saveSort(sort: Sort | null) {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
  } catch {
    // Remembering the sort is a convenience only.
  }
}

/** Asc → desc → unsorted, starting with desc for numbers. */
function nextSort(sort: Sort | null, key: SortKey): Sort | null {
  const firstDesc = key !== "name" && key !== "timeLeft";
  if (sort?.key !== key) return { key, desc: firstDesc };
  if (sort.desc === firstDesc) return { key, desc: !firstDesc };
  return null;
}

export interface RowActions {
  onPause: (ids: number[]) => void;
  onResume: (ids: number[]) => void;
  onRemove: (ids: number[], deleteFiles: boolean) => void;
  onOpenFolder: (id: number) => void;
}

interface TorrentTableProps extends RowActions {
  torrents: TorrentSummary[];
  /** Selected torrent ids; may include torrents not in `torrents`. */
  selection: ReadonlySet<number>;
  /** The torrent shown in the stats panel and the anchor for shift-click. */
  focusedId: number | null;
  onSelectionChange: (selection: Set<number>, focusedId: number | null) => void;
}

export function TorrentTable({
  torrents,
  selection,
  focusedId,
  onSelectionChange,
  ...actions
}: TorrentTableProps) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<Sort | null>(loadSort);
  // Removing with files is the one irreversible action, so it asks first.
  const [confirmDelete, setConfirmDelete] = useState<TorrentSummary[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => (sort ? [...torrents].sort(compare(sort)) : torrents),
    [torrents, sort],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT + ROW_GAP,
    getItemKey: (i) => rows[i].id,
    overscan: 8,
  });

  const selected = rows.filter((r) => selection.has(r.id));

  function changeSort(key: SortKey) {
    const next = nextSort(sort, key);
    setSort(next);
    saveSort(next);
  }

  function click(e: React.MouseEvent, torrent: TorrentSummary) {
    if (e.shiftKey) {
      const anchor = rows.findIndex((r) => r.id === focusedId);
      const index = rows.indexOf(torrent);
      const [from, to] = anchor < 0 ? [index, index] : [anchor, index].sort((a, b) => a - b);
      const range = rows.slice(from, to + 1).map((r) => r.id);
      // Keep the anchor so further shift-clicks resize the same range.
      const base = e.ctrlKey || e.metaKey ? selection : [];
      onSelectionChange(new Set([...base, ...range]), anchor < 0 ? torrent.id : focusedId);
    } else if (e.ctrlKey || e.metaKey) {
      const next = new Set(selection);
      if (next.has(torrent.id)) next.delete(torrent.id);
      else next.add(torrent.id);
      onSelectionChange(next, torrent.id);
    } else {
      onSelectionChange(new Set([torrent.id]), torrent.id);
    }
  }

  function contextMenu(torrent: TorrentSummary) {
    // Right-clicking outside the selection acts on that row alone.
    if (!selection.has(torrent.id)) onSelectionChange(new Set([torrent.id]), torrent.id);
  }

  function keyDown(e: React.KeyboardEvent) {
    if (rows.length === 0) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      onSelectionChange(new Set(rows.map((r) => r.id)), focusedId ?? rows[0].id);
    } else if (e.key === "Escape") {
      onSelectionChange(new Set(), focusedId);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const current = rows.findIndex((r) => r.id === focusedId);
      const step = e.key === "ArrowDown" ? 1 : -1;
      const index = Math.min(rows.length - 1, Math.max(0, current < 0 ? 0 : current + step));
      const id = rows[index].id;
      onSelectionChange(e.shiftKey ? new Set([...selection, id]) : new Set([id]), id);
      virtualizer.scrollToIndex(index);
    }
  }

  const rowActions: RowActions = {
    ...actions,
    onRemove: (ids, deleteFiles) => {
      if (!deleteFiles) return actions.onRemove(ids, false);
      setConfirmDelete(rows.filter((r) => ids.includes(r.id)));
    },
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          GRID,
          "px-4 pb-2 text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground/70 uppercase",
        )}
      >
        {COLUMNS.map(({ key, align }) => {
          const SortIcon = sort?.key === key ? (sort.desc ? ChevronDown : ChevronUp) : null;
          return (
            <button
              key={key}
              onClick={() => changeSort(key)}
              className={cn(
                "flex min-w-0 items-center gap-0.5 uppercase transition-colors hover:text-foreground",
                key === "name" && "pl-6",
                align === "right" && "flex-row-reverse",
                SortIcon && "text-foreground",
              )}
            >
              <span className="truncate">{t(`table.${key}`)}</span>
              {SortIcon && <SortIcon className="size-3 shrink-0" />}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Inbox className="size-8" />
          <span className="text-sm font-semibold">{t("table.emptyTitle")}</span>
          <span className="text-xs">{t("table.emptyHint")}</span>
        </div>
      ) : (
        <div
          ref={scrollRef}
          tabIndex={0}
          onKeyDown={keyDown}
          onMouseDown={(e) => {
            // Clicking below the last row clears the selection.
            if (e.target === e.currentTarget) onSelectionChange(new Set(), focusedId);
          }}
          className="min-h-0 flex-1 overflow-y-auto outline-none"
        >
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const torrent = rows[item.index];
              return (
                <Row
                  key={item.key}
                  torrent={torrent}
                  top={item.start}
                  selected={selection.has(torrent.id)}
                  // The menu acts on the whole selection, or just this row.
                  targets={selection.has(torrent.id) ? selected : [torrent]}
                  onClick={(e) => click(e, torrent)}
                  onContextMenu={() => contextMenu(torrent)}
                  actions={rowActions}
                />
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={confirmDelete != null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("remove.title")}</DialogTitle>
            <DialogDescription>
              {confirmDelete?.length === 1
                ? t("remove.description", { name: confirmDelete[0].name })
                : t("remove.descriptionMany", { count: confirmDelete?.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              {t("remove.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete)
                  actions.onRemove(
                    confirmDelete.map((t) => t.id),
                    true,
                  );
                setConfirmDelete(null);
              }}
            >
              {t("actions.removeWithFiles")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function statusIcon(t: TorrentSummary): { icon: LucideIcon; className: string } {
  switch (t.state) {
    case "downloading":
      return { icon: ArrowDown, className: "text-primary" };
    case "seeding":
      return { icon: ArrowUp, className: "text-upload" };
    case "checking":
      return { icon: RefreshCw, className: "text-muted-foreground" };
    case "error":
      return { icon: AlertTriangle, className: "text-destructive" };
    case "paused":
      return t.progress >= 1
        ? { icon: Check, className: "text-success" }
        : { icon: Pause, className: "text-muted-foreground" };
  }
}

function timeLeft(t: TorrentSummary, tr: TFunction): string {
  if (t.state === "error") return tr("state.error");
  if (t.state === "checking") return tr("state.checking");
  if (t.progress >= 1) return tr(t.state === "seeding" ? "state.seeding" : "state.completed");
  if (t.state === "paused") return tr("state.paused");
  return formatEta(t.eta);
}

/** Appends the number of affected torrents when the menu acts on several. */
function withCount(label: string, count: number) {
  return count > 1 ? `${label} (${count})` : label;
}

function Row({
  torrent: t,
  top,
  selected,
  targets,
  onClick,
  onContextMenu,
  actions,
}: {
  torrent: TorrentSummary;
  top: number;
  selected: boolean;
  targets: TorrentSummary[];
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: () => void;
  actions: RowActions;
}) {
  const { t: tr } = useTranslation();
  const { icon: Icon, className: iconClass } = statusIcon(t);
  const inactive = t.state === "paused";
  const done = t.progress >= 1;

  const paused = targets.filter((x) => x.state === "paused").map((x) => x.id);
  const running = targets
    .filter((x) => x.state !== "paused" && x.state !== "error")
    .map((x) => x.id);
  const all = targets.map((x) => x.id);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          onContextMenu={onContextMenu}
          title={t.error ?? undefined}
          style={{ transform: `translateY(${top}px)`, height: ROW_HEIGHT }}
          className={cn(
            GRID,
            "absolute inset-x-0 top-0 rounded-lg px-4 text-left text-[0.8rem] font-semibold tabular-nums transition-colors select-none hover:bg-muted/50",
            selected && "bg-muted hover:bg-muted",
            inactive && !selected && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon className={cn("size-3.5 shrink-0", iconClass)} />
            <span className="truncate">{t.name}</span>
          </span>

          <span className="h-1 overflow-hidden rounded-full bg-foreground/10">
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-700",
                done
                  ? "bg-success shadow-[0_0_8px] shadow-success/60"
                  : inactive
                    ? "bg-muted-foreground/60"
                    : "bg-primary shadow-[0_0_8px] shadow-primary/60",
              )}
              style={{ width: `${t.progress * 100}%` }}
            />
          </span>

          <span className="text-right">{formatBytes(t.totalBytes)}</span>
          <span
            className={cn(done && "text-success", inactive && !done && "text-muted-foreground")}
          >
            {timeLeft(t, tr)}
          </span>
          <span className="text-right">{t.seeds}</span>
          <span className="text-right">{t.peers}</span>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        {paused.length > 0 && (
          <ContextMenuItem onSelect={() => actions.onResume(paused)}>
            {withCount(tr("actions.resume"), paused.length)}
          </ContextMenuItem>
        )}
        {(running.length > 0 || paused.length === 0) && (
          <ContextMenuItem
            disabled={running.length === 0}
            onSelect={() => actions.onPause(running)}
          >
            {withCount(tr("actions.pause"), running.length)}
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => actions.onOpenFolder(t.id)}>
          {tr("actions.openFolder")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => actions.onRemove(all, false)}>
          {withCount(tr("actions.remove"), all.length)}
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={() => actions.onRemove(all, true)}>
          {withCount(tr("actions.removeWithFiles"), all.length)}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
