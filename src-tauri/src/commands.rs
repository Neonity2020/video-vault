use crate::db::{AppSettings, CalendarEvent, DbState, Tag, Video, VideoFilter};
use chrono::Datelike;
use std::fs;
use tauri::{Manager, State};

fn row_to_video(row: &rusqlite::Row) -> rusqlite::Result<Video> {
    Ok(Video {
        id: row.get(0)?,
        title: row.get(1)?,
        video_type: row.get(2)?,
        file_path: row.get(3)?,
        url: row.get(4)?,
        author: row.get(5)?,
        author_url: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
        topic: row.get(7)?,
        description: row.get(8)?,
        description_en: row.get::<_, Option<String>>(9)?.unwrap_or_default(),
        duration: row.get(10)?,
        thumbnail: row.get(11)?,
        cover_path: row.get(12)?,
        ai_summary: row.get(13)?,
        ai_summary_en: row.get::<_, Option<String>>(14)?.unwrap_or_default(),
        transcript: row.get::<_, Option<String>>(15)?.unwrap_or_default(),
        timestamps: row.get::<_, Option<String>>(16)?.unwrap_or_default(),
        note_path: row.get(17)?,
        rating: row.get(18)?,
        is_watched: row.get(19)?,
        deleted_at: row.get(20)?,
        created_at: row.get(21)?,
        updated_at: row.get(22)?,
        tags: Vec::new(),
    })
}

/// Helper: get all tag names for a video
fn get_tags_for_video(db: &rusqlite::Connection, video_id: i64) -> Vec<String> {
    let mut stmt = db
        .prepare("SELECT t.name FROM tags t JOIN video_tags vt ON t.id = vt.tag_id WHERE vt.video_id = ?1 ORDER BY t.name")
        .unwrap();
    stmt.query_map(rusqlite::params![video_id], |row| row.get::<_, String>(0))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect()
}

/// Helper: set tags for a video (clear old, insert new, auto-create tags)
fn set_tags_for_video(
    db: &rusqlite::Connection,
    video_id: i64,
    tag_names: &[String],
) -> Result<(), String> {
    db.execute(
        "DELETE FROM video_tags WHERE video_id = ?1",
        rusqlite::params![video_id],
    )
    .map_err(|e| e.to_string())?;
    for name in tag_names {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Insert tag if it doesn't exist
        db.execute(
            "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
            rusqlite::params![trimmed],
        )
        .map_err(|e| e.to_string())?;
        // Get tag id
        let tag_id: i64 = db
            .query_row(
                "SELECT id FROM tags WHERE name = ?1",
                rusqlite::params![trimmed],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        // Link
        db.execute(
            "INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![video_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Download cover image from URL and save to local storage
fn download_cover_image(
    app: &tauri::AppHandle,
    thumbnail_url: &str,
    video_id: Option<i64>,
) -> Result<String, String> {
    // Create covers directory in app data dir
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let covers_dir = app_data_dir.join("covers");
    fs::create_dir_all(&covers_dir)
        .map_err(|e| format!("Failed to create covers directory: {}", e))?;

    // Generate filename from video ID or timestamp
    let filename = if let Some(id) = video_id {
        format!("cover_{}.jpg", id)
    } else {
        format!("cover_{}.jpg", chrono::Utc::now().timestamp())
    };
    let cover_path = covers_dir.join(&filename);

    // Download image
    let response = reqwest::blocking::get(thumbnail_url)
        .map_err(|e| format!("Failed to fetch thumbnail: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let image_data = response
        .bytes()
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    // Save to file
    fs::write(&cover_path, &image_data)
        .map_err(|e| format!("Failed to write cover image: {}", e))?;

    // Return relative path for storage in database
    cover_path
        .file_name()
        .and_then(|n: &std::ffi::OsStr| n.to_str())
        .map(|s: &str| s.to_string())
        .ok_or_else(|| "Failed to get cover filename".to_string())
}

/// Delete cover image file
fn delete_cover_image(app: &tauri::AppHandle, cover_path: &Option<String>) -> Result<(), String> {
    if let Some(path) = cover_path {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?;
        let full_path = app_data_dir.join("covers").join(path);

        if full_path.exists() {
            fs::remove_file(&full_path)
                .map_err(|e| format!("Failed to delete cover image: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn add_video(
    state: State<DbState>,
    app: tauri::AppHandle,
    video: Video,
) -> Result<Video, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Download cover image if thumbnail URL is provided
    let cover_path = if !video.thumbnail.is_empty() {
        match download_cover_image(&app, &video.thumbnail, None) {
            Ok(path) => Some(path),
            Err(e) => {
                eprintln!("Failed to download cover image: {}", e);
                None
            }
        }
    } else {
        None
    };

    db.execute(
        "INSERT INTO videos (title, video_type, file_path, url, author, author_url, topic, description, description_en, duration, thumbnail, cover_path, ai_summary, ai_summary_en, transcript, timestamps, note_path, rating, is_watched) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
        rusqlite::params![
            video.title, video.video_type, video.file_path, video.url,
            video.author, video.author_url, video.topic, video.description, video.description_en, video.duration,
            video.thumbnail, cover_path, video.ai_summary, video.ai_summary_en, video.transcript, video.timestamps, video.note_path, video.rating, video.is_watched,
        ],
    ).map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();
    set_tags_for_video(&db, id, &video.tags)?;
    let mut new_video = video;
    new_video.id = Some(id);
    new_video.cover_path = cover_path;
    new_video.tags = get_tags_for_video(&db, id);
    Ok(new_video)
}

#[tauri::command]
pub fn update_video(
    state: State<DbState>,
    app: tauri::AppHandle,
    video: Video,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Download new cover image if thumbnail changed
    let cover_path = if !video.thumbnail.is_empty() {
        match download_cover_image(&app, &video.thumbnail, video.id) {
            Ok(path) => Some(path),
            Err(e) => {
                eprintln!("Failed to download cover image: {}", e);
                video.cover_path // Keep existing cover if download fails
            }
        }
    } else {
        None
    };

    db.execute(
        "UPDATE videos SET title=?1, video_type=?2, file_path=?3, url=?4, author=?5, author_url=?6, topic=?7, description=?8, description_en=?9, duration=?10, thumbnail=?11, cover_path=?12, ai_summary=?13, ai_summary_en=?14, transcript=?15, timestamps=?16, note_path=?17, rating=?18, is_watched=?19, updated_at=CURRENT_TIMESTAMP WHERE id=?20",
        rusqlite::params![
            video.title, video.video_type, video.file_path, video.url,
            video.author, video.author_url, video.topic, video.description, video.description_en, video.duration,
            video.thumbnail, cover_path, video.ai_summary, video.ai_summary_en, video.transcript, video.timestamps, video.note_path, video.rating, video.is_watched, video.id,
        ],
    ).map_err(|e| e.to_string())?;
    if let Some(id) = video.id {
        set_tags_for_video(&db, id, &video.tags)?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_video(state: State<DbState>, app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Get video info to delete cover image
    let cover_path: Option<String> = db
        .query_row(
            "SELECT cover_path FROM videos WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    // Soft delete: set deleted_at timestamp
    db.execute(
        "UPDATE videos SET deleted_at = datetime('now') WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;

    // Delete cover image file
    delete_cover_image(&app, &cover_path)?;

    Ok(())
}

#[tauri::command]
pub fn restore_video(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE videos SET deleted_at = NULL WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| format!("恢复视频失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn permanent_delete_video(
    state: State<DbState>,
    app: tauri::AppHandle,
    id: i64,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Get video info to delete cover image
    let (cover_path, note_path): (Option<String>, Option<String>) = db
        .query_row(
            "SELECT cover_path, note_path FROM videos WHERE id = ?1",
            rusqlite::params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or((None, None));

    // Permanently delete from database
    db.execute("DELETE FROM videos WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("永久删除视频失败: {}", e))?;

    // Delete cover image file
    delete_cover_image(&app, &cover_path)?;

    // Delete note folder
    if let Some(path) = note_path {
        if let Ok(app_data_dir) = app.path().app_data_dir() {
            let notes_dir = app_data_dir.join("notes");
            let full_note_path = notes_dir.join(&path);
            if let Some(folder_path) = full_note_path.parent() {
                let _ = fs::remove_dir_all(folder_path);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn empty_recycle_bin(state: State<DbState>, app: tauri::AppHandle) -> Result<usize, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Get all cover paths from deleted videos
    let mut stmt = db
        .prepare("SELECT cover_path, note_path FROM videos WHERE deleted_at IS NOT NULL")
        .map_err(|e| format!("查询回收站失败: {}", e))?;

    let paths: Vec<(Option<String>, Option<String>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("读取路径失败: {}", e))?
        .collect::<Result<_, _>>()
        .map_err(|e| format!("处理路径失败: {}", e))?;

    // Delete all cover images and note folders
    for (cover_path, note_path) in paths {
        let _ = delete_cover_image(&app, &cover_path);

        if let Some(path) = note_path {
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                let notes_dir = app_data_dir.join("notes");
                let full_note_path = notes_dir.join(&path);
                if let Some(folder_path) = full_note_path.parent() {
                    let _ = fs::remove_dir_all(folder_path);
                }
            }
        }
    }

    // Permanently delete all videos with deleted_at set
    let deleted_count = db
        .execute("DELETE FROM videos WHERE deleted_at IS NOT NULL", [])
        .map_err(|e| format!("清空回收站失败: {}", e))?;

    Ok(deleted_count)
}

#[tauri::command]
pub fn get_videos(state: State<DbState>, filter: VideoFilter) -> Result<Vec<Video>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut conditions: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref search) = filter.search {
        if !search.is_empty() {
            conditions.push(
                "(v.title LIKE ?1 OR v.description LIKE ?1 OR v.author LIKE ?1 OR v.topic LIKE ?1)"
                    .to_string(),
            );
            params.push(Box::new(format!("%{}%", search)));
        }
    }
    if let Some(ref author) = filter.author {
        if !author.is_empty() {
            let idx = params.len() + 1;
            conditions.push(format!("v.author = ?{}", idx));
            params.push(Box::new(author.clone()));
        }
    }
    if let Some(ref topic) = filter.topic {
        if !topic.is_empty() {
            let idx = params.len() + 1;
            conditions.push(format!("v.topic = ?{}", idx));
            params.push(Box::new(topic.clone()));
        }
    }
    if let Some(ref video_type) = filter.video_type {
        if !video_type.is_empty() {
            let idx = params.len() + 1;
            conditions.push(format!("v.video_type = ?{}", idx));
            params.push(Box::new(video_type.clone()));
        }
    }
    if let Some(is_watched) = filter.is_watched {
        let idx = params.len() + 1;
        conditions.push(format!("v.is_watched = ?{}", idx));
        params.push(Box::new(is_watched));
    }

    // Handle deleted videos filter
    if filter.include_deleted.unwrap_or(false) {
        // Show only deleted videos (recycle bin)
        conditions.push("v.deleted_at IS NOT NULL".to_string());
    } else {
        // Hide deleted videos by default
        conditions.push("v.deleted_at IS NULL".to_string());
    }

    // Tag filtering: video must have ALL specified tags
    let mut join_clause = String::new();
    if let Some(ref tags) = filter.tags {
        let tags: Vec<&str> = tags
            .iter()
            .map(|s| s.as_str())
            .filter(|s| !s.is_empty())
            .collect();
        if !tags.is_empty() {
            for (i, tag) in tags.iter().enumerate() {
                let alias = format!("vt{}", i);
                let tag_alias = format!("t{}", i);
                let idx = params.len() + 1;
                join_clause.push_str(&format!(
                    " JOIN video_tags {alias} ON v.id = {alias}.video_id JOIN tags {tag_alias} ON {alias}.tag_id = {tag_alias}.id AND {tag_alias}.name = ?{idx}"
                ));
                params.push(Box::new(tag.to_string()));
            }
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };
    let query = format!(
        "SELECT v.id, v.title, v.video_type, v.file_path, v.url, v.author, v.author_url, v.topic, v.description, v.description_en, v.duration, v.thumbnail, v.cover_path, v.ai_summary, v.ai_summary_en, v.transcript, v.timestamps, v.note_path, v.rating, v.is_watched, v.deleted_at, v.created_at, v.updated_at FROM videos v{}{} ORDER BY v.updated_at DESC",
        join_clause, where_clause
    );
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let mut videos: Vec<Video> = stmt
        .query_map(param_refs.as_slice(), row_to_video)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    // Attach tags to each video
    for video in &mut videos {
        if let Some(id) = video.id {
            video.tags = get_tags_for_video(&db, id);
        }
    }
    Ok(videos)
}

#[tauri::command]
pub fn get_total_video_count(state: State<DbState>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT COUNT(*) FROM videos")
        .map_err(|e| e.to_string())?;
    let count: i64 = stmt
        .query_row([], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
pub fn get_video_type_counts(
    state: State<DbState>,
) -> Result<std::collections::HashMap<String, i64>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT video_type, COUNT(*) FROM videos GROUP BY video_type")
        .map_err(|e| e.to_string())?;
    let mut counts = std::collections::HashMap::new();
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        counts.insert(row.0, row.1);
    }
    Ok(counts)
}

#[tauri::command]
pub fn get_video(state: State<DbState>, id: i64) -> Result<Option<Video>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, description_en, duration, thumbnail, cover_path, ai_summary, ai_summary_en, transcript, timestamps, note_path, rating, is_watched, deleted_at, created_at, updated_at FROM videos WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(rusqlite::params![id], row_to_video)
        .map_err(|e| e.to_string())?;
    match rows.next() {
        Some(Ok(mut video)) => {
            video.tags = get_tags_for_video(&db, id);
            Ok(Some(video))
        }
        Some(Err(e)) => Err(e.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn get_authors(state: State<DbState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT DISTINCT author FROM videos ORDER BY author")
        .map_err(|e| e.to_string())?;
    let authors = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(authors)
}

#[tauri::command]
pub fn get_topics(state: State<DbState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT DISTINCT topic FROM videos ORDER BY topic")
        .map_err(|e| e.to_string())?;
    let topics = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(topics)
}

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> Result<AppSettings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let mut settings = AppSettings::default();
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    for (key, value) in rows.flatten() {
        match key.as_str() {
            "api_provider" => settings.api_provider = value,
            "api_endpoint" => settings.api_endpoint = value,
            "api_key" => settings.api_key = value,
            "model" => settings.model = value,
            _ => {}
        }
    }
    Ok(settings)
}

#[tauri::command]
pub fn save_settings(state: State<DbState>, settings: AppSettings) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let pairs = vec![
        ("api_provider", settings.api_provider),
        ("api_endpoint", settings.api_endpoint),
        ("api_key", settings.api_key),
        ("model", settings.model),
    ];
    for (key, value) in pairs {
        db.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params![key, value],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn summarize_video(
    state: State<'_, DbState>,
    video_id: i64,
    custom_prompt: Option<String>,
) -> Result<String, String> {
    let video = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, description_en, duration, thumbnail, cover_path, ai_summary, ai_summary_en, transcript, timestamps, note_path, rating, is_watched, deleted_at, created_at, updated_at FROM videos WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(rusqlite::params![video_id], row_to_video)
            .map_err(|e| e.to_string())?;
        rows.next()
            .ok_or("Video not found".to_string())?
            .map_err(|e| e.to_string())?
    };

    let settings = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;
        let mut s = AppSettings::default();
        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        for (key, value) in rows.flatten() {
            match key.as_str() {
                "api_provider" => s.api_provider = value,
                "api_endpoint" => s.api_endpoint = value,
                "api_key" => s.api_key = value,
                "model" => s.model = value,
                _ => {}
            }
        }
        s
    };

    if settings.api_key.is_empty() {
        return Err("请先在设置中配置 API Key".to_string());
    }

    // Remove automated transcript fetching completely based on user request.
    // The transcript will be retrieved directly from the video record in the datastore.
    let transcript = video.transcript.as_str();
    let transcript = if transcript.is_empty() {
        None
    } else {
        Some(transcript.to_string())
    };

    let prompt = custom_prompt.unwrap_or_else(|| {
        if let Some(ref transcript_text) = transcript {
            // Truncate very long transcripts to avoid exceeding API limits
            let max_len = 30000;
            let truncated = if transcript_text.len() > max_len {
                format!("{}...\n\n[Transcript truncated]", &transcript_text[..max_len])
            } else {
                transcript_text.clone()
            };
            format!(
                "Please provide a comprehensive summary of the following video tutorial based on its transcript. \
                Include key topics covered, main takeaways, and learning points. \
                Write the summary in the same language as the transcript.\n\n\
                Title: {}\nAuthor: {}\nTopic: {}\n\n\
                Transcript:\n{}",
                video.title, video.author, video.topic, truncated
            )
        } else {
            format!(
                "Please provide a comprehensive summary of the following video tutorial. \
                Include key topics covered, main takeaways, and learning points.\n\n\
                Title: {}\nAuthor: {}\nTopic: {}\nDescription: {}\n\n\
                Please write the summary in the same language as the title and description.",
                video.title, video.author, video.topic, video.description
            )
        }
    });

    let system_msg = "You are a helpful assistant that summarizes video tutorials. Provide clear, structured summaries with key learning points.";

    let summary = if settings.api_provider == "gemini" {
        call_gemini_api(&settings, system_msg, &prompt).await?
    } else {
        call_openai_api(&settings, system_msg, &prompt).await?
    };

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        // Save both summary and transcript (if fetched)
        let transcript_text = transcript.as_deref().unwrap_or("");
        db.execute(
            "UPDATE videos SET ai_summary = ?1, ai_summary_en = '', transcript = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
            rusqlite::params![summary, transcript_text, video_id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(summary)
}

#[tauri::command]
pub async fn translate_summary(state: State<'_, DbState>, video_id: i64) -> Result<String, String> {
    let video = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, description_en, duration, thumbnail, cover_path, ai_summary, ai_summary_en, transcript, timestamps, note_path, rating, is_watched, deleted_at, created_at, updated_at FROM videos WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(rusqlite::params![video_id], row_to_video)
            .map_err(|e| e.to_string())?;
        rows.next()
            .ok_or("Video not found".to_string())?
            .map_err(|e| e.to_string())?
    };

    let summary = video.ai_summary;
    if summary.is_empty() {
        return Err("No AI summary exists to translate".to_string());
    }

    let settings = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;
        let mut s = AppSettings::default();
        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        for (key, value) in rows.flatten() {
            match key.as_str() {
                "api_provider" => s.api_provider = value,
                "api_endpoint" => s.api_endpoint = value,
                "api_key" => s.api_key = value,
                "model" => s.model = value,
                _ => {}
            }
        }
        s
    };

    if settings.api_key.is_empty() {
        return Err("请先在设置中配置 API Key".to_string());
    }

    let prompt = format!(
        "Please translate the following text into fluent Chinese. Only output the translated text, do not include any other explanations or comments:\n\n{}",
        summary
    );

    let system_msg = "You are a professional translator. Translate the text directly and accurately into Chinese.";

    let translated = if settings.api_provider == "gemini" {
        call_gemini_api(&settings, system_msg, &prompt).await?
    } else {
        call_openai_api(&settings, system_msg, &prompt).await?
    };

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "UPDATE videos SET ai_summary = ?1, ai_summary_en = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
            rusqlite::params![translated, summary, video_id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(translated)
}

#[tauri::command]
pub async fn translate_description(
    state: State<'_, DbState>,
    video_id: i64,
) -> Result<String, String> {
    let video = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, description_en, duration, thumbnail, cover_path, ai_summary, ai_summary_en, transcript, timestamps, note_path, rating, is_watched, deleted_at, created_at, updated_at FROM videos WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(rusqlite::params![video_id], row_to_video)
            .map_err(|e| e.to_string())?;
        rows.next()
            .ok_or("Video not found".to_string())?
            .map_err(|e| e.to_string())?
    };

    let description = video.description;
    if description.is_empty() {
        return Err("No description exists to translate".to_string());
    }

    let settings = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;
        let mut s = AppSettings::default();
        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        for (key, value) in rows.flatten() {
            match key.as_str() {
                "api_provider" => s.api_provider = value,
                "api_endpoint" => s.api_endpoint = value,
                "api_key" => s.api_key = value,
                "model" => s.model = value,
                _ => {}
            }
        }
        s
    };

    if settings.api_key.is_empty() {
        return Err("请先在设置中配置 API Key".to_string());
    }

    let prompt = format!(
        "Please translate the following text into fluent Chinese. Only output the translated text, do not include any other explanations or comments:\n\n{}",
        description
    );

    let system_msg = "You are a professional translator. Translate the text directly and accurately into Chinese.";

    let translated = if settings.api_provider == "gemini" {
        call_gemini_api(&settings, system_msg, &prompt).await?
    } else {
        call_openai_api(&settings, system_msg, &prompt).await?
    };

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "UPDATE videos SET description = ?1, description_en = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
            rusqlite::params![translated, description, video_id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(translated)
}

#[tauri::command]
pub async fn translate_timestamps(
    state: State<'_, DbState>,
    video_id: i64,
) -> Result<String, String> {
    let video = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, description_en, duration, thumbnail, cover_path, ai_summary, ai_summary_en, transcript, timestamps, note_path, rating, is_watched, deleted_at, created_at, updated_at FROM videos WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(rusqlite::params![video_id], row_to_video)
            .map_err(|e| e.to_string())?;
        rows.next()
            .ok_or("Video not found".to_string())?
            .map_err(|e| e.to_string())?
    };

    let timestamps = video.timestamps;
    if timestamps.is_empty() {
        return Err("No timestamps exist to translate".to_string());
    }

    let settings = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;
        let mut s = AppSettings::default();
        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        for (key, value) in rows.flatten() {
            match key.as_str() {
                "api_provider" => s.api_provider = value,
                "api_endpoint" => s.api_endpoint = value,
                "api_key" => s.api_key = value,
                "model" => s.model = value,
                _ => {}
            }
        }
        s
    };

    if settings.api_key.is_empty() {
        return Err("请先在设置中配置 API Key".to_string());
    }

    let prompt = format!(
        "Please translate the language descriptions in the following video timestamps into Chinese. Keep the original timestamp timings and append the Chinese translation to each line. For example, '00:00 Introduction' should become '00:00 Introduction 开场介绍'. If a line is already in Chinese or has no text, preserve it as is. Only output the translated timestamps without any extra metadata or markdown formatting blocks:\n\n{}",
        timestamps
    );

    let system_msg = "You are a professional translator and timestamp formatter. Translate descriptions to Chinese while rigidly preserving the exact timecodes.";

    let translated = if settings.api_provider == "gemini" {
        call_gemini_api(&settings, system_msg, &prompt).await?
    } else {
        call_openai_api(&settings, system_msg, &prompt).await?
    };

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "UPDATE videos SET timestamps = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![translated, video_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(translated)
}

async fn call_openai_api(
    settings: &AppSettings,
    system_msg: &str,
    prompt: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": settings.model,
        "messages": [
            { "role": "system", "content": system_msg },
            { "role": "user", "content": prompt }
        ],
        "temperature": 0.7,
        "max_tokens": 8192
    });

    let response = client
        .post(&settings.api_endpoint)
        .header("Authorization", format!("Bearer {}", settings.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    if !status.is_success() {
        return Err(format!("API error ({}): {}", status, text));
    }

    let json: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("Failed to parse response: {}", e))?;
    Ok(json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("Failed to extract summary")
        .to_string())
}

async fn call_gemini_api(
    settings: &AppSettings,
    system_msg: &str,
    prompt: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/models/{}:generateContent?key={}",
        settings.api_endpoint.trim_end_matches('/'),
        settings.model,
        settings.api_key
    );

    let body = serde_json::json!({
        "systemInstruction": {
            "parts": [{ "text": system_msg }]
        },
        "contents": [{
            "parts": [{ "text": prompt }]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192
        }
    });

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gemini API request failed: {}", e))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    if !status.is_success() {
        return Err(format!("Gemini API error ({}): {}", status, text));
    }

    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;
    Ok(json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("Failed to extract summary from Gemini")
        .to_string())
}

#[tauri::command]
pub fn toggle_watched(state: State<DbState>, id: i64, is_watched: i32) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE videos SET is_watched = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        rusqlite::params![is_watched, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_all_tags(state: State<DbState>) -> Result<Vec<Tag>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, name FROM tags ORDER BY name")
        .map_err(|e| e.to_string())?;
    let tags = stmt
        .query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tags)
}

#[tauri::command]
pub fn set_video_tags(
    state: State<DbState>,
    video_id: i64,
    tag_names: Vec<String>,
) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    set_tags_for_video(&db, video_id, &tag_names)?;
    Ok(get_tags_for_video(&db, video_id))
}

#[tauri::command]
pub fn get_video_tags(state: State<DbState>, video_id: i64) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    Ok(get_tags_for_video(&db, video_id))
}

#[tauri::command]
pub async fn update_video_transcript(
    state: State<'_, DbState>,
    video_id: i64,
    transcript: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Ensure the video exists
    let mut stmt = db
        .prepare("SELECT id FROM videos WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    if !stmt.exists(rusqlite::params![video_id]).unwrap_or(false) {
        return Err("Video not found".to_string());
    }

    db.execute(
        "UPDATE videos SET transcript = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        rusqlite::params![transcript, video_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn update_video_timestamps(
    state: State<'_, DbState>,
    video_id: i64,
    timestamps: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Ensure the video exists
    let mut stmt = db
        .prepare("SELECT id FROM videos WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    if !stmt.exists(rusqlite::params![video_id]).unwrap_or(false) {
        return Err("Video not found".to_string());
    }

    db.execute(
        "UPDATE videos SET timestamps = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        rusqlite::params![timestamps, video_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn generate_ai_tags(
    state: State<'_, DbState>,
    title: String,
    description: String,
    transcript: String,
) -> Result<Vec<String>, String> {
    let settings = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;
        let mut s = AppSettings::default();
        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        for (key, value) in rows.flatten() {
            match key.as_str() {
                "api_provider" => s.api_provider = value,
                "api_endpoint" => s.api_endpoint = value,
                "api_key" => s.api_key = value,
                "model" => s.model = value,
                _ => {}
            }
        }
        s
    };

    if settings.api_key.is_empty() {
        return Err("请先在设置中配置 API Key".to_string());
    }

    if title.is_empty() && description.is_empty() {
        return Err("请提供标题或描述来生成标签".to_string());
    }

    let prompt = if !transcript.is_empty() {
        // Truncate very long transcripts to avoid exceeding API limits
        let max_len = 8000;
        let truncated = if transcript.len() > max_len {
            format!("{}...\n\n[Transcript truncated]", &transcript[..max_len])
        } else {
            transcript.clone()
        };
        format!(
            "Based on the following video information, generate 5-8 relevant tags. \
            Tags should be concise, specific, and represent the key topics, technologies, or concepts covered. \
            Return ONLY a comma-separated list of tags, nothing else. No numbering, no bullet points.\n\n\
            Title: {}\n\
            Description: {}\n\
            Transcript excerpt:\n{}",
            title, description, truncated
        )
    } else {
        format!(
            "Based on the following video information, generate 5-8 relevant tags. \
            Tags should be concise, specific, and represent the key topics, technologies, or concepts covered. \
            Return ONLY a comma-separated list of tags, nothing else. No numbering, no bullet points.\n\n\
            Title: {}\n\
            Description: {}",
            title, description
        )
    };

    let system_msg = "You are a helpful assistant that generates relevant tags for video content. Analyze the content and produce specific, meaningful tags as a comma-separated list.";

    let response = if settings.api_provider == "gemini" {
        call_gemini_api(&settings, system_msg, &prompt).await?
    } else {
        call_openai_api(&settings, system_msg, &prompt).await?
    };

    // Parse the response into tags
    let tags: Vec<String> = response
        .split(',')
        .map(|tag| {
            tag.trim()
                .trim_start_matches('#')
                .trim_matches('"')
                .trim()
                .to_string()
        })
        .filter(|tag| !tag.is_empty() && tag.len() <= 30 && tag.len() >= 2)
        .collect();

    if tags.is_empty() {
        return Err("AI 未能生成有效标签，请重试".to_string());
    }

    Ok(tags)
}

// ===== Calendar Events =====

fn row_to_calendar_event(row: &rusqlite::Row) -> rusqlite::Result<CalendarEvent> {
    Ok(CalendarEvent {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        event_date: row.get(3)?,
        event_time: row.get(4)?,
        duration_minutes: row.get(5)?,
        repeat_type: row.get(6)?,
        repeat_until: row.get(7)?,
        reminder_minutes: row.get(8)?,
        video_id: row.get(9)?,
        completed: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

fn event_occurs_on_date(event: &CalendarEvent, date: &str) -> bool {
    if event.event_date == date {
        return true;
    }

    match event.repeat_type.as_str() {
        "none" => false,
        "daily" => {
            // Event occurs on date if date is on or after event_date and on or before repeat_until
            if let Ok(target_date) = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d") {
                if let Ok(event_start) =
                    chrono::NaiveDate::parse_from_str(&event.event_date, "%Y-%m-%d")
                {
                    let repeat_end = event
                        .repeat_until
                        .as_ref()
                        .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
                        .unwrap_or(target_date);

                    target_date >= event_start && target_date <= repeat_end
                } else {
                    false
                }
            } else {
                false
            }
        }
        "weekly" => {
            if let (Ok(target_date), Ok(event_start)) = (
                chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d"),
                chrono::NaiveDate::parse_from_str(&event.event_date, "%Y-%m-%d"),
            ) {
                let repeat_end = event
                    .repeat_until
                    .as_ref()
                    .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
                    .unwrap_or(target_date);

                if target_date >= event_start && target_date <= repeat_end {
                    let days_diff = (target_date - event_start).num_days();
                    return days_diff >= 0 && days_diff % 7 == 0;
                }
            }
            false
        }
        "monthly" => {
            if let (Ok(target_date), Ok(event_start)) = (
                chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d"),
                chrono::NaiveDate::parse_from_str(&event.event_date, "%Y-%m-%d"),
            ) {
                let repeat_end = event
                    .repeat_until
                    .as_ref()
                    .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
                    .unwrap_or(target_date);

                if target_date >= event_start && target_date <= repeat_end {
                    return event_start.day() == target_date.day();
                }
            }
            false
        }
        _ => false,
    }
}

#[tauri::command]
pub fn add_calendar_event(
    state: State<DbState>,
    event: CalendarEvent,
) -> Result<CalendarEvent, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Validate date format
    if chrono::NaiveDate::parse_from_str(&event.event_date, "%Y-%m-%d").is_err() {
        return Err("日期格式无效，应为 YYYY-MM-DD".to_string());
    }

    db.execute(
        "INSERT INTO calendar_events (title, description, event_date, event_time, duration_minutes, repeat_type, repeat_until, reminder_minutes, video_id, completed) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            event.title, event.description, event.event_date, event.event_time,
            event.duration_minutes, event.repeat_type, event.repeat_until,
            event.reminder_minutes, event.video_id, event.completed,
        ],
    ).map_err(|e| format!("添加事件失败: {}", e))?;

    let id = db.last_insert_rowid();
    let mut new_event = event;
    new_event.id = Some(id);
    Ok(new_event)
}

#[tauri::command]
pub fn get_calendar_events(
    state: State<DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.prepare(
        "SELECT id, title, description, event_date, event_time, duration_minutes, repeat_type, repeat_until, reminder_minutes, video_id, completed, created_at, updated_at
         FROM calendar_events
         WHERE event_date >= ?1 AND event_date <= ?2
         ORDER BY event_date, event_time"
    ).map_err(|e| e.to_string())?;

    let events = stmt
        .query_map(
            rusqlite::params![start_date, end_date],
            row_to_calendar_event,
        )
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(events)
}

#[tauri::command]
pub fn get_events_for_date(
    state: State<DbState>,
    date: String,
) -> Result<Vec<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Get all events that could potentially occur on this date
    let mut stmt = db.prepare(
        "SELECT id, title, description, event_date, event_time, duration_minutes, repeat_type, repeat_until, reminder_minutes, video_id, completed, created_at, updated_at
         FROM calendar_events
         WHERE event_date <= ?1
         ORDER BY event_date, event_time"
    ).map_err(|e| e.to_string())?;

    let all_events = stmt
        .query_map(rusqlite::params![&date], row_to_calendar_event)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    // Filter to only events that actually occur on this date
    let events: Vec<_> = all_events
        .into_iter()
        .filter(|e| event_occurs_on_date(e, &date))
        .collect();

    Ok(events)
}

#[tauri::command]
pub fn update_calendar_event(state: State<DbState>, event: CalendarEvent) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    if let Some(id) = event.id {
        db.execute(
            "UPDATE calendar_events
             SET title=?1, description=?2, event_date=?3, event_time=?4,
                 duration_minutes=?5, repeat_type=?6, repeat_until=?7,
                 reminder_minutes=?8, video_id=?9, completed=?10,
                 updated_at=CURRENT_TIMESTAMP
             WHERE id=?11",
            rusqlite::params![
                event.title,
                event.description,
                event.event_date,
                event.event_time,
                event.duration_minutes,
                event.repeat_type,
                event.repeat_until,
                event.reminder_minutes,
                event.video_id,
                event.completed,
                id,
            ],
        )
        .map_err(|e| format!("更新事件失败: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_calendar_event(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "DELETE FROM calendar_events WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| format!("删除事件失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn is_video_in_calendar(state: State<DbState>, video_id: i64) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare("SELECT COUNT(*) as count FROM calendar_events WHERE video_id = ?1")
        .map_err(|e| format!("查询失败: {}", e))?;

    let count: i64 = stmt
        .query_row(rusqlite::params![video_id], |row| row.get(0))
        .map_err(|e| format!("读取计数失败: {}", e))?;

    Ok(count > 0)
}

#[tauri::command]
pub fn get_video_calendar_event(
    state: State<DbState>,
    video_id: i64,
) -> Result<Option<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.prepare(
        "SELECT id, title, description, event_date, event_time, duration_minutes, repeat_type, repeat_until, reminder_minutes, video_id, completed, created_at, updated_at
         FROM calendar_events
         WHERE video_id = ?1
         ORDER BY event_date ASC
         LIMIT 1"
    ).map_err(|e| format!("查询失败: {}", e))?;

    let event = stmt
        .query_row(rusqlite::params![video_id], |row| {
            Ok(CalendarEvent {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                description: row.get(2)?,
                event_date: row.get(3)?,
                event_time: row.get(4)?,
                duration_minutes: row.get(5)?,
                repeat_type: row.get(6)?,
                repeat_until: row.get(7)?,
                reminder_minutes: row.get(8)?,
                video_id: row.get(9)?,
                completed: row.get(10)?,
                created_at: Some(row.get(11)?),
                updated_at: Some(row.get(12)?),
            })
        })
        .ok();

    Ok(event)
}

#[tauri::command]
pub fn check_reminders(state: State<DbState>) -> Result<Vec<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Local::now();
    let current_date = now.format("%Y-%m-%d").to_string();
    let current_time = now.format("%H:%M").to_string();

    // Get today and tomorrow's events
    let tomorrow = (now + chrono::Duration::days(1))
        .format("%Y-%m-%d")
        .to_string();

    let mut stmt = db.prepare(
        "SELECT id, title, description, event_date, event_time, duration_minutes, repeat_type, repeat_until, reminder_minutes, video_id, completed, created_at, updated_at
         FROM calendar_events
         WHERE event_date >= ?1 AND event_date <= ?2
         AND reminder_minutes IS NOT NULL
         AND completed = 0"
    ).map_err(|e| e.to_string())?;

    let all_events = stmt
        .query_map(
            rusqlite::params![&current_date, &tomorrow],
            row_to_calendar_event,
        )
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    // Filter events that need reminders
    let mut due_events = Vec::new();
    for event in all_events {
        if event.completed == 1 {
            continue;
        }

        if let Some(reminder_minutes) = event.reminder_minutes {
            if event.event_date == current_date && !event.event_time.is_empty() {
                if let (Ok(event_time), Ok(current_time_parsed)) = (
                    chrono::NaiveTime::parse_from_str(&event.event_time, "%H:%M"),
                    chrono::NaiveTime::parse_from_str(&current_time, "%H:%M"),
                ) {
                    let event_datetime = now.date_naive().and_time(event_time);
                    let current_datetime = now.date_naive().and_time(current_time_parsed);

                    let duration = event_datetime.signed_duration_since(current_datetime);
                    let duration_minutes = duration.num_minutes();

                    // Trigger reminder if we're within the reminder window
                    if duration_minutes <= reminder_minutes && duration_minutes > 0 {
                        due_events.push(event);
                    }
                }
            }
        }
    }

    Ok(due_events)
}

// ===== Obsidian Notes =====

/// Sanitize a string for use as a filename
fn sanitize_filename(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect();
    // Trim and limit length
    let trimmed = sanitized.trim().trim_matches('.');
    if trimmed.len() > 80 {
        trimmed[..80].to_string()
    } else {
        trimmed.to_string()
    }
}

/// Build the Obsidian Markdown content for a video (used as fallback when AI is unavailable)
fn build_obsidian_note_fallback(video: &Video) -> String {
    let now = chrono::Local::now().format("%Y-%m-%d").to_string();
    let video_type_label = match video.video_type.as_str() {
        "youtube" => "YouTube",
        "bilibili" => "Bilibili",
        _ => "本地视频",
    };
    let watched = if video.is_watched != 0 {
        "true"
    } else {
        "false"
    };
    let tags_yaml: String = video
        .tags
        .iter()
        .map(|t| format!("  - {}", t))
        .collect::<Vec<_>>()
        .join("\n");
    let tags_section = if video.tags.is_empty() {
        String::new()
    } else {
        format!("tags:\n{}", tags_yaml)
    };

    let url_str = video.url.as_deref().unwrap_or("");
    let file_path_str = video.file_path.as_deref().unwrap_or("");

    let mut md = format!(
        r#"---
title: "{}"
author: "{}"
url: "{}"
type: {}
duration: "{}"
rating: {}
watched: {}
{}
created: "{}"
updated: "{}"
---

# {}

## 📋 基本信息
- **作者**: [[{}]]
- **主题**: [[{}]]
- **时长**: {}
- **类型**: {}
"#,
        video.title.replace('"', r#"\""#),
        video.author.replace('"', r#"\""#),
        url_str,
        video.video_type,
        video.duration,
        video.rating,
        watched,
        tags_section,
        video.created_at.as_deref().unwrap_or(&now),
        &now,
        video.title,
        video.author,
        video.topic,
        video.duration,
        video_type_label,
    );

    if !url_str.is_empty() {
        md.push_str(&format!("- **链接**: [观看视频]({})\n", url_str));
    }
    if !file_path_str.is_empty() {
        md.push_str(&format!("- **文件**: `{}`\n", file_path_str));
    }

    if !video.description.is_empty() {
        md.push_str(&format!("\n## 📝 描述\n{}\n", video.description));
    }

    if !video.ai_summary.is_empty() {
        md.push_str(&format!("\n## ✨ AI 总结\n{}\n", video.ai_summary));
    }

    if !video.timestamps.is_empty() {
        md.push_str(&format!("\n## ⏱️ 时间戳\n{}\n", video.timestamps));
    }

    if !video.transcript.is_empty() {
        // Truncate very long transcripts for the note
        let transcript_preview = if video.transcript.len() > 5000 {
            format!("{}...\n\n> [完整逐字稿已截断]", &video.transcript[..5000])
        } else {
            video.transcript.clone()
        };
        md.push_str(&format!("\n## 📜 逐字稿\n{}\n", transcript_preview));
    }

    md.push_str("\n## 📝 个人笔记\n> 在此处添加你的个人笔记\n\n");

    if !video.tags.is_empty() {
        let tags_line: String = video
            .tags
            .iter()
            .map(|t| format!("#{}", t.replace(' ', "_")))
            .collect::<Vec<_>>()
            .join(" ");
        md.push_str(&format!("## 🏷️ 标签\n{}\n", tags_line));
    }

    md
}

#[tauri::command]
pub async fn generate_obsidian_note(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    video_id: i64,
) -> Result<String, String> {
    // 1. Load video data
    let video = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, description_en, duration, thumbnail, cover_path, ai_summary, ai_summary_en, transcript, timestamps, note_path, rating, is_watched, deleted_at, created_at, updated_at FROM videos WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(rusqlite::params![video_id], row_to_video)
            .map_err(|e| e.to_string())?;
        let mut v = rows
            .next()
            .ok_or("Video not found".to_string())?
            .map_err(|e| e.to_string())?;
        v.tags = get_tags_for_video(&db, video_id);
        v
    };

    // 2. Load settings for AI
    let settings = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;
        let mut s = AppSettings::default();
        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        for (key, value) in rows.flatten() {
            match key.as_str() {
                "api_provider" => s.api_provider = value,
                "api_endpoint" => s.api_endpoint = value,
                "api_key" => s.api_key = value,
                "model" => s.model = value,
                _ => {}
            }
        }
        s
    };

    // 3. Build AI prompt or fallback
    let url_str = video.url.as_deref().unwrap_or("");
    let file_path_str = video.file_path.as_deref().unwrap_or("");
    let tags_str = video.tags.join(", ");
    let watched_str = if video.is_watched != 0 {
        "已观看"
    } else {
        "未观看"
    };
    let now = chrono::Local::now().format("%Y-%m-%d").to_string();

    let markdown_content = if !settings.api_key.is_empty() {
        // Build a rich prompt for the AI
        let mut video_info = format!(
            "标题: {}\n作者: {}\n主题: {}\n类型: {}\n时长: {}\n评分: {}/5\n状态: {}\n",
            video.title,
            video.author,
            video.topic,
            video.video_type,
            video.duration,
            video.rating,
            watched_str
        );
        if !url_str.is_empty() {
            video_info.push_str(&format!("链接: {}\n", url_str));
        }
        if !file_path_str.is_empty() {
            video_info.push_str(&format!("文件路径: {}\n", file_path_str));
        }
        if !tags_str.is_empty() {
            video_info.push_str(&format!("标签: {}\n", tags_str));
        }
        if !video.description.is_empty() {
            video_info.push_str(&format!("描述: {}\n", video.description));
        }
        if !video.ai_summary.is_empty() {
            video_info.push_str(&format!("\nAI总结:\n{}\n", video.ai_summary));
        }
        if !video.timestamps.is_empty() {
            video_info.push_str(&format!("\n时间戳:\n{}\n", video.timestamps));
        }
        if !video.transcript.is_empty() {
            let max_len = 8000;
            let transcript_text = if video.transcript.len() > max_len {
                format!("{}...[已截断]", &video.transcript[..max_len])
            } else {
                video.transcript.clone()
            };
            video_info.push_str(&format!("\n逐字稿:\n{}\n", transcript_text));
        }

        let prompt = format!(
            r#"请根据以下视频信息，生成一个 Obsidian 兼容的 Markdown 笔记文件。要求：

1. 必须以 YAML frontmatter 开头（用 --- 包裹），包含以下字段：
   - title, author, url, type, duration, rating, watched, tags (数组), created, updated
2. 使用 Obsidian 语法：
   - 用 [[作者名]] 和 [[主题名]] 创建双向链接
   - 用 #标签名 格式添加标签
3. 包含以下区块（如果信息可用）：
   - 📋 基本信息
   - ✨ AI 总结（基于已有总结进行润色整理，使其更适合笔记阅读）
   - ⏱️ 时间戳（保留原始时间戳格式）
   - 📜 逐字稿（如果有，保留前部分）
   - 📝 个人笔记（留空，供用户填写）
   - 🏷️ 标签
4. 用 created 字段填入: "{}"
5. 用 updated 字段填入: "{}"
6. 只输出 Markdown 内容，不要包含在代码块中，不要添加额外解释

视频信息：
{}"#,
            video.created_at.as_deref().unwrap_or(&now),
            &now,
            video_info,
        );

        let system_msg = "你是一个专业的笔记生成助手。你会根据视频信息生成格式规范、内容丰富的 Obsidian 兼容 Markdown 笔记。你的输出应该直接就是 Markdown 文件内容，以 YAML frontmatter 开头。";

        match if settings.api_provider == "gemini" {
            call_gemini_api(&settings, system_msg, &prompt).await
        } else {
            call_openai_api(&settings, system_msg, &prompt).await
        } {
            Ok(content) => {
                // Strip markdown code fences if AI wrapped the output
                let content = content.trim();
                let content = if content.starts_with("```") {
                    let content = content
                        .strip_prefix("```markdown")
                        .or_else(|| content.strip_prefix("```md"))
                        .or_else(|| content.strip_prefix("```"))
                        .unwrap_or(content);
                    content
                        .strip_suffix("```")
                        .unwrap_or(content)
                        .trim()
                        .to_string()
                } else {
                    content.to_string()
                };
                content
            }
            Err(_) => {
                // Fallback to template if AI fails
                build_obsidian_note_fallback(&video)
            }
        }
    } else {
        // No API key — use template fallback
        build_obsidian_note_fallback(&video)
    };

    // 4. Create notes directory and write file
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let notes_dir = app_data_dir.join("notes");

    let sanitized_title = sanitize_filename(&video.title);
    let folder_name = format!("{}_{}", video_id, sanitized_title);
    let video_notes_dir = notes_dir.join(&folder_name);
    fs::create_dir_all(&video_notes_dir)
        .map_err(|e| format!("Failed to create notes directory: {}", e))?;

    let md_filename = format!("{}.md", sanitized_title);
    let md_path = video_notes_dir.join(&md_filename);

    fs::write(&md_path, &markdown_content)
        .map_err(|e| format!("Failed to write note file: {}", e))?;

    // 5. Update note_path in database
    let relative_path = format!("{}/{}", folder_name, md_filename);
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "UPDATE videos SET note_path = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![relative_path, video_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(markdown_content)
}

#[tauri::command]
pub fn open_notes_dir(
    app: tauri::AppHandle,
    _video_id: i64,
    note_path: String,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let notes_dir = app_data_dir.join("notes");

    // Try to open the specific video's note directory
    let parts: Vec<&str> = note_path.split('/').collect();
    let dir_to_open = if parts.len() > 1 {
        notes_dir.join(parts[0])
    } else {
        notes_dir.clone()
    };

    if dir_to_open.exists() {
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(&dir_to_open)
                .spawn()
                .map_err(|e| format!("Failed to open directory: {}", e))?;
        }
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("explorer")
                .arg(&dir_to_open)
                .spawn()
                .map_err(|e| format!("Failed to open directory: {}", e))?;
        }
        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(&dir_to_open)
                .spawn()
                .map_err(|e| format!("Failed to open directory: {}", e))?;
        }
    } else {
        return Err("Notes directory not found".to_string());
    }

    Ok(())
}
