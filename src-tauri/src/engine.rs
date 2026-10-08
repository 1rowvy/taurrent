use std::{path::PathBuf, sync::Arc};

use anyhow::Context;
use librqbit::{Session, SessionOptions, SessionPersistenceConfig};
use serde::Serialize;
use tauri::{AppHandle, Manager};

/// Wraps the librqbit session shared across Tauri commands.
pub struct Engine {
    session: Arc<Session>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    version: &'static str,
    listen_port: Option<u16>,
    torrent_count: usize,
}

impl Engine {
    /// `download_dir` only seeds the session default; per-torrent folders
    /// come from `SettingsStore` via `AddTorrentOptions::output_folder`.
    pub async fn start(app: &AppHandle, download_dir: PathBuf) -> anyhow::Result<Self> {
        let data_dir = app
            .path()
            .app_data_dir()
            .context("resolving app data dir")?;

        let session = Session::new_with_opts(
            download_dir,
            SessionOptions {
                fastresume: true,
                persistence: Some(SessionPersistenceConfig::Json {
                    folder: Some(data_dir.join("session")),
                }),
                ..Default::default()
            },
        )
        .await
        .context("starting torrent session")?;

        Ok(Self { session })
    }

    pub fn status(&self) -> EngineStatus {
        EngineStatus {
            version: env!("CARGO_PKG_VERSION"),
            listen_port: self.session.announce_port(),
            torrent_count: self.session.with_torrents(|t| t.count()),
        }
    }
}
