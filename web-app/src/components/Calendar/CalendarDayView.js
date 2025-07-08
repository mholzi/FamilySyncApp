import React, { useState, useEffect, useMemo } from 'react';
import CalendarEventCard from './CalendarEventCard';
import CalendarQuickAdd from './CalendarQuickAdd';
import CalendarChildSelector from './CalendarChildSelector';

const CalendarDayView = ({ 
  familyData, 
  children, 
  userData, 
  userRole,
  recurringActivities = [],
  selectedDate = new Date()
}) => {
  const [selectedChildren, setSelectedChildren] = useState('all');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [events, setEvents] = useState([]);
  const [timeRange, setTimeRange] = useState({ start: 7, end: 21 }); // Default 7 AM - 9 PM

  // Get all events for the selected date and children
  const dayEvents = useMemo(() => {
    const allEvents = [];
    
    // Get children to show events for
    const childrenToShow = selectedChildren === 'all' 
      ? children 
      : children.filter(child => selectedChildren.includes(child.id));

    childrenToShow.forEach(child => {
      // Add routine events
      const routines = getRoutineEvents(child, selectedDate);
      allEvents.push(...routines);

      // Add school events  
      const schoolEvents = getSchoolEvents(child, selectedDate);
      allEvents.push(...schoolEvents);

      // Add recurring activities
      const activityEvents = getRecurringActivityEvents(child, selectedDate, recurringActivities);
      allEvents.push(...activityEvents);

      // Add one-time events (would come from database)
      // const oneTimeEvents = getOneTimeEvents(child, selectedDate);
      // allEvents.push(...oneTimeEvents);
    });

    // Sort events by time
    return allEvents.sort((a, b) => a.startMinutes - b.startMinutes);
  }, [children, selectedChildren, selectedDate, recurringActivities]);

  // Calculate adaptive time range based on events
  useEffect(() => {
    if (dayEvents.length === 0) {
      setTimeRange({ start: 7, end: 21 });
      return;
    }

    const earliestEvent = Math.min(...dayEvents.map(e => Math.floor(e.startMinutes / 60)));
    const latestEvent = Math.max(...dayEvents.map(e => Math.ceil((e.startMinutes + e.duration) / 60)));
    
    // Add buffer hour before and after
    const start = Math.max(6, earliestEvent - 1);
    const end = Math.min(24, latestEvent + 1);
    
    setTimeRange({ start, end });
  }, [dayEvents]);

  // Generate hour markers for the timeline
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let hour = timeRange.start; hour <= timeRange.end; hour++) {
      markers.push({
        hour,
        label: formatHour(hour),
        position: ((hour - timeRange.start) / (timeRange.end - timeRange.start)) * 100
      });
    }
    return markers;
  }, [timeRange]);

  const handleQuickAdd = (eventData) => {
    // This would save to database
    console.log('Adding event:', eventData);
    setShowQuickAdd(false);
    // Refresh events after adding
  };

  const formatHour = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getEventPosition = (event) => {
    const hourHeight = 80; // Height per hour in pixels
    const startHour = (event.startMinutes / 60) - timeRange.start;
    const duration = event.duration / 60; // Convert to hours
    
    return {
      top: startHour * hourHeight,
      height: Math.max(duration * hourHeight, 40), // Minimum 40px height
      left: event.childIndex ? event.childIndex * 10 : 0 // Slight offset for overlapping
    };
  };

  const hasConflicts = (event) => {
    return dayEvents.some(otherEvent => 
      otherEvent.id !== event.id &&
      otherEvent.childId === event.childId &&
      ((event.startMinutes < otherEvent.startMinutes + otherEvent.duration) &&
       (event.startMinutes + event.duration > otherEvent.startMinutes))
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.dateSection}>
          <h2 style={styles.dateTitle}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <button style={styles.viewToggle}>
            Day
          </button>
        </div>
        <button 
          style={styles.addButton}
          onClick={() => setShowQuickAdd(true)}
        >
          + Event
        </button>
      </div>

      {/* Child Selector */}
      <CalendarChildSelector
        children={children}
        selectedChildren={selectedChildren}
        onSelectionChange={setSelectedChildren}
        userRole={userRole}
      />

      {/* Timeline View */}
      <div style={styles.timelineContainer}>
        {/* Hour markers */}
        <div style={styles.hourColumn}>
          {hourMarkers.map(marker => (
            <div key={marker.hour} style={styles.hourMarker}>
              <span style={styles.hourLabel}>{marker.label}</span>
            </div>
          ))}
        </div>

        {/* Events column */}
        <div style={styles.eventsColumn}>
          <div style={{
            ...styles.eventsArea,
            height: (timeRange.end - timeRange.start) * 80 // 80px per hour
          }}>
            {/* Hour grid lines */}
            {hourMarkers.map(marker => (
              <div 
                key={`line-${marker.hour}`} 
                style={{
                  ...styles.hourLine,
                  top: (marker.hour - timeRange.start) * 80
                }}
              />
            ))}

            {/* Events */}
            {dayEvents.map(event => {
              const position = getEventPosition(event);
              return (
                <div
                  key={event.id}
                  style={{
                    ...styles.eventContainer,
                    ...position
                  }}
                >
                  <CalendarEventCard
                    event={event}
                    hasConflict={hasConflicts(event)}
                    onEdit={() => console.log('Edit event:', event.id)}
                    userRole={userRole}
                  />
                </div>
              );
            })}

            {/* Empty state */}
            {dayEvents.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📅</div>
                <p style={styles.emptyText}>No events scheduled</p>
                <button 
                  style={styles.emptyButton}
                  onClick={() => setShowQuickAdd(true)}
                >
                  Add first event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <CalendarQuickAdd
          children={children}
          selectedDate={selectedDate}
          onSave={handleQuickAdd}
          onCancel={() => setShowQuickAdd(false)}
          userRole={userRole}
        />
      )}
    </div>
  );
};

// Helper functions for getting different types of events
const getRoutineEvents = (child, date) => {
  const routine = child.carePreferences?.dailyRoutine;
  if (!routine) return [];

  const events = [];
  
  // Wake up
  if (routine.wakeUpTime) {
    events.push(createEvent({
      id: `routine-wakeup-${child.id}`,
      title: 'Wake Up',
      startTime: routine.wakeUpTime,
      duration: 30,
      type: 'routine',
      category: 'Daily Routines',
      childId: child.id,
      childName: child.name,
      icon: '☀️',
      responsibility: 'au_pair'
    }));
  }

  // Meals
  if (routine.mealTimes) {
    if (routine.mealTimes.breakfast) {
      events.push(createEvent({
        id: `routine-breakfast-${child.id}`,
        title: 'Breakfast',
        startTime: routine.mealTimes.breakfast,
        duration: 30,
        type: 'routine',
        category: 'Daily Routines',
        childId: child.id,
        childName: child.name,
        icon: '🥣',
        responsibility: 'parent'
      }));
    }
    
    if (routine.mealTimes.lunch) {
      const lunchTimes = Array.isArray(routine.mealTimes.lunch) 
        ? routine.mealTimes.lunch 
        : [routine.mealTimes.lunch];
      
      lunchTimes.forEach((time, index) => {
        events.push(createEvent({
          id: `routine-lunch-${index}-${child.id}`,
          title: lunchTimes.length > 1 ? `Lunch ${index + 1}` : 'Lunch',
          startTime: time,
          duration: 30,
          type: 'routine',
          category: 'Daily Routines',
          childId: child.id,
          childName: child.name,
          icon: '🥗',
          responsibility: 'au_pair'
        }));
      });
    }
    
    if (routine.mealTimes.dinner) {
      events.push(createEvent({
        id: `routine-dinner-${child.id}`,
        title: 'Dinner',
        startTime: routine.mealTimes.dinner,
        duration: 45,
        type: 'routine',
        category: 'Daily Routines',
        childId: child.id,
        childName: child.name,
        icon: '🍽️',
        responsibility: 'parent'
      }));
    }
  }

  // Naps
  if (routine.napTimes && routine.napTimes.length > 0) {
    routine.napTimes.forEach((nap, index) => {
      if (nap.startTime) {
        events.push(createEvent({
          id: `routine-nap-${index}-${child.id}`,
          title: routine.napTimes.length > 1 ? `Nap ${index + 1}` : 'Nap Time',
          startTime: nap.startTime,
          duration: nap.duration || 90,
          type: 'routine',
          category: 'Daily Routines',
          childId: child.id,
          childName: child.name,
          icon: '😴',
          responsibility: 'au_pair'
        }));
      }
    });
  }

  // Bedtime
  if (routine.bedtime) {
    events.push(createEvent({
      id: `routine-bedtime-${child.id}`,
      title: 'Bedtime',
      startTime: routine.bedtime,
      duration: 30,
      type: 'routine',
      category: 'Daily Routines',
      childId: child.id,
      childName: child.name,
      icon: '🌙',
      responsibility: 'parent'
    }));
  }

  return events;
};

const getSchoolEvents = (child, date) => {
  if (!child.schoolSchedule) return [];

  const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const schedule = child.schoolSchedule[dayName];
  
  if (!schedule || schedule.length === 0) return [];

  const events = [];
  
  schedule.forEach((block, index) => {
    events.push(createEvent({
      id: `school-${index}-${child.id}`,
      title: 'School',
      startTime: block.startTime,
      duration: getTimeDifference(block.startTime, block.endTime),
      type: 'school',
      category: 'School/Kindergarten',
      childId: child.id,
      childName: child.name,
      icon: '🏫',
      responsibility: 'school',
      location: child.schoolSchedule.schoolName || 'School'
    }));
  });

  return events;
};

const getRecurringActivityEvents = (child, date, recurringActivities) => {
  const events = [];
  
  recurringActivities.forEach(activity => {
    if (activity.assignedChildren && activity.assignedChildren.includes(child.id)) {
      // Check if activity occurs on this date
      // This is simplified - you'd need proper recurring logic here
      const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
      
      if (activity.schedule && activity.schedule[dayName]) {
        activity.schedule[dayName].forEach((timeSlot, index) => {
          events.push(createEvent({
            id: `activity-${activity.id}-${index}-${child.id}`,
            title: activity.name,
            startTime: timeSlot.startTime,
            duration: timeSlot.duration || 60,
            type: 'activity',
            category: 'Activities',
            childId: child.id,
            childName: child.name,
            icon: activity.icon || '🏃',
            responsibility: activity.transportation?.dropoff || 'au_pair',
            location: activity.location?.name || activity.location?.address,
            notes: activity.notes,
            requiredItems: activity.requiredItems || []
          }));
        });
      }
    }
  });

  return events;
};

const createEvent = (eventData) => {
  const startMinutes = timeToMinutes(eventData.startTime);
  return {
    ...eventData,
    startMinutes,
    endMinutes: startMinutes + eventData.duration
  };
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const getTimeDifference = (startTime, endTime) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end - start;
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    fontFamily: 'var(--font-family-sans)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-5)',
    backgroundColor: 'var(--white)',
    borderBottom: '1px solid var(--border-light)',
    boxShadow: 'var(--shadow-sm)'
  },
  dateSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)'
  },
  dateTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0
  },
  viewToggle: {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--gray-100)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    cursor: 'pointer'
  },
  addButton: {
    padding: 'var(--space-3) var(--space-5)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'var(--transition-fast)'
  },
  timelineContainer: {
    flex: 1,
    display: 'flex',
    overflow: 'auto',
    backgroundColor: 'var(--white)'
  },
  hourColumn: {
    width: '80px',
    borderRight: '1px solid var(--border-light)',
    backgroundColor: 'var(--gray-50)'
  },
  hourMarker: {
    height: '80px',
    display: 'flex',
    alignItems: 'flex-start',
    padding: 'var(--space-2)',
    borderBottom: '1px solid var(--border-light)'
  },
  hourLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    fontWeight: 'var(--font-weight-medium)'
  },
  eventsColumn: {
    flex: 1,
    position: 'relative'
  },
  eventsArea: {
    position: 'relative',
    minHeight: '100%'
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '1px',
    backgroundColor: 'var(--border-light)',
    zIndex: 1
  },
  eventContainer: {
    position: 'absolute',
    left: 'var(--space-3)',
    right: 'var(--space-3)',
    zIndex: 2
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: 'var(--font-size-4xl)',
    marginBottom: 'var(--space-3)'
  },
  emptyText: {
    fontSize: 'var(--font-size-lg)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-4)'
  },
  emptyButton: {
    padding: 'var(--space-3) var(--space-5)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  }
};

export default CalendarDayView;