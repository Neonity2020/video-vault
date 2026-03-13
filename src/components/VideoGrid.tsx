import { Video } from '../types';
import VideoCard from './VideoCard';

interface VideoGridProps {
    videos: Video[];
    loading: boolean;
    onVideoClick: (video: Video) => void;
    onAddVideo: () => void;
}

export default function VideoGrid({ videos, loading, onVideoClick, onAddVideo }: VideoGridProps) {
    if (loading) {
        return (
            <div className="empty-state">
                <div className="ai-loading">
                    <div className="spinner"></div>
                    <span>加载中...</span>
                </div>
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">🎬</div>
                <h3>还没有视频</h3>
                <p>添加你的第一个视频教程，开始管理你的学习资源吧！</p>
                <button className="btn btn-primary" onClick={onAddVideo}>
                    ➕ 添加视频
                </button>
            </div>
        );
    }

    return (
        <div className="video-grid">
            {videos.map((video) => (
                <VideoCard
                    key={video.id}
                    video={video}
                    onClick={() => onVideoClick(video)}
                />
            ))}
        </div>
    );
}
