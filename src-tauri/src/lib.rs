mod commands;
mod db;
mod metadata;

use db::{init_db, DbState};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            let conn = init_db(&app_data_dir);
            app.manage(DbState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_video,
            commands::update_video,
            commands::delete_video,
            commands::get_videos,
            commands::get_video,
            commands::get_authors,
            commands::get_topics,
            commands::get_settings,
            commands::save_settings,
            commands::summarize_video,
            commands::translate_summary,
            commands::toggle_watched,
            metadata::fetch_video_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
