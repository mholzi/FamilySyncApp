// Helper functions for getting different types of events
export const getRoutineEvents = (child, date) => {
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

export const getSchoolEvents = (child, date) => {
  if (!child.schoolSchedule) return [];

  // Check if this date falls within any school holidays
  if (child.holidays && isDateInHolidays(date, child.holidays)) {
    return []; // No school events during holidays
  }

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const schedule = child.schoolSchedule[dayName];
  
  if (!schedule || schedule.length === 0) return [];

  const events = [];
  
  schedule.forEach((block, index) => {
    const duration = getTimeDifference(block.startTime, block.endTime);
    
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
      location: child.schoolSchedule.schoolName || 'School',
      dropOffResponsibility: block.dropOffBy || '',
      pickUpResponsibility: block.pickUpBy || '',
      travelTime: block.travelTime || 0
    }));
  });

  return events;
};

export const getRecurringActivityEvents = (child, date, recurringActivities) => {
  const events = [];
  
  recurringActivities.forEach(activity => {
    if (activity.assignedChildren && activity.assignedChildren.includes(child.id)) {
      // Check if this activity should occur on this date
      if (shouldActivityOccurOnDate(activity, date)) {
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
          requiredItems: activity.requirements?.items || [],
          dropOffResponsibility: activity.transportation?.dropoff || '',
          pickUpResponsibility: activity.transportation?.pickup || '',
          travelTime: activity.travelTime || 0
        }));
      }
    }
  });

  return events;
};

export const shouldActivityOccurOnDate = (activity, date) => {
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

export const createEvent = (eventData) => {
  const startMinutes = timeToMinutes(eventData.startTime);
  const endMinutes = startMinutes + eventData.duration;
  return {
    ...eventData,
    time: eventData.startTime, // Add time field for compatibility
    startMinutes,
    endMinutes
  };
};

export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getTimeDifference = (startTime, endTime) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end - start;
};

// Check if a date falls within any school holidays
export const isDateInHolidays = (date, holidays) => {
  if (!holidays || holidays.length === 0) return false;
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return holidays.some(holiday => {
    if (holiday.type !== 'school') return false;
    
    const startDate = new Date(holiday.startDate);
    const endDate = new Date(holiday.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return checkDate >= startDate && checkDate <= endDate;
  });
};

// Get all events for a specific date and children
export const getAllEventsForDate = (children, selectedDate, recurringActivities, calendarEvents = []) => {
  const allEvents = [];
  
  children.forEach(child => {
    // Add routine events
    const routines = getRoutineEvents(child, selectedDate);
    allEvents.push(...routines);

    // Add school events  
    const schoolEvents = getSchoolEvents(child, selectedDate);
    allEvents.push(...schoolEvents);

    // Add recurring activities
    const activityEvents = getRecurringActivityEvents(child, selectedDate, recurringActivities);
    allEvents.push(...activityEvents);
  });

  // Add calendar events for the selected date
  if (calendarEvents && calendarEvents.length > 0) {
    const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const dayCalendarEvents = calendarEvents.filter(event => {
      try {
        // Handle Date objects from useCalendar hook
        if (event.startTime) {
          const eventDate = event.startTime instanceof Date ? event.startTime : 
                           event.startTime.toDate ? event.startTime.toDate() : 
                           new Date(event.startTime);
          const eventDateStr = eventDate.toISOString().split('T')[0];
          return eventDateStr === dateStr;
        }
        return false;
      } catch (error) {
        console.warn('Error processing event date:', error, event);
        return false;
      }
    }).map(event => {
      try {
        const startTime = event.startTime instanceof Date ? event.startTime :
                         event.startTime.toDate ? event.startTime.toDate() :
                         new Date(event.startTime);
        const timeStr = startTime.toTimeString().slice(0, 5); // HH:MM format
        const duration = event.duration || 60;
        
        // Handle child assignments - check both childrenIds and childId fields
        let childId = null;
        let childName = 'Family Event';
        
        if (event.childrenIds && event.childrenIds.length > 0) {
          childId = event.childrenIds[0];
        } else if (event.childId) {
          childId = event.childId;
        }
        
        if (childId && children && children.length > 0) {
          const child = children.find(c => c.id === childId);
          if (child) {
            childName = child.name;
          }
        }
        
        return createEvent({
          id: event.id,
          title: event.title || 'Untitled Event',
          startTime: timeStr,
          duration: duration,
          type: 'calendar_event',
          category: event.category || 'Events',
          childId: childId,
          childName: childName,
          icon: event.icon || '📅',
          responsibility: event.responsibility || 'parent',
          description: event.description,
          location: event.location,
          attendees: event.attendees || []
        });
      } catch (error) {
        console.warn('Error processing calendar event:', error, event);
        return null;
      }
    }).filter(event => event !== null);
    
    allEvents.push(...dayCalendarEvents);
  }

  // Sort events by time
  return allEvents.sort((a, b) => a.startMinutes - b.startMinutes);
};