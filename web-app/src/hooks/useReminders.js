import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { useFamily } from './useFamily';
import { createReminderNotification } from '../utils/notificationUtils';

export const useReminders = (events = []) => {
  const [user] = useAuthState(auth);
  const { familyData, userRole } = useFamily();
  const [activeReminders, setActiveReminders] = useState([]);
  const [scheduledTimers, setScheduledTimers] = useState(new Map());

  // Schedule reminders for events
  const scheduleReminders = useCallback(() => {
    if (!events || !user || !familyData || userRole !== 'aupair') return;

    // Clear existing timers
    scheduledTimers.forEach(timer => clearTimeout(timer));
    const newTimers = new Map();

    const now = new Date();
    const today = now.toDateString();

    events.forEach(event => {
      // Only create reminders for au pair responsibility events
      if (event.responsibility !== 'au_pair') return;

      // Only create reminders for today's events
      const eventDate = new Date(event.date || now);
      if (eventDate.toDateString() !== today) return;

      // Parse event time
      const eventTime = event.time || event.startTime;
      if (!eventTime) return;

      const [hours, minutes] = eventTime.split(':').map(Number);
      const eventDateTime = new Date();
      eventDateTime.setHours(hours, minutes, 0, 0);

      // Calculate reminder time (15 minutes before)
      const reminderTime = new Date(eventDateTime.getTime() - 15 * 60 * 1000);

      // If reminder time has already passed, skip
      if (reminderTime <= now) return;

      // If event has already started, skip
      if (eventDateTime <= now) return;

      // Schedule the reminder
      const timeoutDuration = reminderTime.getTime() - now.getTime();
      const timerId = setTimeout(() => {
        showReminder(event);
      }, timeoutDuration);

      newTimers.set(event.id, timerId);

      // Also schedule any transportation reminders
      if (event.travelTime && event.dropOffResponsibility === 'Au pair') {
        const leaveByTime = new Date(eventDateTime.getTime() - event.travelTime * 60 * 1000);
        const transportReminderTime = new Date(leaveByTime.getTime() - 5 * 60 * 1000); // 5 min before leave time

        if (transportReminderTime > now) {
          const transportTimeoutDuration = transportReminderTime.getTime() - now.getTime();
          const transportTimerId = setTimeout(() => {
            showTransportReminder(event, leaveByTime);
          }, transportTimeoutDuration);

          newTimers.set(`${event.id}-transport`, transportTimerId);
        }
      }
    });

    setScheduledTimers(newTimers);
  }, [events, user, familyData, userRole]);

  // Show a reminder
  const showReminder = async (event) => {
    try {
      // Create notification in database for persistence
      if (familyData) {
        await createReminderNotification(familyData.id, event, 15);
      }

      // Add to active reminders for immediate display
      const reminder = {
        id: `reminder-${event.id}-${Date.now()}`,
        type: 'reminder',
        eventId: event.id,
        eventTitle: event.title,
        eventTime: event.time || event.startTime,
        childId: event.childId,
        childName: event.childName,
        reminderTime: 15,
        timestamp: new Date()
      };

      setActiveReminders(prev => [...prev, reminder]);

      // Auto-dismiss after 30 seconds if not manually dismissed
      setTimeout(() => {
        dismissReminder(reminder.id);
      }, 30000);

    } catch (error) {
      console.error('Error showing reminder:', error);
    }
  };

  // Show transport reminder
  const showTransportReminder = async (event, leaveByTime) => {
    try {
      if (familyData) {
        await createReminderNotification(familyData.id, {
          ...event,
          travelTime: event.travelTime
        }, 5);
      }

      const reminder = {
        id: `transport-reminder-${event.id}-${Date.now()}`,
        type: 'transport_reminder',
        eventId: event.id,
        eventTitle: event.title,
        eventTime: event.time || event.startTime,
        childId: event.childId,
        childName: event.childName,
        reminderTime: 5,
        leaveByTime: leaveByTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        timestamp: new Date()
      };

      setActiveReminders(prev => [...prev, reminder]);

      // Auto-dismiss after 45 seconds for transport reminders
      setTimeout(() => {
        dismissReminder(reminder.id);
      }, 45000);

    } catch (error) {
      console.error('Error showing transport reminder:', error);
    }
  };

  // Dismiss a reminder
  const dismissReminder = (reminderId) => {
    setActiveReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  // Snooze a reminder
  const snoozeReminder = (reminderId, snoozeMinutes) => {
    const reminder = activeReminders.find(r => r.id === reminderId);
    if (!reminder) return;

    // Remove current reminder
    dismissReminder(reminderId);

    // Schedule new reminder
    setTimeout(() => {
      const snoozeText = snoozeMinutes === 1 ? '1 minute' : `${snoozeMinutes} minutes`;
      const snoozedReminder = {
        ...reminder,
        id: `snoozed-${reminder.id}-${Date.now()}`,
        reminderTime: snoozeMinutes,
        message: `${reminder.eventTitle} starts in ${snoozeText} (snoozed)`,
        timestamp: new Date()
      };

      setActiveReminders(prev => [...prev, snoozedReminder]);

      // Auto-dismiss snoozed reminder after 20 seconds
      setTimeout(() => {
        dismissReminder(snoozedReminder.id);
      }, 20000);

    }, snoozeMinutes * 60 * 1000);
  };

  // Schedule reminders when events change
  useEffect(() => {
    scheduleReminders();

    // Cleanup on unmount
    return () => {
      scheduledTimers.forEach(timer => clearTimeout(timer));
    };
  }, [scheduleReminders]);

  // Cleanup timers when component unmounts
  useEffect(() => {
    return () => {
      scheduledTimers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return {
    activeReminders,
    dismissReminder,
    snoozeReminder,
    scheduleReminders
  };
};