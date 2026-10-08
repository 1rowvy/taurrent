import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LANGUAGES } from "@/i18n";
import type { Settings } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SettingsViewProps {
  settings: Settings | null;
  error: string | null;
  onDownloadDirChange: (path: string) => void;
  onLanguageChange: (language: string | null) => void;
}

export function SettingsView({
  settings,
  error,
  onDownloadDirChange,
  onLanguageChange,
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

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
