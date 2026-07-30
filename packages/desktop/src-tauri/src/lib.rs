use std::sync::Mutex;
use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct SidecarHandle(Mutex<Option<CommandChild>>);

/// In `tauri dev`, `beforeDevCommand` already runs the real backend via `tsx watch`
/// (see root package.json's `dev` script), so the sidecar only needs to run in a
/// packaged production build.
fn spawn_backend(app: &tauri::AppHandle) {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("resolve app data dir");
    std::fs::create_dir_all(&data_dir).expect("create app data dir");
    let db_path = data_dir.join("scheduling.sqlite");

    let mut command = app
        .shell()
        .sidecar("server")
        .expect("locate server sidecar")
        .env("SCHEDULING_DB_PATH", db_path.to_string_lossy().to_string())
        .env("PORT", "4000");

    // Document Intelligence calls the real Claude API, and the market ticker calls the
    // real Massive API — forward the host's keys if set. The bundled sidecar has no .env
    // file of its own (see index.ts's dev-only .env loader).
    if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
        command = command.env("ANTHROPIC_API_KEY", api_key);
    }
    if let Ok(api_key) = std::env::var("MASSIVE_API_KEY") {
        command = command.env("MASSIVE_API_KEY", api_key);
    }

    let (_rx, child) = command.spawn().expect("spawn server sidecar");

    app.state::<SidecarHandle>()
        .0
        .lock()
        .expect("lock sidecar handle")
        .replace(child);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarHandle(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            } else {
                spawn_backend(app.handle());
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(child) = app.state::<SidecarHandle>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        });
}
