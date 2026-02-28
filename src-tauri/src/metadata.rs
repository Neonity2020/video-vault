use base64::Engine as _;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct VideoMetadata {
    pub title: String,
    pub author: String,
    pub thumbnail: String,
    pub description: String,
    pub duration: String,
}

/// Download an image from a URL and return it as a base64 data URL.
/// This bypasses anti-hotlinking (no Referer sent) and CSP http restrictions.
async fn download_image_as_data_url(url: &str) -> Result<String, String> {
    // Ensure https
    let url = if url.starts_with("http://") {
        url.replacen("http://", "https://", 1)
    } else {
        url.to_string()
    };

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Image download failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Image download returned status: {}", resp.status()));
    }

    // Detect MIME type from Content-Type header, fallback to image/jpeg
    let mime = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .split(';')
        .next()
        .unwrap_or("image/jpeg")
        .trim()
        .to_string();

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image bytes: {}", e))?;

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

/// Fetch metadata from YouTube using the oEmbed API (no API key required)
async fn fetch_youtube_metadata(url: &str) -> Result<VideoMetadata, String> {
    let oembed_url = format!(
        "https://www.youtube.com/oembed?url={}&format=json",
        urlencoding(url)
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&oembed_url)
        .send()
        .await
        .map_err(|e| format!("YouTube oEmbed request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("YouTube oEmbed returned status: {}", resp.status()));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse YouTube response: {}", e))?;

    Ok(VideoMetadata {
        title: json["title"].as_str().unwrap_or("").to_string(),
        author: json["author_name"].as_str().unwrap_or("").to_string(),
        thumbnail: json["thumbnail_url"].as_str().unwrap_or("").to_string(),
        description: String::new(), // oEmbed doesn't provide description
        duration: String::new(),
    })
}

/// Fetch metadata from Bilibili using the public web API
async fn fetch_bilibili_metadata(url: &str) -> Result<VideoMetadata, String> {
    // Extract BV id
    let bvid = extract_bvid(url).ok_or("Could not extract BV id from Bilibili URL")?;

    let api_url = format!(
        "https://api.bilibili.com/x/web-interface/view?bvid={}",
        bvid
    );

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let resp = client
        .get(&api_url)
        .send()
        .await
        .map_err(|e| format!("Bilibili API request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Bilibili API returned status: {}", resp.status()));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Bilibili response: {}", e))?;

    let code = json["code"].as_i64().unwrap_or(-1);
    if code != 0 {
        let msg = json["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("Bilibili API error: {}", msg));
    }

    let data = &json["data"];
    let duration_secs = data["duration"].as_i64().unwrap_or(0);
    let duration_str = if duration_secs > 0 {
        let hours = duration_secs / 3600;
        let minutes = (duration_secs % 3600) / 60;
        let seconds = duration_secs % 60;
        if hours > 0 {
            format!("{}:{:02}:{:02}", hours, minutes, seconds)
        } else {
            format!("{}:{:02}", minutes, seconds)
        }
    } else {
        String::new()
    };

    // Download thumbnail and convert to base64 data URL to bypass anti-hotlinking
    let thumbnail_url = data["pic"].as_str().unwrap_or("");
    let thumbnail = if !thumbnail_url.is_empty() {
        download_image_as_data_url(thumbnail_url).await.unwrap_or_default()
    } else {
        String::new()
    };

    Ok(VideoMetadata {
        title: data["title"].as_str().unwrap_or("").to_string(),
        author: data["owner"]["name"].as_str().unwrap_or("").to_string(),
        thumbnail,
        description: data["desc"].as_str().unwrap_or("").to_string(),
        duration: duration_str,
    })
}

fn extract_bvid(url: &str) -> Option<String> {
    if let Some(start) = url.find("BV") {
        let candidate = &url[start..];
        // BV ids are 12 chars: "BV" + 10 alphanumeric
        if candidate.len() >= 12 {
            let bvid: String = candidate.chars().take(12).collect();
            if bvid.chars().skip(2).all(|c| c.is_alphanumeric()) {
                return Some(bvid);
            }
        }
    }
    None
}

fn urlencoding(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            _ => format!("%{:02X}", c as u8),
        })
        .collect()
}

/// Detect the video platform from URL and fetch metadata accordingly
#[tauri::command]
pub async fn fetch_video_metadata(url: String) -> Result<VideoMetadata, String> {
    let url_lower = url.to_lowercase();

    if url_lower.contains("youtube.com") || url_lower.contains("youtu.be") {
        fetch_youtube_metadata(&url).await
    } else if url_lower.contains("bilibili.com") || url_lower.contains("b23.tv") {
        fetch_bilibili_metadata(&url).await
    } else {
        Err("Unsupported URL. Only YouTube and Bilibili URLs are supported.".to_string())
    }
}
