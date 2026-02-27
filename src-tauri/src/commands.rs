use crate::db::{AppSettings, DbState, Video, VideoFilter};
use tauri::State;

fn row_to_video(row: &rusqlite::Row) -> rusqlite::Result<Video> {
    Ok(Video {
        id: row.get(0)?,
        title: row.get(1)?,
        video_type: row.get(2)?,
        file_path: row.get(3)?,
        url: row.get(4)?,
        author: row.get(5)?,
        topic: row.get(6)?,
        description: row.get(7)?,
        duration: row.get(8)?,
        thumbnail: row.get(9)?,
        ai_summary: row.get(10)?,
        rating: row.get(11)?,
        is_watched: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
    })
}

#[tauri::command]
pub fn add_video(state: State<DbState>, video: Video) -> Result<Video, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO videos (title, video_type, file_path, url, author, topic, description, duration, thumbnail, ai_summary, rating, is_watched) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![
            video.title, video.video_type, video.file_path, video.url,
            video.author, video.topic, video.description, video.duration,
            video.thumbnail, video.ai_summary, video.rating, video.is_watched,
        ],
    ).map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();
    let mut new_video = video;
    new_video.id = Some(id);
    Ok(new_video)
}

#[tauri::command]
pub fn update_video(state: State<DbState>, video: Video) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE videos SET title=?1, video_type=?2, file_path=?3, url=?4, author=?5, topic=?6, description=?7, duration=?8, thumbnail=?9, ai_summary=?10, rating=?11, is_watched=?12, updated_at=CURRENT_TIMESTAMP WHERE id=?13",
        rusqlite::params![
            video.title, video.video_type, video.file_path, video.url,
            video.author, video.topic, video.description, video.duration,
            video.thumbnail, video.ai_summary, video.rating, video.is_watched, video.id,
        ],
    ).map_err(|e| e.to_string())?;
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
            conditions.push("(title LIKE ?1 OR description LIKE ?1 OR author LIKE ?1 OR topic LIKE ?1)".to_string());
            params.push(Box::new(format!("%{}%", search)));
        }
    }
    if let Some(ref author) = filter.author {
        if !author.is_empty() {
            let idx = params.len() + 1;
            conditions.push(format!("author = ?{}", idx));
            params.push(Box::new(author.clone()));
        }
    }
    if let Some(ref topic) = filter.topic {
        if !topic.is_empty() {
            let idx = params.len() + 1;
            conditions.push(format!("topic = ?{}", idx));
            params.push(Box::new(topic.clone()));
        }
    }
    if let Some(ref video_type) = filter.video_type {
        if !video_type.is_empty() {
            let idx = params.len() + 1;
            conditions.push(format!("video_type = ?{}", idx));
            params.push(Box::new(video_type.clone()));
        }
    }
    if let Some(is_watched) = filter.is_watched {
        let idx = params.len() + 1;
        conditions.push(format!("is_watched = ?{}", idx));
        params.push(Box::new(is_watched));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };
    let query = format!(
        "SELECT id, title, video_type, file_path, url, author, topic, description, duration, thumbnail, ai_summary, rating, is_watched, created_at, updated_at FROM videos{} ORDER BY updated_at DESC",
        where_clause
    );
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let videos = stmt
        .query_map(param_refs.as_slice(), row_to_video)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(videos)
}

#[tauri::command]
pub fn get_video(state: State<DbState>, id: i64) -> Result<Option<Video>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, title, video_type, file_path, url, author, topic, description, duration, thumbnail, ai_summary, rating, is_watched, created_at, updated_at FROM videos WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query_map(rusqlite::params![id], row_to_video).map_err(|e| e.to_string())?;
    match rows.next() {
        Some(Ok(video)) => Ok(Some(video)),
        Some(Err(e)) => Err(e.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn get_authors(state: State<DbState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT DISTINCT author FROM videos ORDER BY author").map_err(|e| e.to_string())?;
    let authors = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok()).collect();
    Ok(authors)
}

#[tauri::command]
pub fn get_topics(state: State<DbState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT DISTINCT topic FROM videos ORDER BY topic").map_err(|e| e.to_string())?;
    let topics = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok()).collect();
    Ok(topics)
}

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> Result<AppSettings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT key, value FROM settings").map_err(|e| e.to_string())?;
    let mut settings = AppSettings::default();
    let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    for row in rows {
        if let Ok((key, value)) = row {
            match key.as_str() {
                "api_provider" => settings.api_provider = value,
                "api_endpoint" => settings.api_endpoint = value,
                "api_key" => settings.api_key = value,
                "model" => settings.model = value,
                _ => {}
            }
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
        ).map_err(|e| e.to_string())?;
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
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, topic, description, duration, thumbnail, ai_summary, rating, is_watched, created_at, updated_at FROM videos WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query_map(rusqlite::params![video_id], row_to_video).map_err(|e| e.to_string())?;
        rows.next().ok_or("Video not found".to_string())?.map_err(|e| e.to_string())?
    };

    let settings = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT key, value FROM settings").map_err(|e| e.to_string())?;
        let mut s = AppSettings::default();
        let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            if let Ok((key, value)) = row {
                match key.as_str() {
                    "api_provider" => s.api_provider = value,
                    "api_endpoint" => s.api_endpoint = value,
                    "api_key" => s.api_key = value,
                    "model" => s.model = value,
                    _ => {}
                }
            }
        }
        s
    };

    if settings.api_key.is_empty() {
        return Err("请先在设置中配置 API Key".to_string());
    }

    let prompt = custom_prompt.unwrap_or_else(|| {
        format!(
            "Please provide a comprehensive summary of the following video tutorial. \
            Include key topics covered, main takeaways, and learning points.\n\n\
            Title: {}\nAuthor: {}\nTopic: {}\nDescription: {}\n\n\
            Please write the summary in the same language as the title and description.",
            video.title, video.author, video.topic, video.description
        )
    });

    let system_msg = "You are a helpful assistant that summarizes video tutorials. Provide clear, structured summaries with key learning points.";

    let summary = if settings.api_provider == "gemini" {
        call_gemini_api(&settings, system_msg, &prompt).await?
    } else {
        call_openai_api(&settings, system_msg, &prompt).await?
    };

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "UPDATE videos SET ai_summary = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![summary, video_id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(summary)
}

#[tauri::command]
pub async fn translate_summary(
    state: State<'_, DbState>,
    video_id: i64,
) -> Result<String, String> {
    let video = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT id, title, video_type, file_path, url, author, topic, description, duration, thumbnail, ai_summary, rating, is_watched, created_at, updated_at FROM videos WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query_map(rusqlite::params![video_id], row_to_video).map_err(|e| e.to_string())?;
        rows.next().ok_or("Video not found".to_string())?.map_err(|e| e.to_string())?
    };

    let summary = video.ai_summary;
    if summary.is_empty() {
        return Err("No AI summary exists to translate".to_string());
    }

    let settings = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db.prepare("SELECT key, value FROM settings").map_err(|e| e.to_string())?;
        let mut s = AppSettings::default();
        let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            if let Ok((key, value)) = row {
                match key.as_str() {
                    "api_provider" => s.api_provider = value,
                    "api_endpoint" => s.api_endpoint = value,
                    "api_key" => s.api_key = value,
                    "model" => s.model = value,
                    _ => {}
                }
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
            "UPDATE videos SET ai_summary = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![translated, video_id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(translated)
}

async fn call_openai_api(settings: &AppSettings, system_msg: &str, prompt: &str) -> Result<String, String> {
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
        .send().await.map_err(|e| format!("API request failed: {}", e))?;

    let status = response.status();
    let text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
    if !status.is_success() {
        return Err(format!("API error ({}): {}", status, text));
    }

    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    Ok(json["choices"][0]["message"]["content"].as_str().unwrap_or("Failed to extract summary").to_string())
}

async fn call_gemini_api(settings: &AppSettings, system_msg: &str, prompt: &str) -> Result<String, String> {
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
        .send().await.map_err(|e| format!("Gemini API request failed: {}", e))?;

    let status = response.status();
    let text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
    if !status.is_success() {
        return Err(format!("Gemini API error ({}): {}", status, text));
    }

    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;
    Ok(json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str().unwrap_or("Failed to extract summary from Gemini").to_string())
}

#[tauri::command]
pub fn toggle_watched(state: State<DbState>, id: i64, is_watched: i32) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE videos SET is_watched = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        rusqlite::params![is_watched, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
