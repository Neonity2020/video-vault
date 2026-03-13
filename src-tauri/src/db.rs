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
    pub author_url: String,
    pub topic: String,
    pub description: String,
    pub description_en: String,
    pub duration: String,
    pub thumbnail: String,
    pub cover_path: Option<String>, // Local path to downloaded cover image
    pub ai_summary: String,
    pub ai_summary_en: String,
    pub transcript: String,
    pub timestamps: String,
    pub note_path: Option<String>,
    pub rating: i32,
    pub is_watched: i32,
    pub deleted_at: Option<String>, // For recycle bin functionality
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoFilter {
    pub search: Option<String>,
    pub author: Option<String>,
    pub topic: Option<String>,
    pub video_type: Option<String>,
    pub is_watched: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub include_deleted: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub api_provider: String, // "openai" | "gemini"
    pub api_endpoint: String,
    pub api_key: String,
    pub model: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarEvent {
    pub id: Option<i64>,
    pub title: String,
    pub description: String,
    pub event_date: String,  // 格式: "YYYY-MM-DD"
    pub event_time: String,  // 格式: "HH:MM"
    pub duration_minutes: Option<i32>,
    pub repeat_type: String, // "none", "daily", "weekly", "monthly"
    pub repeat_until: Option<String>, // 格式: "YYYY-MM-DD"
    pub reminder_minutes: Option<i64>,
    pub video_id: Option<i64>,
    pub completed: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
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
            author_url TEXT DEFAULT '',
            topic TEXT NOT NULL DEFAULT 'General',
            description TEXT DEFAULT '',
            description_en TEXT DEFAULT '',
            duration TEXT DEFAULT '',
            thumbnail TEXT DEFAULT '',
            ai_summary TEXT DEFAULT '',
            ai_summary_en TEXT DEFAULT '',
            transcript TEXT DEFAULT '',
            timestamps TEXT DEFAULT '',
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

    // Migration: add author_url column for existing databases
    let _ = conn.execute(
        "ALTER TABLE videos ADD COLUMN author_url TEXT DEFAULT ''",
        [],
    );
    // Migration: add ai_summary_en column for existing databases
    let _ = conn.execute(
        "ALTER TABLE videos ADD COLUMN ai_summary_en TEXT DEFAULT ''",
        [],
    );
    // Migration: add description_en column for existing databases
    let _ = conn.execute(
        "ALTER TABLE videos ADD COLUMN description_en TEXT DEFAULT ''",
        [],
    );
    // Migration: add transcript column for existing databases
    let _ = conn.execute(
        "ALTER TABLE videos ADD COLUMN transcript TEXT DEFAULT ''",
        [],
    );
    // Migration: add timestamps column for existing databases
    let _ = conn.execute(
        "ALTER TABLE videos ADD COLUMN timestamps TEXT DEFAULT ''",
        [],
    );
    // Migration: add cover_path column for existing databases
    let _ = conn.execute(
        "ALTER TABLE videos ADD COLUMN cover_path TEXT",
        [],
    );
    // Migration: add deleted_at column for existing databases (recycle bin)
    let _ = conn.execute(
        "ALTER TABLE videos ADD COLUMN deleted_at TEXT",
        [],
    );
    // Migration: add note_path column for Obsidian notes
    let _ = conn.execute(
        "ALTER TABLE videos ADD COLUMN note_path TEXT",
        [],
    );

    // Create calendar_events table
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            event_date TEXT NOT NULL,
            event_time TEXT DEFAULT '',
            duration_minutes INTEGER DEFAULT NULL,
            repeat_type TEXT DEFAULT 'none',
            repeat_until TEXT DEFAULT NULL,
            reminder_minutes INTEGER DEFAULT NULL,
            video_id INTEGER DEFAULT NULL,
            completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_video ON calendar_events(video_id);
        ",
    )
    .expect("Failed to create calendar_events table");

    conn
}
