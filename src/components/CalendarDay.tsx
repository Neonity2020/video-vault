import { CalendarEvent } from '../types';

interface CalendarDayProps {
  date: string;
  day: number;
  events: CalendarEvent[];
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export default function CalendarDay({
  day,
  events,
  isToday,
  isSelected,
  onClick,
}: CalendarDayProps) {
  return (
    <div
      className={`calendar-day ${isToday ? 'today' : ''} ${
        isSelected ? 'selected' : ''
      }`}
      onClick={onClick}
    >
      <div className="calendar-day-number">{day}</div>
      <div className="calendar-day-events">
        {events.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className={`calendar-event-dot ${event.completed ? 'completed' : ''}`}
            title={event.title}
          >
            {event.title}
          </div>
        ))}
        {events.length > 3 && (
          <div className="calendar-event-more">
            +{events.length - 3} 更多
          </div>
        )}
      </div>
    </div>
  );
}
