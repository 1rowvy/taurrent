use std::sync::Arc;

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
    pub async fn start(app: &AppHandle) -> anyhow::Result<Self> {
        let download_dir = app
            .path()
            .download_dir()
            .context("resolving download dir")?;
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
