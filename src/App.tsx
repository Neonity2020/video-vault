import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideos, useSettings } from './hooks/useVideos';
import { useReminders } from './hooks/useReminders';
import { Video, VideoFilter, CalendarEvent } from './types';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import VideoGrid from './components/VideoGrid';
import VideoDetail from './components/VideoDetail';
import VideoForm from './components/VideoForm';
import Settings from './components/Settings';
import Calendar from './components/Calendar';
import RecycleBin from './components/RecycleBin';
import QuickAddToCalendarModal from './components/QuickAddToCalendarModal';
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
    restoreVideo,
    permanentDeleteVideo,
    emptyRecycleBin,
    toggleWatched,
    summarizeVideo,
    translateSummary,
    translateTimestamps,
    updateVideoTranscript,
    updateVideoTimestamps,
    getVideo,
    generateObsidianNote,
    openNotesDir,
  } = useVideos();
  const { settings, loading: savingSettings, saveSettings } = useSettings();
  useReminders(); // Enable reminder notifications

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
  const [generatingNote, setGeneratingNote] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [calendarInitialDate, setCalendarInitialDate] = useState<string | null>(null);
  const [calendarInitialEvent, setCalendarInitialEvent] = useState<CalendarEvent | null>(null);
  const [videosInCalendar, setVideosInCalendar] = useState<Set<number>>(new Set());

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

    // Handle recycle bin view
    if (activeView === 'recycle-bin') {
      filter.include_deleted = true;
    }

    fetchVideos(filter);
  }, [search, filterAuthor, filterTopic, filterType, filterTag, activeView, fetchVideos]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  // Check if video is in calendar when selectedVideo changes
  useEffect(() => {
    const checkVideoInCalendar = async () => {
      if (selectedVideo?.id !== undefined) {
        const videoId = selectedVideo.id;
        try {
          const isInCalendar = await invoke<boolean>('is_video_in_calendar', { videoId });
          if (isInCalendar) {
            setVideosInCalendar(prev => new Set(prev).add(videoId));
          } else {
            setVideosInCalendar(prev => {
              const newSet = new Set(prev);
              newSet.delete(videoId);
              return newSet;
            });
          }
        } catch (err) {
          console.error('Failed to check if video is in calendar:', err);
        }
      }
    };
    checkVideoInCalendar();
  }, [selectedVideo]);

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

  const handleGenerateNote = async () => {
    if (!selectedVideo?.id) return;
    setGeneratingNote(true);
    try {
      await generateObsidianNote(selectedVideo.id);
      const updatedVideo = await getVideo(selectedVideo.id);
      if (updatedVideo) {
        setSelectedVideo(updatedVideo);
      }
      showToast('Obsidian 笔记已生成');
    } catch (err: any) {
      showToast(err?.toString() || 'Obsidian 笔记生成失败', 'error');
    } finally {
      setGeneratingNote(false);
    }
  };

  const handleOpenNotesDir = async () => {
    if (!selectedVideo?.id || !selectedVideo?.note_path) return;
    try {
      await openNotesDir(selectedVideo.id, selectedVideo.note_path);
    } catch (err: any) {
      showToast(err?.toString() || '打开笔记目录失败', 'error');
    }
  };

  const handleAddToCalendar = async () => {
    if (!selectedVideo?.id) return;

    // Check if video is already in calendar
    if (videosInCalendar.has(selectedVideo.id)) {
      try {
        const event = await invoke<CalendarEvent>('get_video_calendar_event', { videoId: selectedVideo.id });
        if (event) {
          setCalendarInitialEvent(event);
          setActiveView('calendar');
          setSelectedVideo(null);
        }
      } catch (err) {
        console.error('Failed to get video calendar event:', err);
        showToast('获取日历事件失败', 'error');
      }
    } else {
      // Show quick add modal
      setShowQuickAddModal(true);
    }
  };

  const handleQuickAddSuccess = (selectedDate?: string) => {
    showToast('已添加到学习日历');
    // Mark the video as being in calendar
    if (selectedVideo?.id !== undefined) {
      setVideosInCalendar(prev => new Set(prev).add(selectedVideo.id!));
    }
    setSelectedVideo(null);
    if (selectedDate) {
      setCalendarInitialDate(selectedDate);
    }
    setActiveView('calendar');
  };

  const handleCalendarInitialDateUsed = () => {
    setCalendarInitialDate(null);
    setCalendarInitialEvent(null);
  };

  const handleCalendarVideoClick = async (videoId: number) => {
    try {
      // Try to get video from current list first
      const video = videos.find((v) => v.id === videoId);

      if (video) {
        setSelectedVideo(video);
      } else {
        // If not in current list, fetch it directly
        const fetchedVideo = await getVideo(videoId);
        setSelectedVideo(fetchedVideo);
      }

      // Switch back to video view
      setActiveView('all');
    } catch (err) {
      console.error('Failed to load video:', err);
      showToast('无法加载视频', 'error');
    }
  };

  const handleRestoreVideo = async (id: number) => {
    try {
      await restoreVideo(id);
      showToast('视频已恢复');
    } catch (err: any) {
      showToast(err?.toString() || '恢复失败', 'error');
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (confirm('确定要永久删除这个视频吗？此操作无法撤销！')) {
      try {
        await permanentDeleteVideo(id);
        showToast('视频已永久删除');
      } catch (err: any) {
        showToast(err?.toString() || '删除失败', 'error');
      }
    }
  };

  const handleEmptyRecycleBin = async () => {
    if (confirm('确定要清空回收站吗？此操作将永久删除所有已删除的视频，无法撤销！')) {
      try {
        const count = await emptyRecycleBin();
        showToast(`已清空回收站，删除了 ${count} 个视频`);
      } catch (err: any) {
        showToast(err?.toString() || '清空回收站失败', 'error');
      }
    }
  };

  const getHeaderTitle = () => {
    if (activeView === 'settings') return '设置';
    if (activeView === 'recycle-bin') return '回收站';
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
          ) : activeView === 'calendar' ? (
            <Calendar
              initialDate={calendarInitialDate}
              onInitialDateUsed={handleCalendarInitialDateUsed}
              onVideoClick={handleCalendarVideoClick}
              initialEvent={calendarInitialEvent}
            />
          ) : activeView === 'recycle-bin' ? (
            <RecycleBin
              videos={videos}
              onRestore={handleRestoreVideo}
              onPermanentDelete={handlePermanentDelete}
              onEmptyRecycleBin={handleEmptyRecycleBin}
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
          onAddToCalendar={handleAddToCalendar}
          isVideoInCalendar={selectedVideo.id !== undefined && videosInCalendar.has(selectedVideo.id)}
          onGenerateNote={handleGenerateNote}
          onOpenNotesDir={handleOpenNotesDir}
          generatingNote={generatingNote}
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

      {showQuickAddModal && selectedVideo?.id && (
        <QuickAddToCalendarModal
          videoId={selectedVideo.id}
          videoTitle={selectedVideo.title}
          videoAuthor={selectedVideo.author}
          onClose={() => setShowQuickAddModal(false)}
          onSuccess={handleQuickAddSuccess}
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
