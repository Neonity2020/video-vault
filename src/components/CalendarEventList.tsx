import { useEffect, useState } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import { CalendarEvent } from '../types';

interface CalendarEventListProps {
  date: string;
  onClose: () => void;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: number) => void;
  onVideoClick?: (videoId: number) => void;
}

export default function CalendarEventList({
  date,
  onClose,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onVideoClick,
}: CalendarEventListProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { fetchEventsForDate, toggleCompleted } = useCalendar();

  useEffect(() => {
    loadEvents();
  }, [date]);

  const loadEvents = async () => {
    const result = await fetchEventsForDate(date);
    setEvents(result);
  };

  const handleToggleComplete = async (event: CalendarEvent) => {
    await toggleCompleted(event);
    await loadEvents();
  };

  const handleDelete = async (id: number) => {
    await onDeleteEvent(id);
    await loadEvents(); // Refresh the event list after deletion
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal event-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{formatDate(date)} 的事件</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {events.length === 0 ? (
            <div className="empty-state">
              <p>这一天没有安排事件</p>
              <button className="btn btn-primary" onClick={onAddEvent}>
                添加事件
              </button>
            </div>
          ) : (
            <div className="event-list">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`event-item ${event.completed ? 'completed' : ''}`}
                >
                  <div className="event-checkbox">
                    <input
                      type="checkbox"
                      checked={event.completed === 1}
                      onChange={() => handleToggleComplete(event)}
                    />
                  </div>
                  <div className="event-content" onClick={() => onEditEvent(event)}>
                    <h3 className="event-title">{event.title}</h3>
                    {event.event_time && (
                      <span className="event-time">🕐 {event.event_time}</span>
                    )}
                    {event.description && (
                      <p className="event-description">{event.description}</p>
                    )}
                    {event.video_id && (
                      <span
                        className="event-video-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVideoClick?.(event.video_id!);
                        }}
                      >
                        📺 关联视频
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => event.id && handleDelete(event.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {events.length > 0 && (
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onAddEvent}>
              添加新事件
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
