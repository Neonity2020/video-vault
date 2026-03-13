import { useState, useEffect } from 'react';
import { CalendarEvent, DEFAULT_CALENDAR_EVENT, REPEAT_TYPE_LABELS } from '../types';

interface CalendarEventFormProps {
  event?: CalendarEvent;
  onSave: (event: CalendarEvent) => void;
  onClose: () => void;
  videoId?: number;
}

export default function CalendarEventForm({
  event,
  onSave,
  onClose,
  videoId,
}: CalendarEventFormProps) {
  const [form, setForm] = useState<CalendarEvent>(event || { ...DEFAULT_CALENDAR_EVENT });

  useEffect(() => {
    if (event) setForm(event);
  }, [event]);

  useEffect(() => {
    if (videoId && !form.video_id) {
      setForm((prev) => ({ ...prev, video_id: videoId }));
    }
  }, [videoId, form.video_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.event_date) return;
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>{event?.id ? '编辑事件' : '添加事件'}</h2>
            <button type="button" className="btn-close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">标题 *</label>
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="事件标题"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">描述</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="事件描述"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">日期 *</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">时间</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.event_time}
                  onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">持续时间（分钟）</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.duration_minutes || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duration_minutes: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="60"
                  min="1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">提醒（分钟）</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.reminder_minutes || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reminder_minutes: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="15"
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">重复</label>
              <select
                className="form-select"
                value={form.repeat_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    repeat_type: e.target.value as CalendarEvent['repeat_type'],
                  })
                }
              >
                {Object.entries(REPEAT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {form.repeat_type !== 'none' && (
              <div className="form-group">
                <label className="form-label">重复直到</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.repeat_until || ''}
                  onChange={(e) => setForm({ ...form, repeat_until: e.target.value || undefined })}
                  min={form.event_date}
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {event?.id ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
