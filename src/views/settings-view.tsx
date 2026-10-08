import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Settings } from "@/lib/api";

interface SettingsViewProps {
  settings: Settings | null;
  error: string | null;
  onDownloadDirChange: (path: string) => void;
}

export function SettingsView({ settings, error, onDownloadDirChange }: SettingsViewProps) {
  async function pickDownloadDir() {
    const dir = await open({
      directory: true,
      defaultPath: settings?.downloadDir,
      title: "Default download folder",
    });
    if (typeof dir === "string") onDownloadDirChange(dir);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Changes are saved automatically.</p>
      </div>

      <section className="grid gap-2">
        <Label htmlFor="download-dir">Default download folder</Label>
        <div className="flex gap-2">
          <Input id="download-dir" readOnly value={settings?.downloadDir ?? ""} />
          <Button variant="outline" onClick={pickDownloadDir} disabled={!settings}>
            <FolderOpen /> Browse…
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}
