import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CalendarEvent } from '../types';

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const result = await invoke<CalendarEvent[]>('get_calendar_events', {
        startDate,
        endDate,
      });
      setEvents(result);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEventsForDate = useCallback(async (date: string): Promise<CalendarEvent[]> => {
    try {
      return await invoke<CalendarEvent[]>('get_events_for_date', { date });
    } catch (err) {
      console.error('Failed to fetch events for date:', err);
      throw err;
    }
  }, []);

  const addEvent = useCallback(async (event: CalendarEvent): Promise<CalendarEvent> => {
    try {
      const result = await invoke<CalendarEvent>('add_calendar_event', { event });
      // Fetch events for the current month around the new event date
      const eventDate = new Date(event.event_date);
      const firstDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
      const lastDay = new Date(eventDate.getFullYear(), eventDate.getMonth() + 1, 0);

      await fetchEvents(
        firstDay.toISOString().split('T')[0],
        lastDay.toISOString().split('T')[0]
      );
      return result;
    } catch (err) {
      console.error('Failed to add event:', err);
      throw err;
    }
  }, [fetchEvents]);

  const updateEvent = useCallback(async (event: CalendarEvent) => {
    try {
      await invoke('update_calendar_event', { event });
      // Fetch events for the current month around the updated event date
      const eventDate = new Date(event.event_date);
      const firstDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
      const lastDay = new Date(eventDate.getFullYear(), eventDate.getMonth() + 1, 0);

      await fetchEvents(
        firstDay.toISOString().split('T')[0],
        lastDay.toISOString().split('T')[0]
      );
    } catch (err) {
      console.error('Failed to update event:', err);
      throw err;
    }
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (id: number) => {
    try {
      await invoke('delete_calendar_event', { id });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Failed to delete event:', err);
      throw err;
    }
  }, []);

  const toggleCompleted = useCallback(async (event: CalendarEvent) => {
    try {
      const updated = { ...event, completed: event.completed ? 0 : 1 };
      await invoke('update_calendar_event', { event: updated });
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? updated : e))
      );
    } catch (err) {
      console.error('Failed to toggle completed:', err);
      throw err;
    }
  }, []);

  return {
    events,
    loading,
    fetchEvents,
    fetchEventsForDate,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleCompleted,
  };
}
