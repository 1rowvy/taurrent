import { isTauri } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { AlertTriangle, File, FileUp, FolderOpen, Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { TorrentActions } from "@/hooks/use-torrents";
import { formatBytes } from "@/lib/format";
import type { TorrentPreview } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Where the dialog takes the torrent from when it opens. */
export type AddSource = { kind: "magnet"; url: string } | { kind: "file"; path: string };

export function AddTorrentButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button className="w-full justify-start" onClick={onClick}>
      <Plus /> {t("add.button")}
    </Button>
  );
}

/** Picks a `.torrent` file; `null` if the user cancels. */
export async function pickTorrentFile(title: string, filterName: string) {
  const path = await openDialog({
    title,
    filters: [{ name: filterName, extensions: ["torrent"] }],
  });
  return typeof path === "string" ? path : null;
}

async function clipboardMagnet(): Promise<string | null> {
  // Reading the clipboard in a plain browser prompts for permission.
  if (!isTauri()) return null;
  try {
    const text = (await readText()).trim();
    return text.toLowerCase().startsWith("magnet:?") ? text : null;
  } catch {
    return null; // Empty or non-text clipboard.
  }
}

type Step =
  { kind: "source" } | { kind: "resolving" } | { kind: "preview"; preview: TorrentPreview };

interface AddTorrentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolved right away when the dialog opens (drag & drop). */
  initialSource?: AddSource;
  defaultDir: string | undefined;
  actions: Pick<
    TorrentActions,
    "resolveMagnet" | "resolveTorrentFile" | "addResolved" | "discardResolved"
  >;
  onError: (error: unknown) => void;
}

export function AddTorrentDialog({
  open,
  onOpenChange,
  initialSource,
  defaultDir,
  actions,
  onError,
}: AddTorrentDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>({ kind: "source" });
  const [url, setUrl] = useState("");
  // Bumped on every resolve and on cancel, so stale results are dropped.
  const request = useRef(0);

  async function resolve(source: AddSource) {
    const id = ++request.current;
    setStep({ kind: "resolving" });
    try {
      const preview =
        source.kind === "magnet"
          ? await actions.resolveMagnet(source.url)
          : await actions.resolveTorrentFile(source.path);
      if (id !== request.current) return actions.discardResolved(preview.infoHash);
      setStep({ kind: "preview", preview });
    } catch (e) {
      if (id !== request.current) return;
      setStep({ kind: "source" });
      onError(e);
    }
  }

  useEffect(() => {
    if (!open) return;
    setStep({ kind: "source" });
    if (initialSource) {
      if (initialSource.kind === "magnet") setUrl(initialSource.url);
      resolve(initialSource);
    } else {
      setUrl("");
      clipboardMagnet().then((magnet) => magnet && setUrl((u) => u || magnet));
    }
    // Only when the dialog opens; `resolve` is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSource]);

  function close() {
    request.current++;
    if (step.kind === "preview") actions.discardResolved(step.preview.infoHash);
    onOpenChange(false);
  }

  async function pickFile() {
    const path = await pickTorrentFile(t("add.fileDialog"), t("add.fileFilter"));
    if (path) resolve({ kind: "file", path });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className={cn(step.kind === "preview" && "sm:max-w-xl")}>
        {step.kind === "preview" ? (
          <PreviewStep
            preview={step.preview}
            defaultDir={defaultDir ?? ""}
            onBack={() => {
              actions.discardResolved(step.preview.infoHash);
              setStep({ kind: "source" });
            }}
            onAdd={async (options) => {
              try {
                await actions.addResolved(step.preview.infoHash, options);
                onOpenChange(false);
              } catch (e) {
                onError(e);
              }
            }}
          />
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) resolve({ kind: "magnet", url: url.trim() });
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("add.title")}</DialogTitle>
              <DialogDescription>
                {step.kind === "resolving" ? t("add.resolvingHint") : t("add.sourceHint")}
              </DialogDescription>
            </DialogHeader>

            {step.kind === "resolving" ? (
              <div className="flex h-24 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t("add.resolving")}
              </div>
            ) : (
              <>
                <Input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="magnet:?xt=urn:btih:…"
                  spellCheck={false}
                />
                <Button type="button" variant="outline" onClick={pickFile}>
                  <FileUp /> {t("add.openFile")}
                </Button>
              </>
            )}

            <DialogFooter>
              {step.kind === "resolving" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    request.current++;
                    setStep({ kind: "source" });
                  }}
                >
                  {t("add.cancel")}
                </Button>
              ) : (
                <Button type="submit" disabled={!url.trim()}>
                  {t("add.next")}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewStep({
  preview,
  defaultDir,
  onBack,
  onAdd,
}: {
  preview: TorrentPreview;
  defaultDir: string;
  onBack: () => void;
  onAdd: (options: {
    downloadDir: string;
    onlyFiles: number[] | null;
    paused: boolean;
  }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(() => new Set(preview.files.map((f) => f.index)));
  const [dir, setDir] = useState(defaultDir);
  const [startNow, setStartNow] = useState(true);
  const [busy, setBusy] = useState(false);

  const files = preview.files;
  const allChecked = checked.size === files.length;
  const selectedBytes = files.reduce((sum, f) => sum + (checked.has(f.index) ? f.size : 0), 0);

  function toggle(index: number, on: boolean) {
    setChecked((c) => {
      const next = new Set(c);
      if (on) next.add(index);
      else next.delete(index);
      return next;
    });
  }

  async function browse() {
    const picked = await openDialog({
      directory: true,
      title: t("add.folderDialog"),
      defaultPath: dir || undefined,
    });
    if (typeof picked === "string") setDir(picked);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onAdd({
        downloadDir: dir,
        onlyFiles: allChecked ? null : [...checked].sort((a, b) => a - b),
        paused: !startNow,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid min-w-0 gap-4">
      <DialogHeader className="min-w-0">
        <DialogTitle className="truncate" title={preview.name}>
          {preview.name}
        </DialogTitle>
        <DialogDescription>
          {t("add.selectedSize", {
            selected: formatBytes(selectedBytes),
            total: formatBytes(preview.totalBytes),
          })}
        </DialogDescription>
      </DialogHeader>

      {preview.alreadyAdded && (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
          <AlertTriangle className="size-3.5 shrink-0" /> {t("add.alreadyAdded")}
        </div>
      )}

      {files.length > 1 && (
        <div className="grid min-w-0 gap-2">
          <label className="flex items-center gap-2.5 px-2 text-xs font-bold text-muted-foreground">
            <Checkbox
              checked={allChecked ? true : checked.size === 0 ? false : "indeterminate"}
              onCheckedChange={(on) =>
                setChecked(on === true ? new Set(files.map((f) => f.index)) : new Set())
              }
            />
            {t("add.files")} · {files.length}
          </label>
          <div className="max-h-60 min-w-0 overflow-y-auto rounded-lg border border-border p-1">
            {files.map((f) => {
              const name = f.path[f.path.length - 1];
              const folder = f.path.slice(0, -1).join("/");
              return (
                <label
                  key={f.index}
                  className="flex min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checked.has(f.index)}
                    onCheckedChange={(on) => toggle(f.index, on === true)}
                  />
                  <File className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate" title={f.path.join("/")}>
                    {folder && <span className="text-muted-foreground">{folder}/</span>}
                    <span className="font-semibold">{name}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatBytes(f.size)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="add-dir">{t("add.folder")}</Label>
        <div className="flex gap-2">
          <Input
            id="add-dir"
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            spellCheck={false}
          />
          <Button type="button" variant="outline" onClick={browse}>
            <FolderOpen /> {t("add.browse")}
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm font-semibold">
        <Switch checked={startNow} onCheckedChange={setStartNow} />
        {t("add.startNow")}
      </label>

      <DialogFooter className="items-center">
        {checked.size === 0 && (
          <span className="mr-auto text-xs text-destructive">{t("add.noFiles")}</span>
        )}
        <Button type="button" variant="outline" onClick={onBack}>
          {t("add.back")}
        </Button>
        <Button type="submit" disabled={busy || checked.size === 0 || !dir.trim()}>
          {busy && <Loader2 className="animate-spin" />}
          {t(busy ? "add.adding" : "add.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
