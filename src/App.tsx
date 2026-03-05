import { useState, useEffect, useCallback } from 'react';
import { useVideos, useSettings } from './hooks/useVideos';
import { Video, VideoFilter } from './types';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import VideoGrid from './components/VideoGrid';
import VideoDetail from './components/VideoDetail';
import VideoForm from './components/VideoForm';
import Settings from './components/Settings';
import './index.css';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const {
    videos,
    totalVideoCount,
    videoTypeCounts,
    loading,
    authors,
    topics,
    allTags,
    fetchVideos,
    fetchMeta,
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
  } = useVideos();
  const { settings, loading: savingSettings, saveSettings } = useSettings();

  const [activeView, setActiveView] = useState('all');
  const [search, setSearch] = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | undefined>(undefined);
  const [formSaving, setFormSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const [savingTimestamps, setSavingTimestamps] = useState(false);
  const [translatingTimestamps, setTranslatingTimestamps] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Build filter and fetch videos
  const applyFilters = useCallback(() => {
    const filter: VideoFilter = {};
    if (search) filter.search = search;
    if (filterAuthor) filter.author = filterAuthor;
    if (filterTopic) filter.topic = filterTopic;
    if (filterTag) filter.tags = [filterTag];

    // Handle type filter from sidebar navigation
    if (activeView.startsWith('type:')) {
      filter.video_type = activeView.replace('type:', '');
    } else if (filterType) {
      filter.video_type = filterType;
    }

    fetchVideos(filter);
  }, [search, filterAuthor, filterTopic, filterType, filterTag, activeView, fetchVideos]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const handleNavigate = (view: string) => {
    setActiveView(view);
    if (view === 'settings') return;
    if (!view.startsWith('type:')) {
      setFilterType('');
    }
    // Don't clear filterTag here - it's managed by Sidebar's onFilterTag
  };

  const handleAddVideo = () => {
    setEditingVideo(undefined);
    setShowForm(true);
  };

  const handleEditVideo = () => {
    if (selectedVideo) {
      setEditingVideo(selectedVideo);
      setShowForm(true);
    }
  };

  const handleSaveVideo = async (video: Video) => {
    setFormSaving(true);
    try {
      if (video.id) {
        await updateVideo(video);
        setSelectedVideo(video);
        showToast('视频已更新');
      } else {
        const newVideo = await addVideo(video);
        if (newVideo) {
          showToast('视频已添加');
        }
      }
      setShowForm(false);
      setEditingVideo(undefined);
    } catch (err: any) {
      showToast(err?.toString() || '操作失败', 'error');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideo?.id) return;
    try {
      await deleteVideo(selectedVideo.id);
      setSelectedVideo(null);
      showToast('视频已删除');
    } catch (err: any) {
      showToast(err?.toString() || '删除失败', 'error');
    }
  };

  const handleSummarize = async () => {
    if (!selectedVideo?.id) return;
    setSummarizing(true);
    try {
      await summarizeVideo(selectedVideo.id);
      const updatedVideo = await getVideo(selectedVideo.id);
      if (updatedVideo) {
        setSelectedVideo(updatedVideo);
      }
      showToast('AI 总结已生成');
    } catch (err: any) {
      showToast(err?.toString() || 'AI 总结生成失败', 'error');
    } finally {
      setSummarizing(false);
    }
  };

  const handleTranslate = async () => {
    if (!selectedVideo?.id) return;
    setTranslating(true);
    try {
      const originalEn = selectedVideo.ai_summary;
      const translated = await translateSummary(selectedVideo.id);
      setSelectedVideo((prev) => prev ? { ...prev, ai_summary: translated, ai_summary_en: originalEn } : null);
      showToast('已翻译为中文');
    } catch (err: any) {
      showToast(err?.toString() || '翻译失败', 'error');
    } finally {
      setTranslating(false);
    }
  };

  const handleTranslateTimestamps = async () => {
    if (!selectedVideo?.id) return;
    setTranslatingTimestamps(true);
    try {
      const translated = await translateTimestamps(selectedVideo.id);
      setSelectedVideo((prev) => prev ? { ...prev, timestamps: translated } : null);
      showToast('时间戳已翻译并保存');
    } catch (err: any) {
      showToast(err?.toString() || '翻译时间戳失败', 'error');
    } finally {
      setTranslatingTimestamps(false);
    }
  };

  const handleUpdateTranscript = async (transcript: string) => {
    if (!selectedVideo?.id) return;
    setFetchingTranscript(true); // Using this as saving state for transcript
    try {
      await updateVideoTranscript(selectedVideo.id, transcript);
      setSelectedVideo((prev) => prev ? { ...prev, transcript } : null);
      showToast('逐字稿已保存');
    } catch (err: any) {
      showToast(err?.toString() || '保存逐字稿失败', 'error');
    } finally {
      setFetchingTranscript(false);
    }
  };

  const handleUpdateTimestamps = async (timestamps: string) => {
    if (!selectedVideo?.id) return;
    setSavingTimestamps(true);
    try {
      await updateVideoTimestamps(selectedVideo.id, timestamps);
      setSelectedVideo((prev) => prev ? { ...prev, timestamps } : null);
      showToast('时间戳已保存');
    } catch (err: any) {
      showToast(err?.toString() || '保存时间戳失败', 'error');
    } finally {
      setSavingTimestamps(false);
    }
  };

  const handleToggleWatched = async () => {
    if (!selectedVideo?.id) return;
    const newVal = selectedVideo.is_watched ? 0 : 1;
    try {
      await toggleWatched(selectedVideo.id, newVal);
      setSelectedVideo((prev) => prev ? { ...prev, is_watched: newVal } : null);
    } catch (err: any) {
      showToast(err?.toString() || '操作失败', 'error');
    }
  };

  const getHeaderTitle = () => {
    if (activeView === 'settings') return '设置';
    if (activeView.startsWith('type:')) {
      const t = activeView.replace('type:', '');
      return t === 'local' ? '本地视频' : t === 'youtube' ? 'YouTube' : 'Bilibili';
    }
    if (filterAuthor) return `作者: ${filterAuthor}`;
    if (filterTopic) return `主题: ${filterTopic}`;
    if (filterTag) return `标签: ${filterTag}`;
    return '全部视频';
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        authors={authors}
        topics={topics}
        allTags={allTags}
        videoCount={totalVideoCount}
        videoTypeCounts={videoTypeCounts}
        onFilterAuthor={setFilterAuthor}
        onFilterTopic={setFilterTopic}
        onFilterTag={setFilterTag}
        activeAuthor={filterAuthor}
        activeTopic={filterTopic}
        activeTag={filterTag}
      />

      <div className="main-content">
        <header className="header">
          <h1 className="header-title">{getHeaderTitle()}</h1>
          {activeView !== 'settings' && (
            <>
              <SearchBar
                search={search}
                onSearchChange={setSearch}
                filterType={filterType}
                onFilterTypeChange={setFilterType}
              />
              <div className="header-actions">
                <button className="btn btn-primary" onClick={handleAddVideo}>
                  ➕ 添加视频
                </button>
              </div>
            </>
          )}
        </header>

        <div className="content-area">
          {activeView === 'settings' ? (
            <Settings
              settings={settings}
              onSave={saveSettings}
              saving={savingSettings}
            />
          ) : (
            <VideoGrid
              videos={videos}
              loading={loading}
              onVideoClick={(v) => setSelectedVideo(v)}
              onAddVideo={handleAddVideo}
            />
          )}
        </div>
      </div>

      {selectedVideo && (
        <VideoDetail
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onEdit={handleEditVideo}
          onDelete={handleDeleteVideo}
          onSummarize={handleSummarize}
          onTranslate={handleTranslate}
          onTranslateTimestamps={handleTranslateTimestamps}
          onToggleWatched={handleToggleWatched}
          onUpdateTranscript={handleUpdateTranscript}
          onUpdateTimestamps={handleUpdateTimestamps}
          summarizing={summarizing}
          translating={translating}
          translatingTimestamps={translatingTimestamps}
          savingTranscript={fetchingTranscript}
          savingTimestamps={savingTimestamps}
        />
      )}

      {showForm && (
        <VideoForm
          video={editingVideo}
          onSave={handleSaveVideo}
          onClose={() => { setShowForm(false); setEditingVideo(undefined); }}
          saving={formSaving}
          allTags={allTags}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
