import { VIDEO_TYPE_ICONS } from '../types';

interface SidebarProps {
    activeView: string;
    onNavigate: (view: string) => void;
    authors: string[];
    topics: string[];
    allTags: string[];
    videoCount: number;
    onFilterAuthor: (author: string) => void;
    onFilterTopic: (topic: string) => void;
    onFilterTag: (tag: string) => void;
    activeAuthor: string;
    activeTopic: string;
    activeTag: string;
}

export default function Sidebar({
    activeView,
    onNavigate,
    authors,
    topics,
    allTags,
    videoCount,
    onFilterAuthor,
    onFilterTopic,
    onFilterTag,
    activeAuthor,
    activeTopic,
    activeTag,
}: SidebarProps) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-icon">🎬</div>
                    <h1>Video Vault</h1>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-title">导航</div>
                    <div
                        className={`nav-item ${activeView === 'all' && !activeAuthor && !activeTopic ? 'active' : ''}`}
                        onClick={() => { onNavigate('all'); onFilterAuthor(''); onFilterTopic(''); }}
                    >
                        <span className="icon">📚</span>
                        <span>全部视频</span>
                        <span className="badge">{videoCount}</span>
                    </div>
                    <div
                        className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
                        onClick={() => onNavigate('settings')}
                    >
                        <span className="icon">⚙️</span>
                        <span>设置</span>
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-section-title">视频类型</div>
                    {Object.entries(VIDEO_TYPE_ICONS).map(([type, icon]) => (
                        <div
                            key={type}
                            className={`nav-item ${activeView === `type:${type}` ? 'active' : ''}`}
                            onClick={() => { onNavigate(`type:${type}`); onFilterAuthor(''); onFilterTopic(''); }}
                        >
                            <span className="icon">{icon}</span>
                            <span>{type === 'local' ? '本地视频' : type === 'youtube' ? 'YouTube' : 'Bilibili'}</span>
                        </div>
                    ))}
                </div>

                {authors.length > 0 && (
                    <div className="nav-section">
                        <div className="nav-section-title">作者 ({authors.length})</div>
                        {authors.map((author) => (
                            <div
                                key={author}
                                className={`nav-item ${activeAuthor === author ? 'active' : ''}`}
                                onClick={() => { onFilterAuthor(author === activeAuthor ? '' : author); onFilterTopic(''); onNavigate('all'); }}
                            >
                                <span className="icon">👤</span>
                                <span className="truncate">{author}</span>
                            </div>
                        ))}
                    </div>
                )}

                {topics.length > 0 && (
                    <div className="nav-section">
                        <div className="nav-section-title">主题 ({topics.length})</div>
                        {topics.map((topic) => (
                            <div
                                key={topic}
                                className={`nav-item ${activeTopic === topic ? 'active' : ''}`}
                                onClick={() => { onFilterTopic(topic === activeTopic ? '' : topic); onFilterAuthor(''); onFilterTag(''); onNavigate('all'); }}
                            >
                                <span className="icon">📂</span>
                                <span className="truncate">{topic}</span>
                            </div>
                        ))}
                    </div>
                )}

                {allTags.length > 0 && (
                    <div className="nav-section">
                        <div className="nav-section-title">标签 ({allTags.length})</div>
                        {allTags.map((tag) => (
                            <div
                                key={tag}
                                className={`nav-item ${activeTag === tag ? 'active' : ''}`}
                                onClick={() => { onFilterTag(tag === activeTag ? '' : tag); onFilterAuthor(''); onFilterTopic(''); onNavigate('all'); }}
                            >
                                <span className="icon">🏷️</span>
                                <span className="truncate">{tag}</span>
                            </div>
                        ))}
                    </div>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="nav-item" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    <span className="icon">💾</span>
                    <span>Video Vault v0.1.0</span>
                </div>
            </div>
        </aside>
    );
}
