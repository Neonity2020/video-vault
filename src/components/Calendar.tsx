import { useState, useCallback, useEffect } from "react";
import { useCalendar } from "../hooks/useCalendar";
import CalendarDay from "./CalendarDay";
import CalendarEventForm from "./CalendarEventForm";
import CalendarEventList from "./CalendarEventList";
import { CalendarEvent, DEFAULT_CALENDAR_EVENT } from "../types";

interface CalendarProps {
  initialDate?: string | null;
  onInitialDateUsed?: () => void;
  onVideoClick?: (videoId: number) => void;
  initialEvent?: CalendarEvent | null;
}

export default function Calendar({
  initialDate,
  onInitialDateUsed,
  onVideoClick,
  initialEvent,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    events,
    fetchEvents,
    fetchEventsForDate,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useCalendar();

  // Fetch events for current month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    fetchEvents(
      firstDay.toISOString().split("T")[0],
      lastDay.toISOString().split("T")[0],
    );
  }, [currentDate, fetchEvents]);

  // Auto-select date when initialDate prop is provided
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
      // Also switch to that month if needed
      const date = new Date(initialDate);
      setCurrentDate(date);
      // Notify parent that initial date has been used
      onInitialDateUsed?.();
    }
  }, [initialDate, onInitialDateUsed]);

  // Open edit form when initialEvent prop is provided
  useEffect(() => {
    if (initialEvent) {
      setEditingEvent(initialEvent);
      setShowForm(true);
      // Switch to the event's date if needed
      const eventDate = new Date(initialEvent.event_date);
      setCurrentDate(eventDate);
      setSelectedDate(initialEvent.event_date);
      // Notify parent that initial event has been used
      onInitialDateUsed?.();
    }
  }, [initialEvent, onInitialDateUsed]);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = async (date: string) => {
    setSelectedDate(date);
    setShowForm(false);
  };

  const handleAddEvent = useCallback(() => {
    const newEvent: CalendarEvent = {
      ...DEFAULT_CALENDAR_EVENT,
      event_date: selectedDate || currentDate.toISOString().split("T")[0],
    };
    setEditingEvent(newEvent);
    setShowForm(true);
  }, [selectedDate, currentDate]);

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleSaveEvent = async (event: CalendarEvent) => {
    try {
      if (event.id) {
        await updateEvent(event);
      } else {
        await addEvent(event);
      }
      setShowForm(false);
      setEditingEvent(undefined);
      setRefreshKey((prev) => prev + 1); // Trigger refresh of event list
    } catch (err: any) {
      alert(err?.toString() || "操作失败");
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (confirm("确定要删除这个事件吗？")) {
      await deleteEvent(id);
      if (selectedDate) {
        await fetchEventsForDate(selectedDate);
      }
    }
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Fill empty cells at the beginning
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    // Fill days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = events.filter((e) => e.event_date === dateStr);
      const isToday = dateStr === new Date().toISOString().split("T")[0];
      const isSelected = dateStr === selectedDate;

      days.push(
        <CalendarDay
          key={dateStr}
          date={dateStr}
          day={day}
          events={dayEvents}
          isToday={isToday}
          isSelected={isSelected}
          onClick={() => handleDateClick(dateStr)}
        />,
      );
    }

    return days;
  };

  const monthNames = [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ];
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="btn btn-secondary" onClick={handlePrevMonth}>
            ← 上个月
          </button>
          <button className="btn btn-secondary" onClick={handleToday}>
            今天
          </button>
          <button className="btn btn-secondary" onClick={handleNextMonth}>
            下个月 →
          </button>
        </div>
        <h2 className="calendar-title">
          {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
        </h2>
        <button className="btn btn-primary" onClick={handleAddEvent}>
          ➕ 添加事件
        </button>
      </div>

      <div className="calendar-grid">
        {weekdays.map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
        {generateCalendarDays()}
      </div>

      {selectedDate && !showForm && (
        <CalendarEventList
          key={refreshKey}
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onAddEvent={handleAddEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          onVideoClick={onVideoClick}
        />
      )}

      {showForm && editingEvent && (
        <CalendarEventForm
          event={editingEvent}
          onSave={handleSaveEvent}
          onClose={() => {
            setShowForm(false);
            setEditingEvent(undefined);
          }}
        />
      )}
    </div>
  );
}
