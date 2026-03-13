import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CalendarEvent } from '../types';

export function useReminders() {
  const notifiedEvents = useRef<Set<number>>(new Set());

  useEffect(() => {
    const checkReminders = async () => {
      try {
        const events = await invoke<CalendarEvent[]>('check_reminders');

        for (const event of events) {
          if (event.id && !notifiedEvents.current.has(event.id)) {
            // Send system notification
            if (Notification.permission === 'granted') {
              new Notification('学习提醒', {
                body: `${event.title}\n${event.event_time ? event.event_time + ' ' : ''}${event.event_date}`,
                icon: '/assets/icon.png',
              });
            } else if (Notification.permission !== 'denied') {
              // Request permission and show notification
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                new Notification('学习提醒', {
                  body: `${event.title}\n${event.event_time ? event.event_time + ' ' : ''}${event.event_date}`,
                  icon: '/assets/icon.png',
                });
              }
            }

            // Mark as notified
            notifiedEvents.current.add(event.id);
          }
        }
      } catch (err) {
        console.error('Failed to check reminders:', err);
      }
    };

    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check every minute
    const interval = setInterval(checkReminders, 60000);

    // Initial check
    checkReminders();

    return () => clearInterval(interval);
  }, []);
}
