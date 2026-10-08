mod engine;
mod settings;

use std::path::PathBuf;

use engine::{Engine, EngineStatus};
use settings::{Settings, SettingsStore};
use tauri::Manager;

#[tauri::command]
fn engine_status(engine: tauri::State<'_, Engine>) -> EngineStatus {
    engine.status()
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
fn set_language(
    settings: tauri::State<'_, SettingsStore>,
    language: Option<String>,
) -> Result<Settings, String> {
    settings
        .set_language(language)
        .map_err(|e| format!("{e:#}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let settings = SettingsStore::load(app.handle())?;
            let engine = tauri::async_runtime::block_on(Engine::start(
                app.handle(),
                settings.get().download_dir,
            ))?;
            app.manage(settings);
            app.manage(engine);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            engine_status,
            get_settings,
            set_download_dir,
            set_notifications,
            set_language
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
