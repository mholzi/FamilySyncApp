import React, { useState, useEffect, useMemo } from 'react';
import CalendarEventCard from './CalendarEventCard';
import CalendarQuickAdd from './CalendarQuickAdd';
import CalendarChildSelector from './CalendarChildSelector';

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

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const schedule = child.schoolSchedule[dayName];
  
  if (!schedule || schedule.length === 0) return [];

  const events = [];
  
  schedule.forEach((block, index) => {
    console.log(`School block for ${child.name}:`, block);
    const duration = getTimeDifference(block.startTime, block.endTime);
    console.log(`Calculated duration: ${duration} minutes`);
    
    events.push(createEvent({
      id: `school-${index}-${child.id}`,
      title: 'School',
      startTime: block.startTime,
      duration: duration,
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
      // Check if activity occurs on this date using the recurrence pattern
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      console.log(`Checking activity ${activity.name} for ${child.name} on ${dayName}:`, activity);
      
      // Check if this activity should occur on this date
      if (shouldActivityOccurOnDate(activity, date)) {
        console.log(`Activity ${activity.name} occurs on ${dayName}`);
        
        events.push(createEvent({
          id: `activity-${activity.id}-${child.id}`,
          title: activity.name,
          startTime: activity.time,
          duration: activity.duration || 60,
          type: 'activity',
          category: 'Activities',
          childId: child.id,
          childName: child.name,
          icon: activity.icon || '🏃',
          responsibility: activity.transportation?.dropoff || 'au_pair',
          location: activity.location?.name || activity.location?.address,
          notes: activity.requirements?.notes || activity.notes,
          requiredItems: activity.requirements?.items || []
        }));
      }
    }
  });

  return events;
};

const shouldActivityOccurOnDate = (activity, date) => {
  try {
    if (!activity || !activity.recurrence || !date) {
      return false;
    }

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    switch (activity.recurrence.type) {
      case 'weekly':
        return Array.isArray(activity.recurrence.days) && activity.recurrence.days.includes(dayName);
        
      case 'biweekly':
        // Check if it's the right week (need start date for this)
        if (!activity.recurrence.startDate && !activity.startDate) return false;
        try {
          const startDate = new Date(activity.recurrence.startDate || activity.startDate);
          const weeksDiff = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000));
          return weeksDiff % 2 === 0 && Array.isArray(activity.recurrence.days) && activity.recurrence.days.includes(dayName);
        } catch (error) {
          console.warn('Error calculating biweekly occurrence:', error);
          return false;
        }
        
      case 'monthly':
        if (activity.recurrence.monthType === 'same_date') {
          const startDate = activity.recurrence.startDate || activity.startDate;
          if (!startDate) return false;
          try {
            const start = new Date(startDate);
            return date.getDate() === start.getDate();
          } catch (error) {
            console.warn('Error calculating monthly occurrence:', error);
            return false;
          }
        }
        return false;
        
      default:
        return false;
    }
  } catch (error) {
    console.warn('Error checking activity occurrence:', error);
    return false;
  }
};

const createEvent = (eventData) => {
  const startMinutes = timeToMinutes(eventData.startTime);
  const endMinutes = startMinutes + eventData.duration;
  console.log(`Creating event ${eventData.title}: start=${eventData.startTime} (${startMinutes}min), duration=${eventData.duration}min, end=${endMinutes}min`);
  return {
    ...eventData,
    startMinutes,
    endMinutes
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
  const duration = end - start;
  console.log(`getTimeDifference: ${startTime} to ${endTime} = ${duration} minutes`);
  return duration;
};

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
  const [timeRange, setTimeRange] = useState({ start: 7, end: 21 }); // Default 7 AM - 9 PM

  // Get all events for the selected date and children
  const dayEvents = useMemo(() => {
    const allEvents = [];
    
    // Get children to show events for
    const childrenToShow = selectedChildren === 'all' 
      ? children 
      : children.filter(child => selectedChildren.includes(child.id));

    console.log('CalendarDayView - children:', children);
    console.log('CalendarDayView - childrenToShow:', childrenToShow);
    console.log('CalendarDayView - recurringActivities:', recurringActivities);

    childrenToShow.forEach(child => {
      console.log(`Processing child ${child.name}:`, child);
      
      // Add routine events
      const routines = getRoutineEvents(child, selectedDate);
      console.log(`Routines for ${child.name}:`, routines);
      allEvents.push(...routines);

      // Add school events  
      const schoolEvents = getSchoolEvents(child, selectedDate);
      console.log(`School events for ${child.name}:`, schoolEvents);
      allEvents.push(...schoolEvents);

      // Add recurring activities
      const activityEvents = getRecurringActivityEvents(child, selectedDate, recurringActivities);
      console.log(`Activity events for ${child.name}:`, activityEvents);
      allEvents.push(...activityEvents);

      // Add one-time events (would come from database)
      // const oneTimeEvents = getOneTimeEvents(child, selectedDate);
      // allEvents.push(...oneTimeEvents);
    });

    console.log('All events for the day:', allEvents);
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

  const formatHour = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

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

  // Calculate layout for overlapping events
  const getEventLayout = useMemo(() => {
    const hourHeight = 80; // Height per hour in pixels
    const eventLayouts = [];
    
    // Group events by time overlap
    const sortedEvents = [...dayEvents].sort((a, b) => a.startMinutes - b.startMinutes);
    
    sortedEvents.forEach(event => {
      const startHour = (event.startMinutes / 60) - timeRange.start;
      const duration = event.duration / 60; // Convert to hours
      
      console.log(`Layout for ${event.title}: startMinutes=${event.startMinutes}, duration=${event.duration}min (${duration}h), startHour=${startHour}`);
      
      // Find overlapping events
      const overlappingEvents = sortedEvents.filter(otherEvent => 
        otherEvent.startMinutes < event.startMinutes + event.duration &&
        otherEvent.startMinutes + otherEvent.duration > event.startMinutes
      );
      
      // Calculate column position
      const columnIndex = overlappingEvents.findIndex(e => e.id === event.id);
      const totalColumns = overlappingEvents.length;
      const columnWidth = totalColumns > 1 ? 100 / totalColumns : 100;
      
      const layout = {
        eventId: event.id,
        top: startHour * hourHeight,
        height: Math.max(duration * hourHeight, 40), // Minimum 40px height
        left: `${columnIndex * columnWidth}%`,
        width: `${columnWidth - (totalColumns > 1 ? 2 : 0)}%`, // Small gap between columns
        zIndex: 10 + columnIndex
      };
      
      console.log(`Layout result for ${event.title}:`, layout);
      eventLayouts.push(layout);
    });
    
    return eventLayouts;
  }, [dayEvents, timeRange]);

  const getEventPosition = (event) => {
    const layout = getEventLayout.find(layout => layout.eventId === event.id);
    return layout || {
      top: 0,
      height: 40,
      left: '0%',
      width: '100%',
      zIndex: 10
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
    paddingLeft: 'var(--space-2)',
    paddingRight: 'var(--space-2)',
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