export interface Video {
  id?: number;
  title: string;
  video_type: 'local' | 'youtube' | 'bilibili';
  file_path?: string;
  url?: string;
  author: string;
  author_url: string;
  topic: string;
  description: string;
  duration: string;
  thumbnail: string;
  ai_summary: string;
  ai_summary_en: string;
  transcript: string;
  timestamps: string;
  rating: number;
  is_watched: number;
  created_at?: string;
  updated_at?: string;
  tags: string[];
}

export interface VideoFilter {
  search?: string;
  author?: string;
  topic?: string;
  video_type?: string;
  is_watched?: number;
  tags?: string[];
}

export interface AppSettings {
  api_provider: string; // 'gemini' | 'openai' | 'deepseek' | 'anthropic' | 'openrouter' | 'custom' | any
  api_endpoint: string;
  api_key: string;
  model: string;
}

export const DEFAULT_VIDEO: Video = {
  title: '',
  video_type: 'local',
  file_path: '',
  url: '',
  author: '',
  author_url: '',
  topic: '',
  description: '',
  duration: '',
  thumbnail: '',
  ai_summary: '',
  ai_summary_en: '',
  transcript: '',
  timestamps: '',
  rating: 0,
  is_watched: 0,
  tags: [],
};

export const VIDEO_TYPE_LABELS: Record<string, string> = {
  local: '📁 本地视频',
  youtube: '▶️ YouTube',
  bilibili: '📺 Bilibili',
};

export const VIDEO_TYPE_ICONS: Record<string, string> = {
  local: '📁',
  youtube: '▶️',
  bilibili: '📺',
};
