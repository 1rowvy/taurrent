mod engine;
mod open_requests;
mod settings;
mod tray;

use std::{path::PathBuf, time::Duration};

use engine::{
    AddOptions, Engine, EngineOptions, EngineStatus, Snapshot, TorrentDetails, TorrentPreview,
};
use open_requests::{OpenRequest, OpenRequests};
use settings::{ConnectionSettings, Settings, SettingsStore, SpeedLimits};
use tauri::{Emitter, Manager};
use tauri_plugin_opener::OpenerExt;
use tray::{TrayLabels, TrayState};

fn engine_options(settings: &Settings) -> EngineOptions {
    let c = &settings.connection;
    EngineOptions {
        listen_port: Some(c.listen_port),
        upnp: c.upnp,
        dht: c.dht,
        peer_limit: (c.peer_limit > 0).then_some(c.peer_limit as usize),
        download_limit: settings.limits.download.saturating_mul(1024),
        upload_limit: settings.limits.upload.saturating_mul(1024),
    }
}

#[tauri::command]
fn engine_status(engine: tauri::State<'_, Engine>) -> EngineStatus {
    engine.status()
}

#[tauri::command]
fn list_torrents(engine: tauri::State<'_, Engine>) -> Snapshot {
    engine.snapshot()
}

#[tauri::command]
async fn add_magnet(
    engine: tauri::State<'_, Engine>,
    settings: tauri::State<'_, SettingsStore>,
    url: String,
) -> Result<usize, String> {
    engine
        .add_magnet(&url, &settings.get().download_dir)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
async fn add_torrent_file(
    engine: tauri::State<'_, Engine>,
    settings: tauri::State<'_, SettingsStore>,
    path: PathBuf,
) -> Result<usize, String> {
    engine
        .add_torrent_file(&path, &settings.get().download_dir)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
async fn resolve_magnet(
    engine: tauri::State<'_, Engine>,
    url: String,
) -> Result<TorrentPreview, String> {
    engine
        .resolve_magnet(&url)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
async fn resolve_torrent_file(
    engine: tauri::State<'_, Engine>,
    path: PathBuf,
) -> Result<TorrentPreview, String> {
    engine
        .resolve_torrent_file(&path)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
async fn add_resolved(
    engine: tauri::State<'_, Engine>,
    info_hash: String,
    options: AddOptions,
) -> Result<usize, String> {
    engine
        .add_resolved(&info_hash, &options)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
fn discard_resolved(engine: tauri::State<'_, Engine>, info_hash: String) {
    engine.discard_resolved(&info_hash);
}

#[tauri::command]
async fn pause(engine: tauri::State<'_, Engine>, id: usize) -> Result<(), String> {
    engine.pause(id).await.map_err(|e| format!("{e:#}"))
}

#[tauri::command]
async fn resume(engine: tauri::State<'_, Engine>, id: usize) -> Result<(), String> {
    engine.resume(id).await.map_err(|e| format!("{e:#}"))
}

#[tauri::command]
async fn remove(
    engine: tauri::State<'_, Engine>,
    id: usize,
    delete_files: bool,
) -> Result<(), String> {
    engine
        .remove(id, delete_files)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
fn torrent_details(engine: tauri::State<'_, Engine>, id: usize) -> Result<TorrentDetails, String> {
    engine.details(id).map_err(|e| format!("{e:#}"))
}

#[tauri::command]
async fn set_files(
    engine: tauri::State<'_, Engine>,
    id: usize,
    files: Vec<usize>,
) -> Result<(), String> {
    engine
        .set_files(id, &files)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
fn open_folder(
    app: tauri::AppHandle,
    engine: tauri::State<'_, Engine>,
    id: usize,
) -> Result<(), String> {
    let folder = engine.output_folder(id).map_err(|e| format!("{e:#}"))?;
    app.opener()
        .open_path(folder.to_string_lossy(), None::<&str>)
        .map_err(|e| format!("opening {}: {e}", folder.display()))
}

#[tauri::command]
fn open_file(
    app: tauri::AppHandle,
    engine: tauri::State<'_, Engine>,
    id: usize,
    index: usize,
) -> Result<(), String> {
    let path = engine.file_path(id, index).map_err(|e| format!("{e:#}"))?;
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|e| format!("opening {}: {e}", path.display()))
}

#[tauri::command]
fn reveal_file(
    app: tauri::AppHandle,
    engine: tauri::State<'_, Engine>,
    id: usize,
    index: usize,
) -> Result<(), String> {
    let path = engine.file_path(id, index).map_err(|e| format!("{e:#}"))?;
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| format!("showing {}: {e}", path.display()))
}

#[tauri::command]
fn take_open_requests(requests: tauri::State<'_, OpenRequests>) -> Vec<OpenRequest> {
    requests.take()
}

#[tauri::command]
fn set_tray_labels(app: tauri::AppHandle, labels: TrayLabels) -> Result<(), String> {
    tray::set_labels(&app, &labels).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings(settings: tauri::State<'_, SettingsStore>) -> Settings {
    settings.get()
}

#[tauri::command]
fn set_download_dir(
    settings: tauri::State<'_, SettingsStore>,
    path: PathBuf,
) -> Result<Settings, String> {
    settings
        .set_download_dir(&path)
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
fn set_notifications(
    settings: tauri::State<'_, SettingsStore>,
    enabled: bool,
) -> Result<Settings, String> {
    settings
        .set_notifications(enabled)
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
fn set_auto_update(
    settings: tauri::State<'_, SettingsStore>,
    enabled: bool,
) -> Result<Settings, String> {
    settings
        .set_auto_update(enabled)
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
fn set_language(
    settings: tauri::State<'_, SettingsStore>,
    language: Option<String>,
) -> Result<Settings, String> {
    settings
        .set_language(language)
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
fn set_close_to_tray(
    settings: tauri::State<'_, SettingsStore>,
    enabled: bool,
) -> Result<Settings, String> {
    settings
        .set_close_to_tray(enabled)
        .map_err(|e| format!("{e:#}"))
}

/// Takes effect on the next start (see `engine_options`).
#[tauri::command]
fn set_connection(
    settings: tauri::State<'_, SettingsStore>,
    connection: ConnectionSettings,
) -> Result<Settings, String> {
    settings
        .set_connection(connection)
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
fn set_limits(
    engine: tauri::State<'_, Engine>,
    settings: tauri::State<'_, SettingsStore>,
    limits: SpeedLimits,
) -> Result<Settings, String> {
    let next = settings.set_limits(limits).map_err(|e| format!("{e:#}"))?;
    let options = engine_options(&next);
    engine.set_limits(options.download_limit, options.upload_limit);
    Ok(next)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Must be registered first: a second launch (e.g. opening a magnet link)
    // hands its arguments to this instance and exits.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            open_requests::push_args(app, args.into_iter().skip(1));
            tray::show_window(app);
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(OpenRequests::default())
        .manage(TrayState::default())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            // Installers register the `magnet:` scheme; an AppImage has no
            // installer, so it registers itself.
            #[cfg(target_os = "linux")]
            if std::env::var_os("APPIMAGE").is_some() {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Err(e) = app.deep_link().register_all() {
                    eprintln!("registering the magnet: handler failed: {e}");
                }
            }

            let settings = SettingsStore::load(app.handle())?;
            let data_dir = app.path().app_data_dir()?;
            let current = settings.get();
            let engine = tauri::async_runtime::block_on(Engine::start(
                &data_dir,
                current.download_dir.clone(),
                &engine_options(&current),
            ))?;
            app.manage(settings);
            app.manage(engine);

            // Linux needs a StatusNotifier host (libayatana-appindicator);
            // without a tray the app just quits on close.
            if let Err(e) = tray::create(app.handle()) {
                eprintln!("creating the tray icon failed: {e}");
            }

            open_requests::push_args(app.handle(), std::env::args().skip(1));

            let app = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(Duration::from_secs(1));
                loop {
                    interval.tick().await;
                    let (snapshot, completed) = app.state::<Engine>().tick();
                    let _ = app.emit("torrents:update", snapshot);
                    for name in completed {
                        let _ = app.emit("torrent:completed", name);
                    }
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                if app.state::<TrayState>().available()
                    && app.state::<SettingsStore>().get().close_to_tray
                {
                    api.prevent_close();
                    let _ = window.hide();
                } else {
                    api.prevent_close();
                    tray::quit(app);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            engine_status,
            list_torrents,
            add_magnet,
            add_torrent_file,
            resolve_magnet,
            resolve_torrent_file,
            add_resolved,
            discard_resolved,
            pause,
            resume,
            remove,
            torrent_details,
            set_files,
            open_folder,
            open_file,
            reveal_file,
            take_open_requests,
            set_tray_labels,
            get_settings,
            set_download_dir,
            set_notifications,
            set_auto_update,
            set_language,
            set_close_to_tray,
            set_connection,
            set_limits
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
