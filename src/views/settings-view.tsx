import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Settings } from "@/lib/api";

export function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings, (e) => setError(String(e)));
  }, []);

  async function pickDownloadDir() {
    const dir = await open({
      directory: true,
      defaultPath: settings?.downloadDir,
      title: "Default download folder",
    });
    if (typeof dir !== "string") return;
    try {
      setSettings(await api.setDownloadDir(dir));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Changes are saved automatically.</p>
      </div>

      <section className="grid gap-2 rounded-2xl bg-muted p-5">
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
