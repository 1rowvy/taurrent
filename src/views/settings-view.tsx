import { open } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { FolderOpen, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UpdaterState } from "@/hooks/use-updater";
import { LANGUAGES } from "@/i18n";
import type { ConnectionSettings, Settings, SpeedLimits } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SettingsViewProps {
  settings: Settings | null;
  error: string | null;
  onDownloadDirChange: (path: string) => void;
  onLanguageChange: (language: string | null) => void;
  onAutoUpdateChange: (enabled: boolean) => void;
  onCloseToTrayChange: (enabled: boolean) => void;
  onConnectionChange: (connection: ConnectionSettings) => void;
  onLimitsChange: (limits: SpeedLimits) => void;
  /** Connection settings differ from what the engine was started with. */
  restartNeeded: boolean;
  updater: UpdaterState;
  onCheckUpdates: () => void;
  onInstallUpdate: () => void;
}

export function SettingsView({
  settings,
  error,
  onDownloadDirChange,
  onLanguageChange,
  onAutoUpdateChange,
  onCloseToTrayChange,
  onConnectionChange,
  onLimitsChange,
  restartNeeded,
  updater,
  onCheckUpdates,
  onInstallUpdate,
}: SettingsViewProps) {
  const { t } = useTranslation();

  async function pickDownloadDir() {
    const dir = await open({
      directory: true,
      defaultPath: settings?.downloadDir,
      title: t("settings.downloadDirDialog"),
    });
    if (typeof dir === "string") onDownloadDirChange(dir);
  }

  return (
    <div className="flex min-h-0 max-w-2xl flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h2 className="text-lg font-bold">{t("settings.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.autosave")}</p>
      </div>

      <section className="grid gap-2">
        <Label htmlFor="download-dir">{t("settings.downloadDir")}</Label>
        <div className="flex gap-2">
          <Input id="download-dir" readOnly value={settings?.downloadDir ?? ""} />
          <Button variant="outline" onClick={pickDownloadDir} disabled={!settings}>
            <FolderOpen /> {t("settings.browse")}
          </Button>
        </div>
      </section>

      <section className="grid gap-2">
        <Label>{t("settings.language")}</Label>
        <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
          {[{ code: null, label: t("settings.languageSystem") }, ...LANGUAGES].map((l) => (
            <button
              key={l.code ?? "system"}
              onClick={() => onLanguageChange(l.code)}
              disabled={!settings}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground",
                settings?.language === l.code && "bg-background text-foreground shadow-sm",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <label className="flex w-fit cursor-pointer items-center gap-3 text-sm">
        <Switch
          checked={settings?.closeToTray ?? false}
          disabled={!settings}
          onCheckedChange={onCloseToTrayChange}
        />
        {t("settings.closeToTray")}
      </label>

      <section className="grid gap-3">
        <div>
          <Label>{t("settings.speedTitle")}</Label>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.speedHint")}</p>
        </div>
        <div className="flex gap-4">
          <NumberField
            id="limit-down"
            label={t("settings.downloadLimit")}
            value={settings?.limits.download}
            max={4_000_000}
            onCommit={(download) => settings && onLimitsChange({ ...settings.limits, download })}
          />
          <NumberField
            id="limit-up"
            label={t("settings.uploadLimit")}
            value={settings?.limits.upload}
            max={4_000_000}
            onCommit={(upload) => settings && onLimitsChange({ ...settings.limits, upload })}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <div>
          <Label>{t("settings.connectionTitle")}</Label>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.connectionHint")}</p>
        </div>
        <div className="flex gap-4">
          <NumberField
            id="listen-port"
            label={t("settings.listenPort")}
            value={settings?.connection.listenPort}
            min={1024}
            max={65535}
            onCommit={(listenPort) =>
              settings && onConnectionChange({ ...settings.connection, listenPort })
            }
          />
          <NumberField
            id="peer-limit"
            label={t("settings.peerLimit")}
            value={settings?.connection.peerLimit}
            max={10_000}
            onCommit={(peerLimit) =>
              settings && onConnectionChange({ ...settings.connection, peerLimit })
            }
          />
        </div>
        {(["upnp", "dht"] as const).map((key) => (
          <label key={key} className="flex w-fit cursor-pointer items-center gap-3 text-sm">
            <Switch
              checked={settings?.connection[key] ?? false}
              disabled={!settings}
              onCheckedChange={(on) =>
                settings && onConnectionChange({ ...settings.connection, [key]: on })
              }
            />
            {t(`settings.${key}`)}
          </label>
        ))}
        {restartNeeded && (
          <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
            <span className="flex-1 text-sm">{t("settings.restartNeeded")}</span>
            <Button size="sm" onClick={() => relaunch()}>
              <RotateCcw /> {t("settings.restart")}
            </Button>
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <Label>{t("updates.title")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("updates.currentVersion", { version: __APP_VERSION__ })}
        </p>
        <label className="flex w-fit cursor-pointer items-center gap-3 text-sm">
          <Switch
            checked={settings?.autoUpdate ?? false}
            disabled={!settings}
            onCheckedChange={onAutoUpdateChange}
          />
          {t("updates.autoCheck")}
        </label>
        <div className="flex items-center gap-3">
          {updater.status === "available" ? (
            <Button onClick={onInstallUpdate}>{t("updates.install")}</Button>
          ) : (
            <Button
              variant="outline"
              onClick={onCheckUpdates}
              disabled={updater.status === "checking" || updater.status === "downloading"}
            >
              <RefreshCw className={cn(updater.status === "checking" && "animate-spin")} />
              {t("updates.checkNow")}
            </Button>
          )}
          <UpdateStatus state={updater} />
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function UpdateStatus({ state }: { state: UpdaterState }) {
  const { t } = useTranslation();
  switch (state.status) {
    case "checking":
      return <span className="text-sm text-muted-foreground">{t("updates.checking")}</span>;
    case "upToDate":
      return <span className="text-sm text-muted-foreground">{t("updates.upToDate")}</span>;
    case "available":
      return (
        <span className="text-sm font-semibold text-primary">
          {t("updates.available", { version: state.version })}
        </span>
      );
    case "downloading":
      return (
        <span className="text-sm text-muted-foreground">
          {t("updates.downloading")}
          {state.progress != null && ` ${Math.round(state.progress * 100)}%`}
        </span>
      );
    case "error":
      return (
        <span className="text-sm text-destructive">
          {t("updates.error", { message: state.message })}
        </span>
      );
    default:
      return null;
  }
}

/** A whole-number input that commits on blur or Enter, clamped to its range. */
function NumberField({
  id,
  label,
  value,
  min = 0,
  max,
  onCommit,
}: {
  id: string;
  label: string;
  value: number | undefined;
  min?: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(value?.toString() ?? "");
  useEffect(() => setText(value?.toString() ?? ""), [value]);

  function commit() {
    const parsed = Number.parseInt(text, 10);
    const next = Number.isNaN(parsed) ? (value ?? min) : Math.min(max, Math.max(min, parsed));
    setText(next.toString());
    if (next !== value) onCommit(next);
  }

  return (
    <div className="grid flex-1 gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        value={text}
        disabled={value == null}
        onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="tabular-nums"
      />
    </div>
  );
}
