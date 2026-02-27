import { Video } from '../types';

interface VideoCardProps {
    video: Video;
    onClick: () => void;
}

export default function VideoCard({ video, onClick }: VideoCardProps) {
    const typeClass = video.video_type || 'local';
    const typeLabel = video.video_type === 'youtube' ? 'YouTube' : video.video_type === 'bilibili' ? 'Bilibili' : '本地';

    return (
        <div className="video-card" onClick={onClick}>
            <div className="video-card-thumbnail">
                {video.thumbnail && (
                    <img src={video.thumbnail} alt="" style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                    }} />
                )}
                <span className={`type-badge ${typeClass}`}>{typeLabel}</span>
                {video.is_watched === 1 && <span className="watched-badge">✓ 已观看</span>}
                <div className="play-icon">▶</div>
                {video.duration && <span className="duration-badge">{video.duration}</span>}
            </div>

            <div className="video-card-body">
                <div className="video-card-title">{video.title}</div>
                <div className="video-card-meta">
                    <span className="meta-tag author">👤 {video.author}</span>
                    <span className="meta-tag topic">📂 {video.topic}</span>
                </div>
                {video.description && (
                    <div className="video-card-desc">{video.description}</div>
                )}
            </div>

            <div className="video-card-footer">
                <div className="rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <span
                            key={star}
                            className={`star ${star <= video.rating ? 'active' : ''}`}
                        >
                            ★
                        </span>
                    ))}
                </div>
                {video.ai_summary && (
                    <span className="ai-badge">
                        ✨ AI 总结
                    </span>
                )}
            </div>
        </div>
    );
}
