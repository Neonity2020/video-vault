use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Video {
    pub id: Option<i64>,
    pub title: String,
    pub video_type: String,
    pub file_path: Option<String>,
    pub url: Option<String>,
    pub author: String,
    pub topic: String,
    pub description: String,
    pub duration: String,
    pub thumbnail: String,
    pub ai_summary: String,
    pub rating: i32,
    pub is_watched: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoFilter {
    pub search: Option<String>,
    pub author: Option<String>,
    pub topic: Option<String>,
    pub video_type: Option<String>,
    pub is_watched: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub api_provider: String, // "openai" | "gemini"
    pub api_endpoint: String,
    pub api_key: String,
    pub model: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            api_provider: "gemini".to_string(),
            api_endpoint: "https://generativelanguage.googleapis.com/v1beta".to_string(),
            api_key: String::new(),
            model: "gemini-2.5-flash".to_string(),
        }
    }
}

pub struct DbState {
    pub db: Mutex<Connection>,
}

pub fn init_db(app_data_dir: &std::path::Path) -> Connection {
    std::fs::create_dir_all(app_data_dir).expect("Failed to create app data dir");
    let db_path = app_data_dir.join("video_vault.db");
    let conn = Connection::open(db_path).expect("Failed to open database");

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            video_type TEXT NOT NULL DEFAULT 'local',
            file_path TEXT,
            url TEXT,
            author TEXT NOT NULL DEFAULT 'Unknown',
            topic TEXT NOT NULL DEFAULT 'General',
            description TEXT DEFAULT '',
            duration TEXT DEFAULT '',
            thumbnail TEXT DEFAULT '',
            ai_summary TEXT DEFAULT '',
            rating INTEGER DEFAULT 0,
            is_watched INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS video_tags (
            video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
            tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (video_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ",
    )
    .expect("Failed to initialize database");

    conn
}
