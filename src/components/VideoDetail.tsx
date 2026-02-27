import { useState } from 'react';
import { Video } from '../types';
import VideoPlayer from './VideoPlayer';
import MarkdownRenderer from './MarkdownRenderer';

interface VideoDetailProps {
    video: Video;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSummarize: () => void;
    onTranslate: () => void;
    onToggleWatched: () => void;
    summarizing: boolean;
    translating: boolean;
}

export default function VideoDetail({
    video,
    onClose,
    onEdit,
    onDelete,
    onSummarize,
    onTranslate,
    onToggleWatched,
    summarizing,
    translating,
}: VideoDetailProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
                            <span className="meta-tag author">👤 {video.author}</span>
                            <span className="meta-tag topic">📂 {video.topic}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="detail-body">
                    <VideoPlayer video={video} />

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
                            <div className="detail-section-title">描述</div>
                            <div className="detail-section-content">{video.description}</div>
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
                            ) : video.ai_summary ? (
                                <div className="ai-summary-content">
                                    <MarkdownRenderer content={video.ai_summary} />
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
                                        onClick={onSummarize}
                                    >
                                        🔄 重新生成
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={onTranslate}
                                    >
                                        🌐 翻译为中文
                                    </button>
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
                </div>

                <div className="detail-actions">
                    <button className="btn btn-secondary" onClick={onToggleWatched}>
                        {video.is_watched ? '⏳ 标为未看' : '✅ 标为已看'}
                    </button>
                    <button className="btn btn-secondary" onClick={onEdit}>
                        ✏️ 编辑
                    </button>
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
