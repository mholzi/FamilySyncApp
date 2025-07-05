import { useState, useEffect } from 'react';
import EnhancedCalendar from './EnhancedCalendar';
import PreparationChecklist from './PreparationChecklist';

function SmartCalendarView({ children, familyData, userData }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPreparation, setShowPreparation] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);

  // Check for upcoming events and send notifications
  useEffect(() => {
    if (scheduleData) {
      checkUpcomingEvents();
    }
  }, [scheduleData]);

  // Set up interval to check for departure reminders
  useEffect(() => {
    const interval = setInterval(checkDepartureReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [scheduleData]);

  const checkUpcomingEvents = () => {
    if (!scheduleData?.schedule) return;

    const now = new Date();
    const todayKey = getTodayKey();
    const todaySchedule = scheduleData.schedule[todayKey];

    if (!todaySchedule) return;

    const upcomingEvents = todaySchedule.events
      .filter(event => {
        const eventTime = parseEventTime(event.startTime);
        const timeDiff = eventTime - now;
        return timeDiff > 0 && timeDiff <= 30 * 60 * 1000; // Next 30 minutes
      })
      .sort((a, b) => parseEventTime(a.startTime) - parseEventTime(b.startTime));

    if (upcomingEvents.length > 0) {
      generateUpcomingEventNotifications(upcomingEvents);
    }
  };

  const checkDepartureReminders = () => {
    if (!scheduleData?.schedule) return;

    const now = new Date();
    const todayKey = getTodayKey();
    const todaySchedule = scheduleData.schedule[todayKey];

    if (!todaySchedule) return;

    todaySchedule.events.forEach(event => {
      if (event.metadata?.travelTime) {
        const eventTime = parseEventTime(event.startTime);
        const departureTime = new Date(eventTime.getTime() - (event.metadata.travelTime * 60 * 1000));
        const timeToDeparture = departureTime - now;

        // Notify 5 minutes before departure time
        if (timeToDeparture > 0 && timeToDeparture <= 5 * 60 * 1000) {
          addNotification({
            id: `departure-${event.id}`,
            type: 'departure',
            event,
            message: `Time to leave for ${event.title} in 5 minutes!`,
            departureTime: formatTime(departureTime),
            urgency: 'high'
          });
        }
        
        // Notify 15 minutes before for preparation
        else if (timeToDeparture > 5 * 60 * 1000 && timeToDeparture <= 15 * 60 * 1000) {
          addNotification({
            id: `prepare-${event.id}`,
            type: 'preparation',
            event,
            message: `Start preparing for ${event.title}`,
            departureTime: formatTime(departureTime),
            urgency: 'medium'
          });
        }
      }
    });
  };

  const generateUpcomingEventNotifications = (events) => {
    events.forEach(event => {
      const eventTime = parseEventTime(event.startTime);
      const minutesUntil = Math.round((eventTime - new Date()) / (60 * 1000));

      addNotification({
        id: `upcoming-${event.id}`,
        type: 'upcoming',
        event,
        message: `${event.title} starts in ${minutesUntil} minutes`,
        urgency: minutesUntil <= 10 ? 'high' : 'medium'
      });
    });
  };

  const addNotification = (notification) => {
    setNotifications(prev => {
      // Avoid duplicate notifications
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;

      return [...prev, { ...notification, timestamp: new Date() }];
    });

    // Auto-remove notification after 5 minutes
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5 * 60 * 1000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleEventSelect = (event, day, childData) => {
    setSelectedEvent({ event, day, childData });
    
    // Show preparation checklist for events that require preparation
    if (event.metadata?.preparation?.length > 0 || 
        event.metadata?.equipment?.length > 0 || 
        event.type === 'activity' || 
        event.type === 'school') {
      setShowPreparation(true);
    }
  };

  const handleScheduleUpdate = (newScheduleData) => {
    setScheduleData(newScheduleData);
  };

  const handlePreparationComplete = (completionData) => {
    console.log('Preparation completed:', completionData);
    
    // Store completion data (could be saved to database)
    const preparationRecord = {
      ...completionData,
      childId: selectedEvent.childData.id,
      familyId: userData.familyId
    };

    // Show success notification
    addNotification({
      id: `prep-complete-${selectedEvent.event.id}`,
      type: 'success',
      message: `✓ Ready for ${selectedEvent.event.title}!`,
      urgency: 'low'
    });

    setShowPreparation(false);
    setSelectedEvent(null);
  };

  const handleNotificationAction = (notification) => {
    if (notification.type === 'preparation') {
      // Open preparation checklist
      setSelectedEvent({
        event: notification.event,
        day: getTodayKey(),
        childData: children.find(child => child.id === notification.event.childId)
      });
      setShowPreparation(true);
    }
    
    removeNotification(notification.id);
  };

  const getTodayKey = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  };

  const parseEventTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getNotificationStyle = (urgency) => {
    switch (urgency) {
      case 'high':
        return { ...styles.notification, ...styles.notificationHigh };
      case 'medium':
        return { ...styles.notification, ...styles.notificationMedium };
      case 'low':
        return { ...styles.notification, ...styles.notificationLow };
      default:
        return styles.notification;
    }
  };

  return (
    <div style={styles.container}>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={styles.notificationsContainer}>
          {notifications.map(notification => (
            <div
              key={notification.id}
              style={getNotificationStyle(notification.urgency)}
              onClick={() => handleNotificationAction(notification)}
            >
              <div style={styles.notificationContent}>
                <div style={styles.notificationMessage}>
                  {notification.message}
                </div>
                {notification.departureTime && (
                  <div style={styles.notificationTime}>
                    Departure: {notification.departureTime}
                  </div>
                )}
              </div>
              <button
                style={styles.notificationClose}
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Overview */}
      {scheduleData?.metadata && (
        <div style={styles.scheduleOverview}>
          <div style={styles.overviewTitle}>Today's Schedule Overview</div>
          <div style={styles.overviewStats}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{scheduleData.metadata.averageActivitiesPerDay}</span>
              <span style={styles.statLabel}>Avg Activities/Day</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{scheduleData.metadata.totalFreeTimeHours}h</span>
              <span style={styles.statLabel}>Free Time</span>
            </div>
            <div style={styles.stat}>
              <span style={{
                ...styles.statValue,
                color: scheduleData.metadata.balanceScore >= 80 ? '#4CAF50' : 
                       scheduleData.metadata.balanceScore >= 60 ? '#FF9800' : '#F44336'
              }}>
                {scheduleData.metadata.balanceScore}
              </span>
              <span style={styles.statLabel}>Balance Score</span>
            </div>
          </div>
          
          {scheduleData.conflicts?.length > 0 && (
            <div style={styles.conflictsAlert}>
              ⚠️ {scheduleData.conflicts.length} scheduling conflicts detected
            </div>
          )}
        </div>
      )}

      {/* Enhanced Calendar */}
      <EnhancedCalendar
        children={children}
        familyData={familyData}
        onEventSelect={handleEventSelect}
        onScheduleUpdate={handleScheduleUpdate}
      />

      {/* Preparation Checklist Modal */}
      {showPreparation && selectedEvent && (
        <PreparationChecklist
          event={selectedEvent.event}
          childData={selectedEvent.childData}
          onComplete={handlePreparationComplete}
          onClose={() => {
            setShowPreparation(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <button style={styles.quickAction}>
          📅 Add Event
        </button>
        <button style={styles.quickAction}>
          🔄 Regenerate Week
        </button>
        <button style={styles.quickAction}>
          📊 Schedule Analytics
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  notificationsContainer: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '350px'
  },

  notification: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer',
    border: '2px solid',
    animation: 'slideIn 0.3s ease'
  },

  notificationHigh: {
    borderColor: '#FF5252',
    backgroundColor: '#FFEBEE'
  },

  notificationMedium: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF8E1'
  },

  notificationLow: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8'
  },

  notificationContent: {
    flex: 1
  },

  notificationMessage: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '4px'
  },

  notificationTime: {
    fontSize: '12px',
    color: '#666'
  },

  notificationClose: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  scheduleOverview: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },

  overviewTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '15px'
  },

  overviewStats: {
    display: 'flex',
    gap: '30px',
    marginBottom: '15px'
  },

  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },

  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#007AFF'
  },

  statLabel: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'center'
  },

  conflictsAlert: {
    padding: '12px',
    backgroundColor: '#FFEBEE',
    borderRadius: '8px',
    color: '#D32F2F',
    fontSize: '14px',
    fontWeight: '500'
  },

  quickActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '20px',
    flexWrap: 'wrap'
  },

  quickAction: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#007AFF',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  }
};

// Add CSS animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  if (!document.head.querySelector('style[data-smart-calendar]')) {
    style.setAttribute('data-smart-calendar', 'true');
    document.head.appendChild(style);
  }
}

export default SmartCalendarView;