use std::{
    fs,
    path::{Path, PathBuf},
    sync::RwLock,
};

use anyhow::Context;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// Folder new torrents are saved to unless overridden when adding.
    pub download_dir: PathBuf,
    /// Show a system notification when a download finishes.
    #[serde(default = "default_true")]
    pub notifications: bool,
    /// Check for app updates on startup.
    #[serde(default = "default_true")]
    pub auto_update: bool,
    /// UI language code; `None` follows the system language.
    #[serde(default)]
    pub language: Option<String>,
    /// Closing the window hides it to the tray instead of quitting.
    #[serde(default = "default_true")]
    pub close_to_tray: bool,
    /// Incoming connection settings; applied on the next start.
    #[serde(default)]
    pub connection: ConnectionSettings,
    /// Speed limits in KiB/s, `0` for unlimited; applied right away.
    #[serde(default)]
    pub limits: SpeedLimits,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSettings {
    /// TCP port for incoming peer connections.
    #[serde(default = "random_port")]
    pub listen_port: u16,
    #[serde(default = "default_true")]
    pub upnp: bool,
    #[serde(default = "default_true")]
    pub dht: bool,
    /// Max connected peers per torrent, `0` for librqbit's default.
    #[serde(default)]
    pub peer_limit: u32,
}

impl Default for ConnectionSettings {
    fn default() -> Self {
        Self {
            listen_port: random_port(),
            upnp: true,
            dht: true,
            peer_limit: 0,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeedLimits {
    #[serde(default)]
    pub download: u32,
    #[serde(default)]
    pub upload: u32,
}

pub const LANGUAGES: &[&str] = &["en", "ru"];

fn default_true() -> bool {
    true
}

/// A port from the dynamic range, picked once when settings are created so
/// clients on the same network don't all collide on one well-known port.
fn random_port() -> u16 {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.subsec_nanos());
    49152 + (nanos % 16384) as u16
}

/// Settings persisted as JSON in the app config dir.
pub struct SettingsStore {
    path: PathBuf,
    current: RwLock<Settings>,
}

impl SettingsStore {
    pub fn load(app: &AppHandle) -> anyhow::Result<Self> {
        let path = app
            .path()
            .app_config_dir()
            .context("resolving app config dir")?
            .join("settings.json");

        let current = match fs::read(&path) {
            Ok(bytes) => serde_json::from_slice(&bytes)
                .with_context(|| format!("parsing {}", path.display()))?,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Settings {
                // Minimal Linux setups may have no XDG user dirs configured.
                download_dir: app
                    .path()
                    .download_dir()
                    .or_else(|_| app.path().home_dir().map(|h| h.join("Downloads")))
                    .context("resolving download dir")?,
                notifications: true,
                auto_update: true,
                language: None,
                close_to_tray: true,
                connection: ConnectionSettings::default(),
                limits: SpeedLimits::default(),
            },
            Err(e) => return Err(e).with_context(|| format!("reading {}", path.display())),
        };

        Ok(Self {
            path,
            current: RwLock::new(current),
        })
    }

    pub fn get(&self) -> Settings {
        self.current.read().unwrap().clone()
    }

    pub fn set_download_dir(&self, dir: &Path) -> anyhow::Result<Settings> {
        if !dir.is_dir() {
            anyhow::bail!("{} is not an existing folder", dir.display());
        }
        self.update(|s| s.download_dir = dir.to_path_buf())
    }

    pub fn set_notifications(&self, enabled: bool) -> anyhow::Result<Settings> {
        self.update(|s| s.notifications = enabled)
    }

    pub fn set_auto_update(&self, enabled: bool) -> anyhow::Result<Settings> {
        self.update(|s| s.auto_update = enabled)
    }

    pub fn set_language(&self, language: Option<String>) -> anyhow::Result<Settings> {
        if let Some(lang) = &language
            && !LANGUAGES.contains(&lang.as_str())
        {
            anyhow::bail!("unsupported language: {lang}");
        }
        self.update(|s| s.language = language)
    }

    pub fn set_close_to_tray(&self, enabled: bool) -> anyhow::Result<Settings> {
        self.update(|s| s.close_to_tray = enabled)
    }

    pub fn set_connection(&self, connection: ConnectionSettings) -> anyhow::Result<Settings> {
        anyhow::ensure!(
            connection.listen_port >= 1024,
            "port must be 1024 or higher"
        );
        self.update(|s| s.connection = connection)
    }

    pub fn set_limits(&self, limits: SpeedLimits) -> anyhow::Result<Settings> {
        self.update(|s| s.limits = limits)
    }

    fn update(&self, change: impl FnOnce(&mut Settings)) -> anyhow::Result<Settings> {
        let mut current = self.current.write().unwrap();
        let mut next = current.clone();
        change(&mut next);
        self.save(&next)?;
        *current = next.clone();
        Ok(next)
    }

    fn save(&self, settings: &Settings) -> anyhow::Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let tmp = self.path.with_extension("json.tmp");
        fs::write(&tmp, serde_json::to_vec_pretty(settings)?)?;
        fs::rename(&tmp, &self.path)?;
        Ok(())
    }
}
