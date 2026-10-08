import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UpdaterState } from "@/hooks/use-updater";
import { LANGUAGES } from "@/i18n";
import type { Settings } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SettingsViewProps {
  settings: Settings | null;
  error: string | null;
  onDownloadDirChange: (path: string) => void;
  onLanguageChange: (language: string | null) => void;
  onAutoUpdateChange: (enabled: boolean) => void;
  appVersion: string | null;
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
  appVersion,
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
    <div className="flex max-w-2xl flex-col gap-6 p-6">
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

      <section className="grid gap-3">
        <Label>{t("updates.title")}</Label>
        {appVersion && (
          <p className="text-sm text-muted-foreground">
            {t("updates.currentVersion", { version: appVersion })}
          </p>
        )}
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
