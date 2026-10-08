mod engine;

use engine::{Engine, EngineStatus};
use tauri::Manager;

#[tauri::command]
fn engine_status(engine: tauri::State<'_, Engine>) -> EngineStatus {
    engine.status()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let engine = tauri::async_runtime::block_on(Engine::start(app.handle()))?;
            app.manage(engine);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![engine_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
