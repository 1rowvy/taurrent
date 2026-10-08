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
    /// UI language code; `None` follows the system language.
    #[serde(default)]
    pub language: Option<String>,
}

pub const LANGUAGES: &[&str] = &["en", "ru"];

fn default_true() -> bool {
    true
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
                download_dir: app
                    .path()
                    .download_dir()
                    .context("resolving download dir")?,
                notifications: true,
                language: None,
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

    pub fn set_language(&self, language: Option<String>) -> anyhow::Result<Settings> {
        if let Some(lang) = &language
            && !LANGUAGES.contains(&lang.as_str())
        {
            anyhow::bail!("unsupported language: {lang}");
        }
        self.update(|s| s.language = language)
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
