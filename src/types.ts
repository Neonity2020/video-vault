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
  description_en: string;
  duration: string;
  thumbnail: string;
  cover_path?: string;
  ai_summary: string;
  ai_summary_en: string;
  transcript: string;
  timestamps: string;
  note_path?: string;
  rating: number;
  is_watched: number;
  deleted_at?: string;
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
  include_deleted?: boolean;
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
  description_en: '',
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

export interface CalendarEvent {
  id?: number;
  title: string;
  description: string;
  event_date: string; // YYYY-MM-DD
  event_time: string; // HH:MM
  duration_minutes?: number;
  repeat_type: 'none' | 'daily' | 'weekly' | 'monthly';
  repeat_until?: string; // YYYY-MM-DD
  reminder_minutes?: number;
  video_id?: number;
  completed: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_CALENDAR_EVENT: CalendarEvent = {
  title: '',
  description: '',
  event_date: new Date().toISOString().split('T')[0],
  event_time: '',
  repeat_type: 'none',
  completed: 0,
};

export const REPEAT_TYPE_LABELS: Record<string, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
};
