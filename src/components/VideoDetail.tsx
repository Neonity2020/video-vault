import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Video } from '../types';
import VideoPlayer, { VideoPlayerRef } from './VideoPlayer';
import MarkdownRenderer from './MarkdownRenderer';

interface VideoDetailProps {
    video: Video;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSummarize: () => void;
    onTranslate: () => void;
    onTranslateDescription: () => void;
    onTranslateTimestamps: () => void;
    onToggleWatched: () => void;
    onUpdateTranscript: (transcript: string) => void;
    onUpdateTimestamps: (timestamps: string) => void;
    onAddToCalendar?: () => void;
    isVideoInCalendar?: boolean;
    onGenerateNote: () => void;
    onOpenNotesDir: () => void;
    generatingNote: boolean;
    summarizing: boolean;
    translating: boolean;
    translatingDescription: boolean;
    translatingTimestamps: boolean;
    savingTranscript: boolean;
    savingTimestamps: boolean;
}

export default function VideoDetail({
    video,
    onClose,
    onEdit,
    onDelete,
    onSummarize,
    onTranslate,
    onTranslateDescription,
    onTranslateTimestamps,
    onToggleWatched,
    onUpdateTranscript,
    onUpdateTimestamps,
    onAddToCalendar,
    isVideoInCalendar,
    onGenerateNote,
    onOpenNotesDir,
    generatingNote,
    summarizing,
    translating,
    translatingDescription,
    translatingTimestamps,
    savingTranscript,
    savingTimestamps,
}: VideoDetailProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEnglish, setShowEnglish] = useState(false);
    const [showEnglishDescription, setShowEnglishDescription] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [tempTranscript, setTempTranscript] = useState(video.transcript || '');
    const [isEditingTimestamps, setIsEditingTimestamps] = useState(false);
    const [tempTimestamps, setTempTimestamps] = useState(video.timestamps || '');
    const playerRef = useRef<VideoPlayerRef>(null);

    const openAuthorPage = async () => {
        if (video.author_url) {
            try {
                await invoke('plugin:opener|open_url', { url: video.author_url });
            } catch (err) {
                console.error('Failed to open author URL:', err);
            }
        }
    };

    const displayedSummary = showEnglish && video.ai_summary_en
        ? video.ai_summary_en
        : video.ai_summary;

    const displayedDescription = showEnglishDescription && video.description_en
        ? video.description_en
        : video.description;

    const renderTimestamps = (text: string) => {
        // Match HH:MM:SS or MM:SS
        const regex = /(?:(?:([0-5]?\d):)?([0-5]?\d):([0-5]\d))/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }

            const timeString = match[0];
            const hours = parseInt(match[1] || '0', 10);
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;

            parts.push(
                <span
                    key={match.index}
                    onClick={() => playerRef.current?.seekTo(totalSeconds)}
                    style={{
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px'
                    }}
                    title="点击跳转到视频的此时间"
                >
                    {timeString}
                </span>
            );
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };

    return (
        <>
            <div className="detail-overlay" onClick={onClose} />
            <div className="detail-panel">
                <div className="detail-header">
                    <div className="detail-header-info">
                        <h2>{video.title}</h2>
                        <div className="video-card-meta" style={{ marginTop: 4 }}>
                            <span className={`type-badge ${video.video_type}`}>
                                {video.video_type === 'youtube' ? 'YouTube' : video.video_type === 'bilibili' ? 'Bilibili' : '本地'}
                            </span>
                            {video.author_url ? (
                                <span className="meta-tag author author-link" onClick={openAuthorPage} title="打开UP主主页">
                                    👤 {video.author} ↗
                                </span>
                            ) : (
                                <span className="meta-tag author">👤 {video.author}</span>
                            )}
                            <span className="meta-tag topic">📂 {video.topic}</span>
                            {video.tags?.map((tag) => (
                                <span key={tag} className="meta-tag tag">🏷️ {tag}</span>
                            ))}
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="detail-body">
                    <VideoPlayer ref={playerRef} video={video} />

                    <div className="detail-meta-grid" style={{ marginBottom: 24 }}>
                        <div className="detail-meta-item">
                            <div className="label">时长</div>
                            <div className="value">{video.duration || '未设置'}</div>
                        </div>
                        <div className="detail-meta-item">
                            <div className="label">状态</div>
                            <div className="value">{video.is_watched ? '✅ 已观看' : '⏳ 未观看'}</div>
                        </div>
                        <div className="detail-meta-item">
                            <div className="label">评分</div>
                            <div className="value">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <span key={s} style={{ color: s <= video.rating ? 'var(--warning)' : 'var(--text-muted)' }}>★</span>
                                ))}
                            </div>
                        </div>
                        <div className="detail-meta-item">
                            <div className="label">添加时间</div>
                            <div className="value" style={{ fontSize: 12 }}>
                                {video.created_at ? new Date(video.created_at).toLocaleDateString('zh-CN') : '-'}
                            </div>
                        </div>
                    </div>

                    {video.description && (
                        <div className="detail-section">
                            <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>描述</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {video.description_en ? (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setShowEnglishDescription(!showEnglishDescription)}
                                        >
                                            {showEnglishDescription ? '🌐 切换为中文' : '🌐 切换为英文'}
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={onTranslateDescription}
                                            disabled={translatingDescription}
                                        >
                                            {translatingDescription ? '🌐 翻译中...' : '🌐 翻译为中文'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="detail-section-content" style={{ whiteSpace: 'pre-wrap' }}>{displayedDescription}</div>
                        </div>
                    )}

                    {video.url && video.video_type !== 'local' && (
                        <div className="detail-section">
                            <div className="detail-section-title">链接</div>
                            <div className="detail-section-content">
                                <a
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--accent-2)', wordBreak: 'break-all' }}
                                >
                                    {video.url}
                                </a>
                            </div>
                        </div>
                    )}

                    {video.file_path && video.video_type === 'local' && (
                        <div className="detail-section">
                            <div className="detail-section-title">文件路径</div>
                            <div className="detail-section-content" style={{ wordBreak: 'break-all', fontSize: 12, fontFamily: 'monospace' }}>
                                {video.file_path}
                            </div>
                        </div>
                    )}

                    <div className="detail-section">
                        <div className="ai-summary-section">
                            <div className="ai-header">
                                <span className="sparkle">✨</span>
                                <h3>AI 智能总结</h3>
                            </div>
                            {summarizing ? (
                                <div className="ai-loading">
                                    <div className="spinner"></div>
                                    <span>正在生成 AI 总结...</span>
                                </div>
                            ) : displayedSummary ? (
                                <div className="ai-summary-content">
                                    <MarkdownRenderer content={displayedSummary} />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>尚未生成 AI 总结</p>
                                    <button className="btn btn-primary btn-sm" onClick={onSummarize}>
                                        ✨ 生成 AI 总结
                                    </button>
                                </div>
                            )}
                            {video.ai_summary && !summarizing && !translating && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => { setShowEnglish(false); onSummarize(); }}
                                    >
                                        🔄 重新生成
                                    </button>
                                    {video.ai_summary_en ? (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setShowEnglish(!showEnglish)}
                                        >
                                            {showEnglish ? '🌐 切换为中文' : '🌐 切换为英文'}
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={onTranslate}
                                        >
                                            🌐 翻译为中文
                                        </button>
                                    )}
                                </div>
                            )}
                            {translating && (
                                <div className="ai-loading" style={{ marginTop: 12 }}>
                                    <div className="spinner"></div>
                                    <span>正在翻译为中文...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="detail-section">
                        <div className="ai-summary-section">
                            <div className="ai-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span className="sparkle">📝</span>
                                    <h3>视频逐字稿</h3>
                                </div>
                                {!isEditingTranscript && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            setTempTranscript(video.transcript || '');
                                            setIsEditingTranscript(true);
                                        }}
                                    >
                                        ✏️ 编辑
                                    </button>
                                )}
                            </div>
                            
                            {isEditingTranscript ? (
                                <div style={{ marginTop: 12 }}>
                                    <textarea
                                        value={tempTranscript}
                                        onChange={(e) => setTempTranscript(e.target.value)}
                                        placeholder="请在此粘贴视频的逐字稿文本..."
                                        style={{
                                            width: '100%',
                                            minHeight: '200px',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontFamily: 'inherit',
                                            fontSize: '13px',
                                            lineHeight: '1.6',
                                            resize: 'vertical',
                                            marginBottom: '12px'
                                        }}
                                        disabled={savingTranscript}
                                    />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => {
                                                onUpdateTranscript(tempTranscript);
                                                setIsEditingTranscript(false);
                                            }}
                                            disabled={savingTranscript}
                                        >
                                            {savingTranscript ? '保存中...' : '💾 保存'}
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => {
                                                setIsEditingTranscript(false);
                                                setTempTranscript(video.transcript || '');
                                            }}
                                            disabled={savingTranscript}
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            ) : savingTranscript ? (
                                <div className="ai-loading">
                                    <div className="spinner"></div>
                                    <span>正在保存逐字稿...</span>
                                </div>
                            ) : video.transcript ? (
                                <>
                                    <div
                                        className="transcript-content"
                                        style={{
                                            maxHeight: showTranscript ? 'none' : '150px',
                                            overflow: 'hidden',
                                            position: 'relative',
                                            fontSize: 13,
                                            lineHeight: 1.8,
                                            color: 'var(--text-secondary)',
                                            whiteSpace: 'pre-wrap',
                                            marginTop: 12,
                                        }}
                                    >
                                        {video.transcript}
                                        {!showTranscript && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: 60,
                                                background: 'linear-gradient(transparent, var(--bg-primary))',
                                            }} />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setShowTranscript(!showTranscript)}
                                        >
                                            {showTranscript ? '📖 收起' : '📖 展开全文'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 12 }}>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>尚未添加视频逐字稿，请点击编辑手动粘贴。</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="detail-section">
                        <div className="ai-summary-section">
                            <div className="ai-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span className="sparkle">⏱️</span>
                                    <h3>视频时间戳</h3>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {!isEditingTimestamps && video.timestamps && (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={onTranslateTimestamps}
                                            disabled={translatingTimestamps}
                                        >
                                            🌐 翻译时间戳
                                        </button>
                                    )}
                                    {!isEditingTimestamps && (
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => {
                                                setTempTimestamps(video.timestamps || '');
                                                setIsEditingTimestamps(true);
                                            }}
                                        >
                                            ✏️ 编辑
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {isEditingTimestamps ? (
                                <div style={{ marginTop: 12 }}>
                                    <textarea
                                        value={tempTimestamps}
                                        onChange={(e) => setTempTimestamps(e.target.value)}
                                        placeholder="例如：\n00:00 开场介绍\n01:30 核心功能演示\n05:45 总结"
                                        style={{
                                            width: '100%',
                                            minHeight: '150px',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontFamily: 'inherit',
                                            fontSize: '13px',
                                            lineHeight: '1.6',
                                            resize: 'vertical',
                                            marginBottom: '12px'
                                        }}
                                        disabled={savingTimestamps}
                                    />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => {
                                                onUpdateTimestamps(tempTimestamps);
                                                setIsEditingTimestamps(false);
                                            }}
                                            disabled={savingTimestamps}
                                        >
                                            {savingTimestamps ? '保存中...' : '💾 保存'}
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => {
                                                setIsEditingTimestamps(false);
                                                setTempTimestamps(video.timestamps || '');
                                            }}
                                            disabled={savingTimestamps}
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            ) : savingTimestamps ? (
                                <div className="ai-loading">
                                    <div className="spinner"></div>
                                    <span>正在保存时间戳...</span>
                                </div>
                            ) : translatingTimestamps ? (
                                <div className="ai-loading">
                                    <div className="spinner"></div>
                                    <span>正在翻译时间戳，请稍候...</span>
                                </div>
                            ) : video.timestamps ? (
                                <div
                                    className="transcript-content"
                                    style={{
                                        fontSize: 13,
                                        lineHeight: 1.8,
                                        color: 'var(--text-secondary)',
                                        whiteSpace: 'pre-wrap',
                                        marginTop: 12,
                                    }}
                                >
                                    {renderTimestamps(video.timestamps)}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 12 }}>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>尚未添加视频时间戳，请点击编辑手动粘贴。</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                    <div className="detail-section">
                        <div className="ai-summary-section">
                            <div className="ai-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span className="sparkle">📓</span>
                                    <h3>Obsidian 笔记</h3>
                                </div>
                                {video.note_path && !generatingNote && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={onOpenNotesDir}
                                        title="在文件管理器中打开笔记目录"
                                    >
                                        📂 打开目录
                                    </button>
                                )}
                            </div>
                            {generatingNote ? (
                                <div className="ai-loading" style={{ marginTop: 12 }}>
                                    <div className="spinner"></div>
                                    <span>正在生成 Obsidian 笔记...</span>
                                </div>
                            ) : video.note_path ? (
                                <div style={{ marginTop: 12 }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '10px 14px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'rgba(16, 185, 129, 0.08)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        marginBottom: 12,
                                    }}>
                                        <span style={{ color: 'var(--success)' }}>✓</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            笔记已生成，可用 Obsidian 打开
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={onGenerateNote}
                                        >
                                            🔄 重新生成
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 12 }}>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        尚未生成 Obsidian 笔记，点击下方按钮 AI 智能生成
                                    </p>
                                    <button className="btn btn-primary btn-sm" onClick={onGenerateNote}>
                                        📓 生成 Obsidian 笔记
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                <div className="detail-actions">
                    <button className="btn btn-secondary" onClick={onToggleWatched}>
                        {video.is_watched ? '⏳ 标为未看' : '✅ 标为已看'}
                    </button>
                    <button className="btn btn-secondary" onClick={onEdit}>
                        ✏️ 编辑
                    </button>
                    {onAddToCalendar && (
                        <button
                            className={`btn ${isVideoInCalendar ? 'btn-success' : 'btn-secondary'}`}
                            onClick={onAddToCalendar}
                        >
                            {isVideoInCalendar ? '✓ 已在日历中' : '📅 添加到日历'}
                        </button>
                    )}
                    {!showDeleteConfirm ? (
                        <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                            🗑️ 删除
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--danger)' }}>确认删除？</span>
                            <button className="btn btn-danger btn-sm" onClick={onDelete}>
                                确认
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteConfirm(false)}>
                                取消
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
