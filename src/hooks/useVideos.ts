import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Video, VideoFilter, AppSettings } from '../types';

export function useVideos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(false);
    const [authors, setAuthors] = useState<string[]>([]);
    const [topics, setTopics] = useState<string[]>([]);

    const fetchVideos = useCallback(async (filter: VideoFilter = {}) => {
        setLoading(true);
        try {
            const result = await invoke<Video[]>('get_videos', { filter });
            setVideos(result);
        } catch (err) {
            console.error('Failed to fetch videos:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMeta = useCallback(async () => {
        try {
            const [a, t] = await Promise.all([
                invoke<string[]>('get_authors'),
                invoke<string[]>('get_topics'),
            ]);
            setAuthors(a);
            setTopics(t);
        } catch (err) {
            console.error('Failed to fetch meta:', err);
        }
    }, []);

    const addVideo = useCallback(async (video: Video): Promise<Video | null> => {
        try {
            const result = await invoke<Video>('add_video', { video });
            await fetchVideos();
            await fetchMeta();
            return result;
        } catch (err) {
            console.error('Failed to add video:', err);
            throw err;
        }
    }, [fetchVideos, fetchMeta]);

    const updateVideo = useCallback(async (video: Video) => {
        try {
            await invoke('update_video', { video });
            await fetchVideos();
            await fetchMeta();
        } catch (err) {
            console.error('Failed to update video:', err);
            throw err;
        }
    }, [fetchVideos, fetchMeta]);

    const deleteVideo = useCallback(async (id: number) => {
        try {
            await invoke('delete_video', { id });
            await fetchVideos();
            await fetchMeta();
        } catch (err) {
            console.error('Failed to delete video:', err);
            throw err;
        }
    }, [fetchVideos, fetchMeta]);

    const toggleWatched = useCallback(async (id: number, isWatched: number) => {
        try {
            await invoke('toggle_watched', { id, isWatched });
            await fetchVideos();
        } catch (err) {
            console.error('Failed to toggle watched:', err);
            throw err;
        }
    }, [fetchVideos]);

    const summarizeVideo = useCallback(async (videoId: number, customPrompt?: string): Promise<string> => {
        try {
            const summary = await invoke<string>('summarize_video', { videoId, customPrompt: customPrompt || null });
            await fetchVideos();
            return summary;
        } catch (err) {
            console.error('Failed to summarize:', err);
            throw err;
        }
    }, [fetchVideos]);

    const translateSummary = useCallback(async (videoId: number): Promise<string> => {
        try {
            const summary = await invoke<string>('translate_summary', { videoId });
            await fetchVideos();
            return summary;
        } catch (err) {
            console.error('Failed to translate summary:', err);
            throw err;
        }
    }, [fetchVideos]);

    return {
        videos,
        loading,
        authors,
        topics,
        fetchVideos,
        fetchMeta,
        addVideo,
        updateVideo,
        deleteVideo,
        toggleWatched,
        summarizeVideo,
        translateSummary,
    };
}

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>({
        api_provider: 'gemini',
        api_endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        api_key: '',
        model: 'gemini-2.5-flash-preview-05-20',
    });
    const [loading, setLoading] = useState(false);

    const fetchSettings = useCallback(async () => {
        try {
            const result = await invoke<AppSettings>('get_settings');
            setSettings(result);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        }
    }, []);

    const saveSettings = useCallback(async (newSettings: AppSettings) => {
        setLoading(true);
        try {
            await invoke('save_settings', { settings: newSettings });
            setSettings(newSettings);
        } catch (err) {
            console.error('Failed to save settings:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    return { settings, loading, saveSettings, fetchSettings };
}
