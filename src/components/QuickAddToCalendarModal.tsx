import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CalendarEvent, DEFAULT_CALENDAR_EVENT } from '../types';

interface QuickAddToCalendarModalProps {
  videoId: number;
  videoTitle: string;
  videoAuthor: string;
  onClose: () => void;
  onSuccess: (selectedDate?: string) => void;
}

export default function QuickAddToCalendarModal({
  videoId,
  videoTitle,
  videoAuthor,
  onClose,
  onSuccess,
}: QuickAddToCalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newEvent: CalendarEvent = {
        ...DEFAULT_CALENDAR_EVENT,
        title: `学习：${videoTitle}`,
        description: `观看 ${videoAuthor} 的视频教程`,
        event_date: selectedDate,
        event_time: selectedTime,
        video_id: videoId,
      };

      await invoke('add_calendar_event', { event: newEvent });
      onSuccess(selectedDate);
      onClose();
    } catch (err: any) {
      alert(err?.toString() || '添加到日历失败');
    } finally {
      setSaving(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal quick-add-modal" onClick={handleModalClick}>
        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📅 添加到学习日历</h2>
            <button type="button" className="btn-close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="video-preview">
              <h3>{videoTitle}</h3>
              <p className="text-secondary">作者：{videoAuthor}</p>
            </div>

            <div className="form-group">
              <label className="form-label">选择日期 *</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getTodayDate()}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">选择时间（可选）</label>
              <input
                type="time"
                className="form-input"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                placeholder="例如：14:00"
              />
            </div>

            <p className="form-hint">
              💡 添加后可在日历中编辑详细设置（重复、提醒等）
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '添加中...' : '添加到日历'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
