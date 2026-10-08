use std::{
    collections::{HashMap, HashSet, VecDeque},
    fs,
    net::{Ipv6Addr, SocketAddr},
    num::NonZeroU32,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use anyhow::Context;
use librqbit::{
    AddTorrent, AddTorrentOptions, AddTorrentResponse, DhtSessionConfig, ListOnlyResponse,
    ListenerMode, ListenerOptions, ManagedTorrent, Session, SessionOptions,
    SessionPersistenceConfig, TorrentStatsState, api::TorrentIdOrHash, dht::DhtPersistenceConfig,
    limits::LimitsConfig,
};
use serde::Serialize;

/// Speed samples kept for the transfer chart (one per second).
const HISTORY: usize = 60;
/// How long to wait for a magnet's metadata when it has to be resolved up front.
const RESOLVE_TIMEOUT: Duration = Duration::from_secs(90);
/// Resolved torrents kept for the add dialog; older ones are dropped first.
const MAX_PENDING: usize = 16;

/// Wraps the librqbit session shared across Tauri commands.
pub struct Engine {
    session: Arc<Session>,
    /// The session's default output folder, fixed when it starts.
    default_dir: PathBuf,
    added: AddedTimes,
    history: Mutex<VecDeque<SpeedSample>>,
    /// Metadata resolved for the add dialog, keyed by info hash, waiting for
    /// the user to confirm. Oldest first.
    pending: Mutex<VecDeque<ListOnlyResponse>>,
    /// Torrents seen downloading, to notice when they finish.
    downloading: Mutex<HashSet<usize>>,
}

/// Session options taken from the settings when the engine starts.
#[derive(Clone, Debug, Default)]
pub struct EngineOptions {
    /// TCP port for incoming connections; `None` disables listening.
    pub listen_port: Option<u16>,
    pub upnp: bool,
    pub dht: bool,
    /// Max connected peers per torrent; `None` keeps librqbit's default.
    pub peer_limit: Option<usize>,
    /// Download / upload limits in bytes per second, `0` for unlimited.
    pub download_limit: u32,
    pub upload_limit: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    version: &'static str,
    listen_port: Option<u16>,
    torrent_count: usize,
}

/// Mirrors `TorrentState` in `src/lib/types.ts`.
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TorrentState {
    Downloading,
    Seeding,
    Paused,
    Checking,
    Error,
}

/// Mirrors `TorrentSummary` in `src/lib/types.ts`.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TorrentSummary {
    id: usize,
    name: String,
    total_bytes: u64,
    progress: f64,
    state: TorrentState,
    error: Option<String>,
    download_speed: u64,
    upload_speed: u64,
    downloaded_bytes: u64,
    uploaded_bytes: u64,
    eta: Option<u64>,
    elapsed: u64,
    seeds: u32,
    peers: u32,
}

#[derive(Clone, Copy, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStats {
    download_speed: u64,
    upload_speed: u64,
}

#[derive(Clone, Copy, Serialize)]
pub struct SpeedSample {
    down: u64,
    up: u64,
}

/// Mirrors `TorrentDetails` in `src/lib/types.ts`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TorrentDetails {
    id: usize,
    info_hash: String,
    /// Folder the torrent's files are written to.
    output_folder: PathBuf,
    piece_length: u32,
    piece_count: u32,
    files: Vec<FileDetails>,
    peers: Vec<PeerDetails>,
    trackers: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDetails {
    index: usize,
    path: Vec<String>,
    size: u64,
    downloaded: u64,
    included: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerDetails {
    address: String,
    client: Option<String>,
    /// `tcp`, `utp` or `socks`.
    connection: Option<String>,
    downloaded: u64,
    uploaded: u64,
}

/// Mirrors `TorrentPreview` in `src/lib/types.ts`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TorrentPreview {
    info_hash: String,
    name: String,
    total_bytes: u64,
    files: Vec<PreviewFile>,
    /// The session already has this torrent; adding it again is a no-op.
    already_added: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewFile {
    /// librqbit's file index, as passed back in `AddOptions::only_files`.
    index: usize,
    /// Path components inside the torrent.
    path: Vec<String>,
    size: u64,
}

/// What the user picked in the add dialog.
#[derive(Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddOptions {
    pub download_dir: PathBuf,
    /// File indices to download; `None` downloads everything.
    pub only_files: Option<Vec<usize>>,
    pub paused: bool,
}

/// Payload of the `torrents:update` event and of `list_torrents`.
#[derive(Clone, Serialize)]
pub struct Snapshot {
    torrents: Vec<TorrentSummary>,
    stats: SessionStats,
    history: Vec<SpeedSample>,
}

impl Engine {
    /// `download_dir` only seeds the session default; per-torrent folders
    /// come from `SettingsStore` via `AddTorrentOptions::output_folder`.
    pub async fn start(
        data_dir: &Path,
        download_dir: PathBuf,
        opts: &EngineOptions,
    ) -> anyhow::Result<Self> {
        let session_dir = data_dir.join("session");

        let session = match Self::new_session(&session_dir, &download_dir, opts).await {
            // The port may be taken by another client; a random one beats
            // not starting at all.
            Err(e) if opts.listen_port.is_some_and(|p| p != 0) => {
                eprintln!("starting session failed ({e:#}), retrying with a random port");
                let opts = EngineOptions {
                    listen_port: Some(0),
                    ..opts.clone()
                };
                Self::new_session(&session_dir, &download_dir, &opts).await?
            }
            result => result?,
        };

        Ok(Self {
            session,
            default_dir: download_dir,
            added: AddedTimes::load(session_dir.join("added.json")),
            history: Mutex::new(VecDeque::with_capacity(HISTORY)),
            pending: Mutex::new(VecDeque::new()),
            downloading: Mutex::new(HashSet::new()),
        })
    }

    async fn new_session(
        session_dir: &Path,
        download_dir: &Path,
        opts: &EngineOptions,
    ) -> anyhow::Result<Arc<Session>> {
        Session::new_with_opts(
            download_dir.to_path_buf(),
            SessionOptions {
                fastresume: true,
                persistence: Some(SessionPersistenceConfig::Json {
                    folder: Some(session_dir.to_path_buf()),
                }),
                dht: opts.dht.then(|| DhtSessionConfig {
                    persistence: Some(DhtPersistenceConfig {
                        config_filename: Some(session_dir.join("dht.json")),
                        ..Default::default()
                    }),
                    ..Default::default()
                }),
                listen: opts.listen_port.map(|port| ListenerOptions {
                    mode: ListenerMode::TcpOnly,
                    listen_addr: SocketAddr::from((Ipv6Addr::UNSPECIFIED, port)),
                    enable_upnp_port_forwarding: opts.upnp,
                    ..Default::default()
                }),
                peer_limit: opts.peer_limit,
                ratelimits: LimitsConfig {
                    download_bps: NonZeroU32::new(opts.download_limit),
                    upload_bps: NonZeroU32::new(opts.upload_limit),
                },
                ..Default::default()
            },
        )
        .await
        .context("starting torrent session")
    }

    /// Applies new speed limits (bytes per second, `0` for unlimited).
    pub fn set_limits(&self, download: u32, upload: u32) {
        self.session
            .ratelimits
            .set_download_bps(NonZeroU32::new(download));
        self.session
            .ratelimits
            .set_upload_bps(NonZeroU32::new(upload));
    }

    /// Stops all torrents and flushes the session state.
    pub async fn stop(&self) {
        self.session.stop().await;
    }

    pub fn status(&self) -> EngineStatus {
        EngineStatus {
            version: env!("CARGO_PKG_VERSION"),
            listen_port: self.session.announce_port(),
            torrent_count: self.session.with_torrents(|t| t.count()),
        }
    }

    pub async fn add_magnet(&self, url: &str, download_dir: &Path) -> anyhow::Result<usize> {
        self.add(AddTorrent::from_url(url), download_dir).await
    }

    pub async fn add_torrent_file(
        &self,
        path: &Path,
        download_dir: &Path,
    ) -> anyhow::Result<usize> {
        let bytes = fs::read(path).with_context(|| format!("reading {}", path.display()))?;
        self.add(AddTorrent::from_bytes(bytes), download_dir).await
    }

    async fn add(&self, add: AddTorrent<'_>, download_dir: &Path) -> anyhow::Result<usize> {
        if download_dir != self.default_dir {
            // An explicit output folder disables librqbit's sub-folder logic, so
            // resolve the metadata first and pick the sub-folder ourselves.
            return self.add_to(add, download_dir).await;
        }

        // The session default already puts multi-file torrents in a sub-folder.
        let opts = AddTorrentOptions {
            overwrite: true,
            ..Default::default()
        };
        let response = self
            .session
            .add_torrent(add, Some(opts))
            .await
            .context("adding torrent")?;
        self.added_response(response)
    }

    async fn add_to(&self, add: AddTorrent<'_>, download_dir: &Path) -> anyhow::Result<usize> {
        let listed = self.list(add).await?;
        self.add_listed(
            &listed,
            &AddOptions {
                download_dir: download_dir.to_path_buf(),
                ..Default::default()
            },
        )
        .await
    }

    /// Fetches a torrent's metadata without adding it, for the add dialog.
    /// The result is kept until `add_resolved` or `discard_resolved`.
    pub async fn resolve_magnet(&self, url: &str) -> anyhow::Result<TorrentPreview> {
        let listed = self.list(AddTorrent::from_url(url)).await?;
        Ok(self.keep_pending(listed))
    }

    pub async fn resolve_torrent_file(&self, path: &Path) -> anyhow::Result<TorrentPreview> {
        let bytes = fs::read(path).with_context(|| format!("reading {}", path.display()))?;
        let listed = self.list(AddTorrent::from_bytes(bytes)).await?;
        Ok(self.keep_pending(listed))
    }

    /// Adds a torrent previously returned by one of the `resolve_*` methods.
    pub async fn add_resolved(&self, info_hash: &str, opts: &AddOptions) -> anyhow::Result<usize> {
        let listed = self
            .take_pending(info_hash)
            .context("torrent metadata expired, add it again")?;
        let result = self.add_listed(&listed, opts).await;
        if result.is_err() {
            // Keep it so the user can fix the options and retry.
            self.pending.lock().unwrap().push_back(listed);
        }
        result
    }

    pub fn discard_resolved(&self, info_hash: &str) {
        self.take_pending(info_hash);
    }

    async fn list(&self, add: AddTorrent<'_>) -> anyhow::Result<ListOnlyResponse> {
        let listed = tokio::time::timeout(
            RESOLVE_TIMEOUT,
            self.session.add_torrent(
                add,
                Some(AddTorrentOptions {
                    list_only: true,
                    ..Default::default()
                }),
            ),
        )
        .await
        .context("timed out fetching torrent metadata")?
        .context("fetching torrent metadata")?;

        match listed {
            AddTorrentResponse::ListOnly(listed) => Ok(listed),
            _ => anyhow::bail!("bug: expected a list-only response"),
        }
    }

    fn keep_pending(&self, listed: ListOnlyResponse) -> TorrentPreview {
        let preview = preview(&listed, |hash| {
            self.session.get(TorrentIdOrHash::Hash(hash)).is_some()
        });
        let mut pending = self.pending.lock().unwrap();
        pending.retain(|p| p.info_hash != listed.info_hash);
        if pending.len() == MAX_PENDING {
            pending.pop_front();
        }
        pending.push_back(listed);
        preview
    }

    fn take_pending(&self, info_hash: &str) -> Option<ListOnlyResponse> {
        let mut pending = self.pending.lock().unwrap();
        let i = pending
            .iter()
            .position(|p| p.info_hash.as_string() == info_hash)?;
        pending.remove(i)
    }

    /// Adds resolved metadata. An explicit output folder disables librqbit's
    /// sub-folder logic, so multi-file torrents get their sub-folder here.
    async fn add_listed(
        &self,
        listed: &ListOnlyResponse,
        opts: &AddOptions,
    ) -> anyhow::Result<usize> {
        let file_count = listed.info.iter_file_details().count();
        let output_folder = match listed.info.name() {
            Some(name) if file_count > 1 && !name.is_empty() => {
                let sub = PathBuf::from(name.as_ref());
                anyhow::ensure!(
                    sub.components()
                        .all(|c| matches!(c, std::path::Component::Normal(_))),
                    "path traversal in torrent name detected"
                );
                opts.download_dir.join(sub)
            }
            None if file_count > 1 => opts.download_dir.join(listed.info_hash.as_string()),
            _ => opts.download_dir.clone(),
        };
        if let Some(only) = &opts.only_files {
            anyhow::ensure!(!only.is_empty(), "no files selected");
            anyhow::ensure!(
                only.iter().all(|&i| i < file_count),
                "invalid file selection"
            );
        }

        let response = self
            .session
            .add_torrent(
                AddTorrent::from_bytes(listed.torrent_bytes.clone()),
                Some(AddTorrentOptions {
                    overwrite: true,
                    paused: opts.paused,
                    only_files: opts.only_files.clone(),
                    output_folder: Some(output_folder.to_string_lossy().into_owned()),
                    initial_peers: Some(listed.seen_peers.clone()),
                    ..Default::default()
                }),
            )
            .await
            .context("adding torrent")?;
        self.added_response(response)
    }

    fn added_response(&self, response: AddTorrentResponse) -> anyhow::Result<usize> {
        match response {
            AddTorrentResponse::Added(id, handle) => {
                self.added.touch(&handle.info_hash().as_string());
                Ok(id)
            }
            AddTorrentResponse::AlreadyManaged(id, _) => Ok(id),
            AddTorrentResponse::ListOnly(_) => anyhow::bail!("bug: unexpected list-only response"),
        }
    }

    pub async fn pause(&self, id: usize) -> anyhow::Result<()> {
        let handle = self.handle(id)?;
        self.session.pause(&handle).await
    }

    pub async fn resume(&self, id: usize) -> anyhow::Result<()> {
        let handle = self.handle(id)?;
        self.session.unpause(&handle).await
    }

    pub async fn remove(&self, id: usize, delete_files: bool) -> anyhow::Result<()> {
        let hash = self.handle(id)?.info_hash().as_string();
        self.session
            .delete(TorrentIdOrHash::Id(id), delete_files)
            .await?;
        self.added.forget(&hash);
        Ok(())
    }

    pub async fn pause_all(&self) {
        for handle in self
            .session
            .with_torrents(|t| t.map(|(_, h)| h.clone()).collect::<Vec<_>>())
        {
            if !handle.is_paused() {
                let _ = self.session.pause(&handle).await;
            }
        }
    }

    pub async fn resume_all(&self) {
        for handle in self
            .session
            .with_torrents(|t| t.map(|(_, h)| h.clone()).collect::<Vec<_>>())
        {
            if handle.is_paused() {
                let _ = self.session.unpause(&handle).await;
            }
        }
    }

    /// Files, peers and trackers of one torrent, for the details panel.
    pub fn details(&self, id: usize) -> anyhow::Result<TorrentDetails> {
        let handle = self.handle(id)?;
        let stats = handle.stats();
        let only = handle.only_files();
        let (files, piece_length, piece_count) = handle
            .with_metadata(|m| {
                let files = m
                    .file_infos
                    .iter()
                    .enumerate()
                    .filter(|(_, f)| !f.attrs.padding)
                    .map(|(index, f)| FileDetails {
                        index,
                        path: f
                            .relative_filename
                            .components()
                            .map(|c| c.as_os_str().to_string_lossy().into_owned())
                            .collect(),
                        size: f.len,
                        downloaded: stats.file_progress.get(index).copied().unwrap_or(0),
                        included: only.as_ref().is_none_or(|o| o.contains(&index)),
                    })
                    .collect();
                let lengths = m.info.lengths();
                (
                    files,
                    lengths.default_piece_length(),
                    lengths.total_pieces(),
                )
            })
            .unwrap_or_default();

        let mut peers: Vec<PeerDetails> = handle
            .live()
            .map(|live| {
                live.per_peer_stats_snapshot(Default::default())
                    .peers
                    .into_iter()
                    .map(|(address, p)| PeerDetails {
                        address,
                        client: p.client_name,
                        connection: p
                            .conn_kind
                            .and_then(|k| serde_json::to_value(k).ok())
                            .and_then(|v| v.as_str().map(str::to_owned)),
                        downloaded: p.counters.fetched_bytes,
                        uploaded: p.counters.uploaded_bytes,
                    })
                    .collect()
            })
            .unwrap_or_default();
        peers.sort_by_key(|p| std::cmp::Reverse(p.downloaded + p.uploaded));

        let mut trackers: Vec<String> = handle
            .shared()
            .trackers
            .iter()
            .map(|u| u.to_string())
            .collect();
        trackers.sort();

        Ok(TorrentDetails {
            id,
            info_hash: handle.info_hash().as_string(),
            output_folder: handle.output_folder().to_path_buf(),
            piece_length,
            piece_count,
            files,
            peers,
            trackers,
        })
    }

    /// Changes which files of a torrent are downloaded.
    pub async fn set_files(&self, id: usize, files: &[usize]) -> anyhow::Result<()> {
        anyhow::ensure!(!files.is_empty(), "no files selected");
        let handle = self.handle(id)?;
        self.session
            .update_only_files(&handle, &files.iter().copied().collect())
            .await
    }

    /// The folder a torrent's data is written to.
    pub fn output_folder(&self, id: usize) -> anyhow::Result<PathBuf> {
        Ok(self.handle(id)?.output_folder().to_path_buf())
    }

    /// Where one of a torrent's files is stored on disk.
    pub fn file_path(&self, id: usize, index: usize) -> anyhow::Result<PathBuf> {
        let handle = self.handle(id)?;
        let relative = handle
            .with_metadata(|m| m.file_infos.get(index).map(|f| f.relative_filename.clone()))?
            .with_context(|| format!("no file {index} in torrent {id}"))?;
        Ok(handle.output_folder().join(relative))
    }

    fn handle(&self, id: usize) -> anyhow::Result<Arc<ManagedTorrent>> {
        self.session
            .get(TorrentIdOrHash::Id(id))
            .with_context(|| format!("no torrent with id {id}"))
    }

    /// Current torrents plus the speed history, without recording a sample.
    pub fn snapshot(&self) -> Snapshot {
        let (torrents, stats) = self.collect();
        let history = self.history.lock().unwrap().iter().copied().collect();
        Snapshot {
            torrents,
            stats,
            history,
        }
    }

    /// Like `snapshot`, but appends the current speeds to the history first,
    /// and also returns the names of torrents that finished since the last
    /// tick. Called once per second by the stats emitter.
    pub fn tick(&self) -> (Snapshot, Vec<String>) {
        let (torrents, stats) = self.collect();
        let completed = self.completed(&torrents);
        let history = {
            let mut history = self.history.lock().unwrap();
            if history.len() == HISTORY {
                history.pop_front();
            }
            history.push_back(SpeedSample {
                down: stats.download_speed,
                up: stats.upload_speed,
            });
            history.iter().copied().collect()
        };
        let snapshot = Snapshot {
            torrents,
            stats,
            history,
        };
        (snapshot, completed)
    }

    /// Only torrents seen downloading count, so ones restored complete (or
    /// still being checked at startup) don't trigger a notification.
    fn completed(&self, torrents: &[TorrentSummary]) -> Vec<String> {
        let mut downloading = self.downloading.lock().unwrap();
        let mut completed = Vec::new();
        let mut still = HashSet::new();
        for t in torrents {
            if t.state == TorrentState::Downloading {
                still.insert(t.id);
            } else if downloading.contains(&t.id) {
                if t.progress >= 1.0 {
                    completed.push(t.name.clone());
                } else if t.state != TorrentState::Error {
                    // Paused or checking: keep watching it.
                    still.insert(t.id);
                }
            }
        }
        *downloading = still;
        completed
    }

    fn collect(&self) -> (Vec<TorrentSummary>, SessionStats) {
        let now = unix_now();
        let mut torrents: Vec<TorrentSummary> = self.session.with_torrents(|iter| {
            iter.map(|(id, handle)| {
                let added = self
                    .added
                    .get_or_touch(&handle.info_hash().as_string(), now);
                summarize(id, handle, now.saturating_sub(added))
            })
            .collect()
        });
        torrents.sort_by_key(|t| t.id);

        let stats = torrents
            .iter()
            .fold(SessionStats::default(), |acc, t| SessionStats {
                download_speed: acc.download_speed + t.download_speed,
                upload_speed: acc.upload_speed + t.upload_speed,
            });
        (torrents, stats)
    }
}

fn summarize(id: usize, handle: &ManagedTorrent, elapsed: u64) -> TorrentSummary {
    let stats = handle.stats();
    let live = stats.live.as_ref();

    let state = match stats.state {
        TorrentStatsState::Initializing { .. } => TorrentState::Checking,
        TorrentStatsState::Live if stats.finished => TorrentState::Seeding,
        TorrentStatsState::Live => TorrentState::Downloading,
        TorrentStatsState::Paused => TorrentState::Paused,
        TorrentStatsState::Error => TorrentState::Error,
    };

    let download_speed = live.map_or(0, |l| l.download_speed.as_bytes());
    let upload_speed = live.map_or(0, |l| l.upload_speed.as_bytes());
    let remaining = stats.total_bytes.saturating_sub(stats.progress_bytes);
    let eta = (state == TorrentState::Downloading && download_speed > 0)
        .then(|| remaining.div_ceil(download_speed));
    // librqbit doesn't track whether a peer is a seeder, so "seeds" are the
    // peers we're connected to and "peers" all peers we know about.
    let (seeds, peers) = live.map_or((0, 0), |l| {
        let p = &l.snapshot.peer_stats;
        (p.live, p.seen)
    });

    TorrentSummary {
        id,
        name: handle
            .name()
            .unwrap_or_else(|| handle.info_hash().as_string()),
        total_bytes: stats.total_bytes,
        progress: if stats.total_bytes == 0 {
            0.0
        } else {
            stats.progress_bytes as f64 / stats.total_bytes as f64
        },
        state,
        error: stats.error.clone(),
        download_speed,
        upload_speed,
        downloaded_bytes: stats.progress_bytes,
        uploaded_bytes: stats.uploaded_bytes,
        eta,
        elapsed,
        seeds,
        peers,
    }
}

fn preview(
    listed: &ListOnlyResponse,
    is_managed: impl Fn(librqbit::dht::Id20) -> bool,
) -> TorrentPreview {
    let files: Vec<PreviewFile> = listed
        .info
        .iter_file_details()
        .enumerate()
        .filter(|(_, f)| !f.attrs().padding)
        .map(|(index, f)| PreviewFile {
            index,
            path: f.filename.to_vec(),
            size: f.len,
        })
        .collect();
    let info_hash = listed.info_hash.as_string();
    TorrentPreview {
        name: listed
            .info
            .name()
            .map(|n| n.into_owned())
            .filter(|n| !n.is_empty())
            .unwrap_or_else(|| info_hash.clone()),
        total_bytes: files.iter().map(|f| f.size).sum(),
        files,
        already_added: is_managed(listed.info_hash),
        info_hash,
    }
}

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs())
}

/// When each torrent was added (unix seconds, keyed by info hash), stored
/// next to librqbit's session files since librqbit doesn't record it.
struct AddedTimes {
    path: PathBuf,
    times: Mutex<HashMap<String, u64>>,
}

impl AddedTimes {
    fn load(path: PathBuf) -> Self {
        let times = fs::read(&path)
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default();
        Self {
            path,
            times: Mutex::new(times),
        }
    }

    fn touch(&self, hash: &str) {
        self.get_or_touch(hash, unix_now());
    }

    fn get_or_touch(&self, hash: &str, now: u64) -> u64 {
        let mut times = self.times.lock().unwrap();
        if let Some(&t) = times.get(hash) {
            return t;
        }
        times.insert(hash.to_owned(), now);
        self.save(&times);
        now
    }

    fn forget(&self, hash: &str) {
        let mut times = self.times.lock().unwrap();
        if times.remove(hash).is_some() {
            self.save(&times);
        }
    }

    /// Best effort: losing these only resets the "time elapsed" counters.
    fn save(&self, times: &HashMap<String, u64>) {
        let Ok(json) = serde_json::to_vec(times) else {
            return;
        };
        if let Some(parent) = self.path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let tmp = self.path.with_extension("json.tmp");
        if fs::write(&tmp, json).is_ok() {
            let _ = fs::rename(&tmp, &self.path);
        }
    }
}

#[cfg(test)]
mod tests {
    use librqbit::{CreateTorrentOptions, create_torrent, spawn_utils::BlockingSpawner};

    use super::*;

    /// Writes a two-file torrent's data to `<root>/content/pack/` and the
    /// `.torrent` itself to `<root>/pack.torrent`.
    async fn make_torrent(root: &Path) -> PathBuf {
        let pack = root.join("content").join("pack");
        fs::create_dir_all(&pack).unwrap();
        for (name, seed) in [("a.bin", 1u8), ("b.bin", 7)] {
            let data: Vec<u8> = (0..100_000u32)
                .map(|i| (i as u8).wrapping_mul(seed))
                .collect();
            fs::write(pack.join(name), data).unwrap();
        }
        let torrent = create_torrent(
            &pack,
            CreateTorrentOptions {
                name: Some("pack"),
                trackers: vec![],
                piece_length: Some(16384),
            },
            &BlockingSpawner::new(1),
        )
        .await
        .unwrap();
        let path = root.join("pack.torrent");
        fs::write(&path, torrent.as_bytes().unwrap()).unwrap();
        path
    }

    async fn wait_for(engine: &Engine, check: impl Fn(&TorrentSummary) -> bool) -> TorrentSummary {
        for _ in 0..100 {
            if let Some(t) = engine.snapshot().torrents.into_iter().find(&check) {
                return t;
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
        panic!("timed out waiting for torrent state");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn add_pause_restore_remove() {
        let tmp = tempfile::tempdir().unwrap();
        let data_dir = tmp.path().join("data");
        let default_dir = tmp.path().join("default");
        let content_dir = tmp.path().join("content");
        let torrent = make_torrent(tmp.path()).await;

        let engine = Engine::start(&data_dir, default_dir.clone(), &EngineOptions::default())
            .await
            .unwrap();
        // A folder other than the session default must still get the
        // per-torrent sub-folder, so the existing data is found and verified.
        let id = engine
            .add_torrent_file(&torrent, &content_dir)
            .await
            .unwrap();
        let t = wait_for(&engine, |t| t.id == id && t.state == TorrentState::Seeding).await;
        assert_eq!(t.name, "pack");
        assert_eq!(t.total_bytes, 200_000);
        assert_eq!(t.progress, 1.0);
        // Data that was already on disk isn't a finished download.
        assert!(engine.tick().1.is_empty());

        engine.pause(id).await.unwrap();
        wait_for(&engine, |t| t.id == id && t.state == TorrentState::Paused).await;
        engine.session.stop().await;
        drop(engine);

        // Restarting restores the torrent, still paused and complete.
        let engine = Engine::start(&data_dir, default_dir, &EngineOptions::default())
            .await
            .unwrap();
        let t = wait_for(&engine, |t| {
            t.name == "pack" && t.state == TorrentState::Paused
        })
        .await;
        assert_eq!(t.progress, 1.0);

        engine.remove(t.id, true).await.unwrap();
        assert!(engine.snapshot().torrents.is_empty());
        assert!(!content_dir.join("pack").join("a.bin").exists());
        engine.session.stop().await;
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn resolve_then_add_selected_files() {
        let tmp = tempfile::tempdir().unwrap();
        let torrent = make_torrent(tmp.path()).await;
        let engine = Engine::start(
            &tmp.path().join("data"),
            tmp.path().join("default"),
            &EngineOptions::default(),
        )
        .await
        .unwrap();

        let preview = engine.resolve_torrent_file(&torrent).await.unwrap();
        assert_eq!(preview.name, "pack");
        assert_eq!(preview.total_bytes, 200_000);
        assert!(!preview.already_added);
        let mut paths: Vec<_> = preview.files.iter().map(|f| f.path.join("/")).collect();
        paths.sort();
        assert_eq!(paths, ["a.bin", "b.bin"]);

        // A failed add keeps the metadata so it can be retried.
        let bad = AddOptions {
            only_files: Some(vec![5]),
            ..Default::default()
        };
        assert!(engine.add_resolved(&preview.info_hash, &bad).await.is_err());

        let download_dir = tmp.path().join("downloads");
        let opts = AddOptions {
            download_dir: download_dir.clone(),
            only_files: Some(vec![preview.files[1].index]),
            paused: true,
        };
        let id = engine
            .add_resolved(&preview.info_hash, &opts)
            .await
            .unwrap();
        let t = wait_for(&engine, |t| t.id == id && t.state == TorrentState::Paused).await;
        // librqbit counts the whole pieces the selected file touches.
        assert!(
            (100_000..200_000).contains(&t.total_bytes),
            "{}",
            t.total_bytes
        );

        let details = engine.details(id).unwrap();
        assert_eq!(details.output_folder, download_dir.join("pack"));
        let included: Vec<_> = details.files.iter().map(|f| f.included).collect();
        assert_eq!(included, [false, true]);
        engine.set_files(id, &[0, 1]).await.unwrap();
        assert!(engine.details(id).unwrap().files.iter().all(|f| f.included));
        assert!(engine.set_files(id, &[]).await.is_err());
        assert_eq!(
            engine.file_path(id, 1).unwrap(),
            download_dir.join("pack").join(&preview.files[1].path[0])
        );

        // The metadata is consumed once added.
        assert!(
            engine
                .add_resolved(&preview.info_hash, &opts)
                .await
                .is_err()
        );
        let again = engine.resolve_torrent_file(&torrent).await.unwrap();
        assert!(again.already_added);
        engine.discard_resolved(&again.info_hash);

        engine.session.stop().await;
    }
}
