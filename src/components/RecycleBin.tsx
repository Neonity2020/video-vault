import { Video } from '../types';

interface RecycleBinProps {
  videos: Video[];
  onRestore: (id: number) => void;
  onPermanentDelete: (id: number) => void;
  onEmptyRecycleBin: () => void;
}

export default function RecycleBin({
  videos,
  onRestore,
  onPermanentDelete,
  onEmptyRecycleBin,
}: RecycleBinProps) {
  return (
    <div className="recycle-bin">
      <div className="recycle-bin-header">
        <h2>回收站</h2>
        {videos.length > 0 && (
          <button className="btn btn-danger" onClick={onEmptyRecycleBin}>
            🗑️ 清空回收站
          </button>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗑️</div>
          <h3>回收站为空</h3>
          <p>删除的视频会在这里显示</p>
        </div>
      ) : (
        <div className="recycle-bin-list">
          <p className="recycle-bin-count">共 {videos.length} 个已删除的视频</p>
          {videos.map((video) => (
            <div key={video.id} className="recycle-bin-item">
              <div className="recycle-bin-item-info">
                {video.cover_path ? (
                  <img
                    src={`assets/covers/${video.cover_path}`}
                    alt={video.title}
                    className="recycle-bin-thumbnail"
                  />
                ) : video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="recycle-bin-thumbnail"
                  />
                ) : (
                  <div className="recycle-bin-thumbnail placeholder">🎬</div>
                )}
                <div className="recycle-bin-details">
                  <h3 className="recycle-bin-title">{video.title}</h3>
                  <p className="recycle-bin-meta">
                    <span>{video.author}</span>
                    {video.deleted_at && (
                      <span> • 删除于 {new Date(video.deleted_at).toLocaleString('zh-CN')}</span>
                    )}
                  </p>
                  {video.description && (
                    <p className="recycle-bin-description">{video.description}</p>
                  )}
                </div>
              </div>
              <div className="recycle-bin-actions">
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => video.id && onRestore(video.id)}
                >
                  ♻️ 恢复
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => video.id && onPermanentDelete(video.id)}
                >
                  ✕ 永久删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
