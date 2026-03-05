import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Video, VideoFilter, AppSettings } from '../types';

export function useVideos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(false);
    const [authors, setAuthors] = useState<string[]>([]);
    const [topics, setTopics] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [totalVideoCount, setTotalVideoCount] = useState(0);
    const [videoTypeCounts, setVideoTypeCounts] = useState<Record<string, number>>({});

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

    const fetchAllTags = useCallback(async () => {
        try {
            const result = await invoke<{ id: number; name: string }[]>('get_all_tags');
            setAllTags(result.map((t) => t.name));
        } catch (err) {
            console.error('Failed to fetch tags:', err);
        }
    }, []);

    const fetchMeta = useCallback(async () => {
        try {
            const [a, t, count, typeCounts] = await Promise.all([
                invoke<string[]>('get_authors'),
                invoke<string[]>('get_topics'),
                invoke<number>('get_total_video_count'),
                invoke<Record<string, number>>('get_video_type_counts'),
            ]);
            setAuthors(a);
            setTopics(t);
            setTotalVideoCount(count);
            setVideoTypeCounts(typeCounts);
        } catch (err) {
            console.error('Failed to fetch meta:', err);
        }
        await fetchAllTags();
    }, [fetchAllTags]);

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

    const updateVideoTranscript = useCallback(async (videoId: number, transcript: string): Promise<void> => {
        try {
            await invoke('update_video_transcript', { videoId, transcript });
            await fetchVideos();
        } catch (err) {
            console.error('Failed to update transcript:', err);
            throw err;
        }
    }, [fetchVideos]);

    const updateVideoTimestamps = useCallback(async (videoId: number, timestamps: string): Promise<void> => {
        try {
            await invoke('update_video_timestamps', { videoId, timestamps });
            await fetchVideos();
        } catch (err) {
            console.error('Failed to update timestamps:', err);
            throw err;
        }
    }, [fetchVideos]);

    const translateTimestamps = useCallback(async (videoId: number): Promise<string> => {
        try {
            const timestamps = await invoke<string>('translate_timestamps', { videoId });
            await fetchVideos();
            return timestamps;
        } catch (err) {
            console.error('Failed to translate timestamps:', err);
            throw err;
        }
    }, [fetchVideos]);

    const getVideo = useCallback(async (id: number): Promise<Video | null> => {
        try {
            return await invoke<Video | null>('get_video', { id });
        } catch (err) {
            console.error('Failed to get video:', err);
            throw err;
        }
    }, []);

    return {
        videos,
        totalVideoCount,
        videoTypeCounts,
        loading,
        authors,
        topics,
        allTags,
        fetchVideos,
        fetchMeta,
        fetchAllTags,
        addVideo,
        updateVideo,
        deleteVideo,
        toggleWatched,
        summarizeVideo,
        translateSummary,
        translateTimestamps,
        updateVideoTranscript,
        updateVideoTimestamps,
        getVideo,
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
