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
            commands::restore_video,
            commands::permanent_delete_video,
            commands::empty_recycle_bin,
            commands::get_videos,
            commands::get_total_video_count,
            commands::get_video_type_counts,
            commands::get_video,
            commands::get_authors,
            commands::get_topics,
            commands::get_settings,
            commands::save_settings,
            commands::summarize_video,
            commands::translate_summary,
            commands::toggle_watched,
            commands::get_all_tags,
            commands::set_video_tags,
            commands::get_video_tags,
            commands::update_video_transcript,
            commands::update_video_timestamps,
            commands::translate_timestamps,
            commands::generate_ai_tags,
            commands::add_calendar_event,
            commands::get_calendar_events,
            commands::get_events_for_date,
            commands::update_calendar_event,
            commands::delete_calendar_event,
            commands::is_video_in_calendar,
            commands::get_video_calendar_event,
            commands::check_reminders,
            commands::generate_obsidian_note,
            commands::open_notes_dir,
            metadata::fetch_video_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
