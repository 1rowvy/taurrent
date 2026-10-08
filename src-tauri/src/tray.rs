use std::sync::atomic::{AtomicBool, Ordering};

use serde::Deserialize;
use tauri::{
    AppHandle, Manager, Wry,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
};

use crate::engine::Engine;

const TRAY_ID: &str = "main";

/// Menu labels in the UI language, sent by the frontend (which owns i18n).
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayLabels {
    pub show: String,
    pub pause_all: String,
    pub resume_all: String,
    pub quit: String,
}

impl Default for TrayLabels {
    fn default() -> Self {
        Self {
            show: "Show / hide Taurrent".into(),
            pause_all: "Pause all".into(),
            resume_all: "Resume all".into(),
            quit: "Quit".into(),
        }
    }
}

/// Whether the tray icon was created; without one, closing the window must
/// quit, or the app would be left running with no way back.
#[derive(Default)]
pub struct TrayState {
    available: AtomicBool,
}

impl TrayState {
    pub fn available(&self) -> bool {
        self.available.load(Ordering::Relaxed)
    }
}

pub fn create(app: &AppHandle) -> tauri::Result<TrayIcon> {
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Taurrent")
        .menu(&menu(app, &TrayLabels::default())?)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => toggle_window(app),
            "pause_all" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move { app.state::<Engine>().pause_all().await });
            }
            "resume_all" => {
                let app = app.clone();
                tauri::async_runtime::spawn(
                    async move { app.state::<Engine>().resume_all().await },
                );
            }
            "quit" => quit(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    let tray = builder.build(app)?;
    app.state::<TrayState>()
        .available
        .store(true, Ordering::Relaxed);
    Ok(tray)
}

pub fn set_labels(app: &AppHandle, labels: &TrayLabels) -> tauri::Result<()> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_menu(Some(menu(app, labels)?))?;
    }
    Ok(())
}

fn menu(app: &AppHandle, labels: &TrayLabels) -> tauri::Result<Menu<Wry>> {
    Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "show", &labels.show, true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "pause_all", &labels.pause_all, true, None::<&str>)?,
            &MenuItem::with_id(app, "resume_all", &labels.resume_all, true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "quit", &labels.quit, true, None::<&str>)?,
        ],
    )
}

pub fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if window.is_visible().unwrap_or(false) && !window.is_minimized().unwrap_or(false) {
        let _ = window.hide();
    } else {
        show_window(app);
    }
}

/// Stops the session cleanly, so fastresume data is current, then exits.
pub fn quit(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        app.state::<Engine>().stop().await;
        app.exit(0);
    });
}
