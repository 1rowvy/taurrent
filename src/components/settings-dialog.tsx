import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Settings } from "@/lib/api";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open: isOpen, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    api.getSettings().then(setSettings, (e) => setError(String(e)));
  }, [isOpen]);

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Changes are saved automatically.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="download-dir">Default download folder</Label>
          <div className="flex gap-2">
            <Input id="download-dir" readOnly value={settings?.downloadDir ?? ""} />
            <Button variant="outline" onClick={pickDownloadDir} disabled={!settings}>
              <FolderOpen /> Browse…
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
