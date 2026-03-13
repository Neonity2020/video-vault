import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Video, DEFAULT_VIDEO } from '../types';

interface VideoFormProps {
    video?: Video;
    onSave: (video: Video) => void;
    onClose: () => void;
    saving?: boolean;
    allTags?: string[];
}

interface FetchedMeta {
    title: string;
    author: string;
    author_url: string;
    thumbnail: string;
    description: string;
    duration: string;
}

export default function VideoForm({ video, onSave, onClose, saving, allTags = [] }: VideoFormProps) {
    const [form, setForm] = useState<Video>(video || { ...DEFAULT_VIDEO });
    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [fetchSuccess, setFetchSuccess] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [generatingTags, setGeneratingTags] = useState(false);
    const [tagError, setTagError] = useState('');
    const isEdit = !!video?.id;

    useEffect(() => {
        if (video) setForm(video);
    }, [video]);

    const handleChange = (field: keyof Video, value: string | number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setFetchError('');
        setFetchSuccess(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSave(form);
    };

    const detectVideoType = (url: string): 'youtube' | 'bilibili' | 'local' => {
        const lower = url.toLowerCase();
        if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
        if (lower.includes('bilibili.com') || lower.includes('b23.tv')) return 'bilibili';
        return 'local';
    };

    const handleUrlChange = (url: string) => {
        setForm((prev) => ({
            ...prev,
            url,
            video_type: detectVideoType(url),
        }));
        setFetchError('');
        setFetchSuccess(false);
    };

    const handleFetchMetadata = async () => {
        if (!form.url) return;
        setFetching(true);
        setFetchError('');
        setFetchSuccess(false);
        try {
            const meta = await invoke<FetchedMeta>('fetch_video_metadata', { url: form.url });
            setForm((prev) => ({
                ...prev,
                title: meta.title || prev.title,
                author: meta.author || prev.author,
                author_url: meta.author_url || prev.author_url,
                thumbnail: meta.thumbnail || prev.thumbnail,
                description: meta.description || prev.description,
                duration: meta.duration || prev.duration,
            }));
            setFetchSuccess(true);
        } catch (err: any) {
            setFetchError(err?.toString() || '获取失败');
        } finally {
            setFetching(false);
        }
    };

    const canFetch = form.url && (form.video_type === 'youtube' || form.video_type === 'bilibili');

    const handleGenerateTags = async () => {
        if (!form.title && !form.description) {
            setTagError('请先填写标题或描述');
            return;
        }

        setGeneratingTags(true);
        setTagError('');
        try {
            const tags = await invoke<string[]>('generate_ai_tags', {
                title: form.title || '',
                description: form.description || '',
                transcript: '', // Empty for new videos
            });

            // Merge with existing tags, avoiding duplicates
            const existingTags = form.tags || [];
            const newTags = tags.filter((tag) => !existingTags.includes(tag));
            setForm((prev) => ({ ...prev, tags: [...existingTags, ...newTags] }));
        } catch (err: any) {
            setTagError(err?.toString() || '生成标签失败');
        } finally {
            setGeneratingTags(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEdit ? '编辑视频' : '添加视频'}</h2>
                    <button className="close-btn" onClick={onClose} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer' }}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Video Type Selector */}
                        <div className="video-type-selector">
                            <button type="button" className={`video-type-option ${form.video_type === 'local' ? 'active' : ''}`}
                                onClick={() => handleChange('video_type', 'local')}>
                                <span className="vt-icon">📁</span>本地视频
                            </button>
                            <button type="button" className={`video-type-option ${form.video_type === 'youtube' ? 'active' : ''}`}
                                onClick={() => handleChange('video_type', 'youtube')}>
                                <span className="vt-icon">▶️</span>YouTube
                            </button>
                            <button type="button" className={`video-type-option ${form.video_type === 'bilibili' ? 'active' : ''}`}
                                onClick={() => handleChange('video_type', 'bilibili')}>
                                <span className="vt-icon">📺</span>Bilibili
                            </button>
                        </div>

                        {form.video_type === 'local' ? (
                            <div className="form-group">
                                <label className="form-label">文件路径</label>
                                <input className="form-input" type="text" value={form.file_path || ''}
                                    onChange={(e) => handleChange('file_path', e.target.value)}
                                    placeholder="/path/to/video.mp4" />
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">
                                    {form.video_type === 'youtube' ? 'YouTube 链接' : 'Bilibili 链接'}
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input className="form-input" type="url" value={form.url || ''} style={{ flex: 1 }}
                                        onChange={(e) => handleUrlChange(e.target.value)}
                                        placeholder={form.video_type === 'youtube'
                                            ? 'https://www.youtube.com/watch?v=...'
                                            : 'https://www.bilibili.com/video/BV...'} />
                                    <button type="button" className="btn btn-primary" disabled={!canFetch || fetching}
                                        onClick={handleFetchMetadata}
                                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {fetching ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                                                获取中...
                                            </span>
                                        ) : '🔍 获取信息'}
                                    </button>
                                </div>
                                {fetchError && (
                                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>
                                        ⚠️ {fetchError}
                                    </div>
                                )}
                                {fetchSuccess && (
                                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        ✅ 已自动填充视频信息
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Thumbnail preview */}
                        {form.thumbnail && (
                            <div className="form-group">
                                <label className="form-label">封面预览</label>
                                <div style={{
                                    borderRadius: 'var(--radius-md)', overflow: 'hidden',
                                    border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                                    maxHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <img src={form.thumbnail} alt="thumbnail" style={{ width: '100%', objectFit: 'cover' }} />
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">标题 *</label>
                            <input className="form-input" type="text" value={form.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="输入视频标题" required />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">作者</label>
                                <input className="form-input" type="text" value={form.author}
                                    onChange={(e) => handleChange('author', e.target.value)}
                                    placeholder="视频作者" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">主题</label>
                                <input className="form-input" type="text" value={form.topic}
                                    onChange={(e) => handleChange('topic', e.target.value)}
                                    placeholder="如: React, Python, etc." />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">时长</label>
                                <input className="form-input" type="text" value={form.duration}
                                    onChange={(e) => handleChange('duration', e.target.value)}
                                    placeholder="如: 1:30:00" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">评分</label>
                                <div style={{ display: 'flex', gap: 4, paddingTop: 8 }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span key={star}
                                            onClick={() => handleChange('rating', star === form.rating ? 0 : star)}
                                            style={{ cursor: 'pointer', fontSize: 22, color: star <= form.rating ? 'var(--warning)' : 'var(--text-muted)', transition: 'color 150ms' }}>
                                            ★
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">描述</label>
                            <textarea className="form-textarea" value={form.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="视频简介或备注..." rows={3} />
                        </div>

                        {/* Tags */}
                        <div className="form-group">
                            <label className="form-label">
                                标签
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleGenerateTags}
                                    disabled={generatingTags || (!form.title && !form.description)}
                                    style={{
                                        marginLeft: 12,
                                        padding: '4px 12px',
                                        fontSize: 12,
                                        borderRadius: 6,
                                        border: '1px solid var(--accent)',
                                        background: generatingTags ? 'var(--bg-tertiary)' : 'rgba(99, 102, 241, 0.1)',
                                        color: generatingTags ? 'var(--text-muted)' : 'var(--accent)',
                                        cursor: generatingTags || (!form.title && !form.description) ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    {generatingTags ? (
                                        <>
                                            <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }}></span>
                                            生成中...
                                        </>
                                    ) : (
                                        <>✨ AI 生成标签</>
                                    )}
                                </button>
                            </label>
                            {tagError && (
                                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>
                                    ⚠️ {tagError}
                                </div>
                            )}
                            <div className="tag-input-area">
                                {form.tags.map((tag) => (
                                    <span key={tag} className="tag-chip">
                                        {tag}
                                        <button type="button" className="tag-chip-remove"
                                            onClick={() => setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))}
                                        >×</button>
                                    </span>
                                ))}
                                <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
                                    <input
                                        className="tag-input"
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => {
                                            setTagInput(e.target.value);
                                            setShowTagSuggestions(true);
                                        }}
                                        onFocus={() => setShowTagSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = tagInput.trim();
                                                if (val && !form.tags.includes(val)) {
                                                    setForm((prev) => ({ ...prev, tags: [...prev.tags, val] }));
                                                }
                                                setTagInput('');
                                                setShowTagSuggestions(false);
                                            }
                                        }}
                                        placeholder="输入标签后按回车..."
                                    />
                                    {showTagSuggestions && tagInput && (() => {
                                        const suggestions = allTags.filter(
                                            (t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !form.tags.includes(t)
                                        );
                                        if (suggestions.length === 0) return null;
                                        return (
                                            <div className="tag-suggestions">
                                                {suggestions.slice(0, 8).map((t) => (
                                                    <div key={t} className="tag-suggestion-item"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
                                                            setTagInput('');
                                                            setShowTagSuggestions(false);
                                                        }}
                                                    >
                                                        🏷️ {t}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
                        <button type="submit" className="btn btn-primary" disabled={!form.title.trim() || saving}>
                            {saving ? '保存中...' : isEdit ? '保存修改' : '添加视频'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
