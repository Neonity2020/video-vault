use crate::db::{AppSettings, DbState, Tag, Video, VideoFilter};
use tauri::State;

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
        duration: row.get(9)?,
        thumbnail: row.get(10)?,
        ai_summary: row.get(11)?,
        ai_summary_en: row.get::<_, Option<String>>(12)?.unwrap_or_default(),
        transcript: row.get::<_, Option<String>>(13)?.unwrap_or_default(),
        timestamps: row.get::<_, Option<String>>(14)?.unwrap_or_default(),
        rating: row.get(15)?,
        is_watched: row.get(16)?,
        created_at: row.get(17)?,
        updated_at: row.get(18)?,
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

#[tauri::command]
pub fn add_video(state: State<DbState>, video: Video) -> Result<Video, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO videos (title, video_type, file_path, url, author, author_url, topic, description, duration, thumbnail, ai_summary, ai_summary_en, transcript, timestamps, rating, is_watched) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        rusqlite::params![
            video.title, video.video_type, video.file_path, video.url,
            video.author, video.author_url, video.topic, video.description, video.duration,
            video.thumbnail, video.ai_summary, video.ai_summary_en, video.transcript, video.timestamps, video.rating, video.is_watched,
        ],
    ).map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();
    set_tags_for_video(&db, id, &video.tags)?;
    let mut new_video = video;
    new_video.id = Some(id);
    new_video.tags = get_tags_for_video(&db, id);
    Ok(new_video)
}

#[tauri::command]
pub fn update_video(state: State<DbState>, video: Video) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE videos SET title=?1, video_type=?2, file_path=?3, url=?4, author=?5, author_url=?6, topic=?7, description=?8, duration=?9, thumbnail=?10, ai_summary=?11, ai_summary_en=?12, transcript=?13, timestamps=?14, rating=?15, is_watched=?16, updated_at=CURRENT_TIMESTAMP WHERE id=?17",
        rusqlite::params![
            video.title, video.video_type, video.file_path, video.url,
            video.author, video.author_url, video.topic, video.description, video.duration,
            video.thumbnail, video.ai_summary, video.ai_summary_en, video.transcript, video.timestamps, video.rating, video.is_watched, video.id,
        ],
    ).map_err(|e| e.to_string())?;
    if let Some(id) = video.id {
        set_tags_for_video(&db, id, &video.tags)?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_video(state: State<DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM videos WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
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
        "SELECT v.id, v.title, v.video_type, v.file_path, v.url, v.author, v.author_url, v.topic, v.description, v.duration, v.thumbnail, v.ai_summary, v.ai_summary_en, v.transcript, v.timestamps, v.rating, v.is_watched, v.created_at, v.updated_at FROM videos v{}{} ORDER BY v.updated_at DESC",
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
        .prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, duration, thumbnail, ai_summary, ai_summary_en, transcript, timestamps, rating, is_watched, created_at, updated_at FROM videos WHERE id = ?1")
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
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, duration, thumbnail, ai_summary, ai_summary_en, transcript, timestamps, rating, is_watched, created_at, updated_at FROM videos WHERE id = ?1")
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
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, duration, thumbnail, ai_summary, ai_summary_en, transcript, timestamps, rating, is_watched, created_at, updated_at FROM videos WHERE id = ?1")
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
pub async fn translate_timestamps(
    state: State<'_, DbState>,
    video_id: i64,
) -> Result<String, String> {
    let video = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, author_url, topic, description, duration, thumbnail, ai_summary, ai_summary_en, transcript, timestamps, rating, is_watched, created_at, updated_at FROM videos WHERE id = ?1")
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
