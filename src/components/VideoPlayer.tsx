import { forwardRef, useImperativeHandle, useRef } from "react";
import { Video } from "../types";
import { openUrl } from "@tauri-apps/plugin-opener";

interface VideoPlayerProps {
  video: Video;
}

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
}

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

function OpenInBrowserButton({ url, label }: { url: string; label?: string }) {
  const handleOpen = async () => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };
  return (
    <button className="btn btn-primary" onClick={handleOpen} style={{ gap: 6 }}>
      🌐 {label || "在浏览器中打开"}
    </button>
  );
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ video }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (video.video_type === "youtube" && video.url) {
        const videoId = getYouTubeVideoId(video.url);
        const url = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}s`;
        openUrl(url).catch(() => window.open(url, "_blank"));
      } else if (video.video_type === "bilibili" && video.url) {
        const separator = video.url.includes("?") ? "&" : "?";
        const url = `${video.url}${separator}t=${Math.floor(seconds)}`;
        openUrl(url).catch(() => window.open(url, "_blank"));
      } else if (video.video_type === "local" && videoRef.current) {
        videoRef.current.currentTime = seconds;
        videoRef.current.play().catch(() => {});
      }
    }
  }));

  // === LOCAL VIDEO ===
  if (video.video_type === "local") {
    if (video.file_path) {
      return (
        <div className="detail-player">
          <video ref={videoRef} controls src={`asset://localhost/${video.file_path}`}>
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
    return (
      <div className="detail-player">
        <div className="player-placeholder">
          <span className="icon">📁</span>
          <span>未设置视频文件路径</span>
        </div>
      </div>
    );
  }

  // === YOUTUBE — open in browser (iframe embed blocked by error 153) ===
  if (video.video_type === "youtube" && video.url) {
    const videoId = getYouTubeVideoId(video.url);
    const thumbUrl =
      video.thumbnail ||
      (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "");
    return (
      <div className="detail-player">
        <div
          className="player-placeholder"
          style={{ position: "relative", cursor: "pointer" }}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={video.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
                inset: 0,
                opacity: 0.6,
              }}
            />
          ) : null}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48, opacity: 0.8 }}>▶️</div>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              YouTube 视频需在浏览器中观看
            </span>
            <OpenInBrowserButton url={video.url} label="打开 YouTube" />
          </div>
        </div>
      </div>
    );
  }

  // === BILIBILI — open in browser (iframe embed blocked by Bilibili from non-bilibili origins) ===
  if (video.video_type === "bilibili" && video.url) {
    const thumbUrl = video.thumbnail || "";
    return (
      <div className="detail-player">
        <div
          className="player-placeholder"
          style={{ position: "relative", cursor: "pointer" }}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={video.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
                inset: 0,
                opacity: 0.6,
              }}
            />
          ) : null}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48, opacity: 0.8 }}>▶️</div>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Bilibili 视频需在浏览器中观看
            </span>
            <OpenInBrowserButton url={video.url} label="打开 Bilibili" />
          </div>
        </div>
      </div>
    );
  }

  // === FALLBACK ===
  return (
    <div className="detail-player">
      <div className="player-placeholder">
        <span className="icon">🔗</span>
        <span>无法嵌入播放</span>
        {video.url && <OpenInBrowserButton url={video.url} />}
      </div>
    </div>
  );
});

export default VideoPlayer;
