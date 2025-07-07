import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { getNextOccurrences } from '../../utils/recurringActivityTemplates';

// Import child color utility from EnhancedChildCard
const CHILD_COLORS = [
  { primary: '#7C3AED', light: '#EDE9FE' }, // Purple
  { primary: '#EC4899', light: '#FCE7F3' }, // Pink
  { primary: '#F59E0B', light: '#FEF3C7' }, // Amber
  { primary: '#10B981', light: '#D1FAE5' }, // Emerald
  { primary: '#3B82F6', light: '#DBEAFE' }, // Blue
  { primary: '#06B6D4', light: '#E0F2FE' }, // Cyan
  { primary: '#8B5CF6', light: '#F3E8FF' }, // Violet
  { primary: '#F97316', light: '#FED7AA' }, // Orange
];

const getChildColor = (childId, index = 0) => {
  if (!childId) return CHILD_COLORS[index % CHILD_COLORS.length];
  
  let hash = 0;
  for (let i = 0; i < childId.length; i++) {
    hash = ((hash << 5) - hash) + childId.charCodeAt(i);
    hash = hash & hash;
  }
  
  const colorIndex = Math.abs(hash) % CHILD_COLORS.length;
  return CHILD_COLORS[colorIndex];
};

const UpcomingEventsForMe = ({ 
  children = [], 
  userRole = 'aupair',
  activities = [],
  familyId = null,
  maxEvents = 5 
}) => {
  const [recurringActivities, setRecurringActivities] = useState([]);
  const [babysittingRequests, setBabysittingRequests] = useState([]);

  // Fetch recurring activities from Firestore
  useEffect(() => {
    if (!familyId) {
      setRecurringActivities([]);
      return;
    }

    let unsubscribe = null;

    try {
      const activitiesQuery = query(
        collection(db, 'recurringActivities'),
        where('familyId', '==', familyId),
        where('isActive', '==', true)
      );

      unsubscribe = onSnapshot(
        activitiesQuery, 
        (snapshot) => {
          try {
            const activitiesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setRecurringActivities(activitiesData);
          } catch (error) {
            console.warn('Error processing recurring activities snapshot:', error);
            setRecurringActivities([]);
          }
        },
        (error) => {
          console.warn('Error fetching recurring activities:', error);
          setRecurringActivities([]);
        }
      );
    } catch (error) {
      console.warn('Error setting up recurring activities listener:', error);
      setRecurringActivities([]);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from recurring activities:', error);
        }
      }
    };
  }, [familyId]);

  // Fetch accepted babysitting requests from Firestore
  useEffect(() => {
    if (!familyId) {
      setBabysittingRequests([]);
      return;
    }

    let unsubscribe = null;

    try {
      const requestsQuery = query(
        collection(db, 'families', familyId, 'timeOffRequests'),
        where('status', '==', 'accepted'),
        where('type', '==', 'babysitting')
      );

      unsubscribe = onSnapshot(
        requestsQuery, 
        (snapshot) => {
          try {
            const requestsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setBabysittingRequests(requestsData);
          } catch (error) {
            console.warn('Error processing babysitting requests snapshot:', error);
            setBabysittingRequests([]);
          }
        },
        (error) => {
          console.warn('Error fetching babysitting requests:', error);
          setBabysittingRequests([]);
        }
      );
    } catch (error) {
      console.warn('Error setting up babysitting requests listener:', error);
      setBabysittingRequests([]);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from babysitting requests:', error);
        }
      }
    };
  }, [familyId]);
  // Convert time string "HH:MM" to minutes since midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr;
  };

  // Get user initials for child indicator
  const getUserInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get all upcoming events for the au pair from all children
  const getUpcomingEvents = () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDate = new Date().toDateString();
    
    const eventGroups = new Map(); // For grouping similar events

    // Helper function to add event to groups
    const addEventToGroup = (eventData) => {
      // Create a grouping key based on title, time, type, and day
      const groupKey = `${eventData.title}-${eventData.time}-${eventData.type}-${eventData.isToday}`;
      
      if (eventGroups.has(groupKey)) {
        // Add child to existing group only if not already present
        const existingGroup = eventGroups.get(groupKey);
        const childExists = existingGroup.children.some(childData => childData.child.id === eventData.child.id);
        
        if (!childExists) {
          existingGroup.children.push({
            child: eventData.child,
            childColor: eventData.childColor
          });
        }
      } else {
        // Create new group
        eventGroups.set(groupKey, {
          ...eventData,
          children: [{
            child: eventData.child,
            childColor: eventData.childColor
          }],
          id: groupKey // Use group key as ID
        });
      }
    };

    // Process routine events from all children
    children.forEach((child, childIndex) => {
      const routine = child.carePreferences?.dailyRoutine;
      if (!routine) return;

      const responsibilities = routine.responsibilities || {
        wakeUp: 'au_pair',
        breakfast: 'au_pair',
        lunch: 'au_pair',
        dinner: 'shared',
        snacks: 'au_pair',
        naps: 'au_pair',
        bedtime: 'parent'
      };

      // Filter based on user role
      const shouldShow = (activity) => {
        if (userRole === 'parent') return true;
        return responsibilities[activity] === 'au_pair' || responsibilities[activity] === 'shared';
      };

      const childColor = getChildColor(child.id, childIndex);

      // Add wake up
      if (routine.wakeUpTime && shouldShow('wakeUp')) {
        const eventTime = timeToMinutes(routine.wakeUpTime);
        if (eventTime > currentTime) {
          addEventToGroup({
            title: 'Wake Up',
            time: routine.wakeUpTime,
            minutes: eventTime,
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: true,
            description: 'Help children wake up and get ready for the day',
            location: null,
            additionalInfo: null
          });
        }
      }

      // Add breakfast
      if (routine.mealTimes?.breakfast && shouldShow('breakfast')) {
        const eventTime = timeToMinutes(routine.mealTimes.breakfast);
        if (eventTime > currentTime) {
          addEventToGroup({
            title: 'Breakfast',
            time: routine.mealTimes.breakfast,
            minutes: eventTime,
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: true,
            description: 'Prepare and serve breakfast',
            location: null,
            additionalInfo: 'Check if there are any special dietary requirements for today'
          });
        }
      }

      // Add lunch times
      if (routine.mealTimes?.lunch && shouldShow('lunch')) {
        const lunchTimes = Array.isArray(routine.mealTimes.lunch) 
          ? routine.mealTimes.lunch 
          : [routine.mealTimes.lunch];
        
        lunchTimes.forEach((lunchTime, index) => {
          const eventTime = timeToMinutes(lunchTime);
          if (eventTime > currentTime) {
            addEventToGroup({
              title: lunchTimes.length > 1 ? `Lunch ${index + 1}` : 'Lunch',
              time: lunchTime,
              minutes: eventTime,
              child: child,
              childColor: childColor,
              type: 'routine',
              isToday: true,
              description: 'Prepare lunch',
              location: null,
              additionalInfo: routine.mealTimes.lunch.length === 0 ? 'Usually provided at school' : null
            });
          }
        });
      }

      // Add dinner
      if (routine.mealTimes?.dinner && shouldShow('dinner')) {
        const eventTime = timeToMinutes(routine.mealTimes.dinner);
        if (eventTime > currentTime) {
          addEventToGroup({
            title: 'Dinner',
            time: routine.mealTimes.dinner,
            minutes: eventTime,
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: true,
            description: 'Help prepare dinner',
            location: null,
            additionalInfo: responsibilities.dinner === 'shared' ? 'Coordinate with parents' : null
          });
        }
      }

      // Add snacks
      if (routine.mealTimes?.snacks && shouldShow('snacks')) {
        routine.mealTimes.snacks.forEach((snackTime, index) => {
          const eventTime = timeToMinutes(snackTime);
          if (eventTime > currentTime) {
            addEventToGroup({
              title: routine.mealTimes.snacks.length > 1 ? `Snack ${index + 1}` : 'Snack',
              time: snackTime,
              minutes: eventTime,
              child: child,
              childColor: childColor,
              type: 'routine',
              isToday: true,
              description: 'Prepare snack',
              location: null,
              additionalInfo: null
            });
          }
        });
      }

      // Add nap times
      if (routine.napTimes && routine.napTimes.length > 0 && shouldShow('naps')) {
        routine.napTimes.forEach((nap, index) => {
          if (nap.startTime) {
            const eventTime = timeToMinutes(nap.startTime);
            if (eventTime > currentTime) {
              addEventToGroup({
                title: routine.napTimes.length > 1 ? `Nap ${index + 1}` : 'Nap Time',
                time: nap.startTime,
                minutes: eventTime,
                child: child,
                childColor: childColor,
                type: 'routine',
                isToday: true,
                description: 'Put children down for nap',
                location: null,
                additionalInfo: `Duration: ${nap.duration} minutes${nap.isFlexible ? ' (flexible timing)' : ''}`
              });
            }
          }
        });
      }

      // Add bedtime
      if (routine.bedtime && shouldShow('bedtime')) {
        const eventTime = timeToMinutes(routine.bedtime);
        if (eventTime > currentTime) {
          addEventToGroup({
            title: 'Bedtime',
            time: routine.bedtime,
            minutes: eventTime,
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: true,
            description: 'Help with bedtime routine',
            location: null,
            additionalInfo: responsibilities.bedtime === 'shared' ? 'Coordinate with parents' : null
          });
        }
      }
    });

    // Add activities from the activities prop
    activities.forEach((activity) => {
      const child = children.find(c => c.id === activity.childId);
      if (!child) return;

      const childColor = getChildColor(child.id);
      const eventTime = timeToMinutes(activity.schedule?.startTime);
      
      // Check if it's today and upcoming
      const activityDate = activity.date ? new Date(activity.date).toDateString() : currentDate;
      const isToday = activityDate === currentDate;
      const isUpcoming = isToday && eventTime > currentTime;

      if (isUpcoming) {
        addEventToGroup({
          title: activity.name,
          time: activity.schedule?.startTime,
          minutes: eventTime,
          child: child,
          childColor: childColor,
          type: 'activity',
          isToday: true,
          description: activity.description || `${activity.name} activity`,
          location: activity.location?.address || activity.location?.name,
          additionalInfo: activity.requirements?.preparation?.length > 0 
            ? `Bring: ${activity.requirements.preparation.join(', ')}` 
            : activity.notes
        });
      }
    });

    // Add recurring activities
    recurringActivities.forEach((activity) => {
      try {
        // Get next few occurrences of this activity
        const occurrences = getNextOccurrences(activity, 3);
        
        occurrences.forEach(occurrence => {
          try {
            const eventTime = timeToMinutes(occurrence.time);
            const occurrenceDate = occurrence.date.toDateString();
            const isToday = occurrenceDate === currentDate;
            
            // Only show today's events that are upcoming, or tomorrow's first few events
            if ((isToday && eventTime > currentTime) || !isToday) {
              // Process each assigned child for this activity
              if (activity.assignedChildren && activity.assignedChildren.length > 0) {
                activity.assignedChildren.forEach(childId => {
                  const child = children.find(c => c.id === childId);
                  if (!child) return;

                  const childColor = getChildColor(child.id);
                  
                  addEventToGroup({
                    title: activity.name || 'Unnamed Activity',
                    time: occurrence.time,
                    minutes: eventTime,
                    child: child,
                    childColor: childColor,
                    type: 'recurring_activity',
                    isToday: isToday,
                    description: `${activity.name || 'Activity'} ${activity.contact?.role ? `with ${activity.contact.role}` : ''}`,
                    location: activity.location?.address || activity.location?.name || null,
                    additionalInfo: activity.requirements?.items?.length > 0 
                      ? `Bring: ${activity.requirements.items.filter(Boolean).join(', ')}` 
                      : activity.requirements?.notes || null
                  });
                });
              } else {
                // If no specific children assigned, add as general family activity
                // Use first child for color consistency or create a default
                const defaultChild = children[0];
                if (defaultChild) {
                  const childColor = getChildColor(defaultChild.id);
                  
                  addEventToGroup({
                    title: activity.name || 'Unnamed Activity',
                    time: occurrence.time,
                    minutes: eventTime,
                    child: defaultChild,
                    childColor: childColor,
                    type: 'recurring_activity',
                    isToday: isToday,
                    description: `${activity.name || 'Activity'} ${activity.contact?.role ? `with ${activity.contact.role}` : ''}`,
                    location: activity.location?.address || activity.location?.name || null,
                    additionalInfo: activity.requirements?.items?.length > 0 
                      ? `Bring: ${activity.requirements.items.filter(Boolean).join(', ')}` 
                      : activity.requirements?.notes || null
                  });
                }
              }
            }
          } catch (error) {
            console.warn('Error processing activity occurrence:', error, occurrence);
          }
        });
      } catch (error) {
        console.warn('Error processing recurring activity:', error, activity);
      }
    });

    // Add accepted babysitting requests
    babysittingRequests.forEach((request) => {
      try {
        const startTime = request.startTime?.toDate ? request.startTime.toDate() : new Date(request.startTime);
        const endTime = request.endTime?.toDate ? request.endTime.toDate() : new Date(request.endTime);
        const eventTime = timeToMinutes(startTime.toTimeString().slice(0, 5)); // Format HH:MM
        const requestDate = startTime.toDateString();
        const isToday = requestDate === currentDate;
        
        // Only show today's events that are upcoming, or future events
        if ((isToday && eventTime > currentTime) || startTime > new Date()) {
          // Process each child for babysitting
          if (request.children === 'all') {
            children.forEach(child => {
              const childColor = getChildColor(child.id);
              
              addEventToGroup({
                title: 'Babysitting',
                time: startTime.toTimeString().slice(0, 5), // Format HH:MM
                minutes: eventTime,
                child: child,
                childColor: childColor,
                type: 'babysitting',
                isToday: isToday,
                description: request.description || 'Babysitting session',
                location: null,
                additionalInfo: `Until ${endTime.toTimeString().slice(0, 5)}`
              });
            });
          } else if (Array.isArray(request.children)) {
            request.children.forEach(childId => {
              const child = children.find(c => c.id === childId);
              if (!child) return;
              
              const childColor = getChildColor(child.id);
              
              addEventToGroup({
                title: 'Babysitting',
                time: startTime.toTimeString().slice(0, 5), // Format HH:MM
                minutes: eventTime,
                child: child,
                childColor: childColor,
                type: 'babysitting',
                isToday: isToday,
                description: request.description || 'Babysitting session',
                location: null,
                additionalInfo: `Until ${endTime.toTimeString().slice(0, 5)}`
              });
            });
          }
        }
      } catch (error) {
        console.warn('Error processing babysitting request:', error, request);
      }
    });

    // Add tomorrow's events if we need more to reach maxEvents
    if (eventGroups.size < maxEvents) {
      children.forEach((child, childIndex) => {
        const routine = child.carePreferences?.dailyRoutine;
        if (!routine) return;

        const responsibilities = routine.responsibilities || {
          wakeUp: 'au_pair',
          breakfast: 'au_pair',
          lunch: 'au_pair',
          dinner: 'shared',
          snacks: 'au_pair',
          naps: 'au_pair',
          bedtime: 'parent'
        };

        const shouldShow = (activity) => {
          if (userRole === 'parent') return true;
          return responsibilities[activity] === 'au_pair' || responsibilities[activity] === 'shared';
        };

        const childColor = getChildColor(child.id, childIndex);

        // Add tomorrow's wake up
        if (routine.wakeUpTime && shouldShow('wakeUp')) {
          addEventToGroup({
            title: 'Wake Up',
            time: routine.wakeUpTime,
            minutes: timeToMinutes(routine.wakeUpTime),
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: false,
            description: 'Help children wake up and get ready for the day',
            location: null,
            additionalInfo: null
          });
        }

        // Add tomorrow's breakfast
        if (routine.mealTimes?.breakfast && shouldShow('breakfast')) {
          addEventToGroup({
            title: 'Breakfast',
            time: routine.mealTimes.breakfast,
            minutes: timeToMinutes(routine.mealTimes.breakfast),
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: false,
            description: 'Prepare and serve breakfast',
            location: null,
            additionalInfo: 'Check if there are any special dietary requirements for tomorrow'
          });
        }
      });
    }

    // Convert grouped events to array and sort by time (today's events first, then tomorrow's) and limit to maxEvents
    const sortedEvents = Array.from(eventGroups.values())
      .sort((a, b) => {
        if (a.isToday && !b.isToday) return -1;
        if (!a.isToday && b.isToday) return 1;
        return a.minutes - b.minutes;
      })
      .slice(0, maxEvents);

    return sortedEvents;
  };

  const upcomingEvents = getUpcomingEvents();

  if (upcomingEvents.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Upcoming Events for Me</h3>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎯</div>
          <p style={styles.emptyText}>No upcoming events</p>
          <p style={styles.emptySubtext}>
            {userRole === 'aupair' 
              ? 'All your responsibilities for today are complete!' 
              : 'No events scheduled for the selected time period.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="upcoming-events-container">
      <div style={styles.header}>
        <h3 style={styles.title}>Upcoming Events for Me</h3>
      </div>
      
      <div style={styles.eventsList}>
        {upcomingEvents.map((event) => (
          <div key={event.id} style={styles.eventCard} className="event-card">
            {/* Time and Day indicator */}
            <div style={styles.timeSection}>
              <div style={styles.timeDisplay}>{formatTime(event.time)}</div>
              <div style={styles.dayIndicator}>
                {event.isToday ? 'Today' : 'Tomorrow'}
              </div>
            </div>

            {/* Event content */}
            <div style={styles.eventContent}>
              <div style={styles.eventHeader}>
                <div style={styles.eventTitle}>{event.title}</div>
              </div>
              
              <div style={styles.eventDescription}>{event.description}</div>
              
              {event.location && (
                <div style={styles.eventLocation}>
                  <span style={styles.locationLabel}>Location:</span>
                  <span style={styles.locationText}>{event.location}</span>
                </div>
              )}
              
              {event.additionalInfo && (
                <div style={styles.additionalInfo}>
                  <span style={styles.infoIcon}>💡</span>
                  <span style={styles.infoText}>{event.additionalInfo}</span>
                </div>
              )}
            </div>

            {/* Child indicators - overlapping badges */}
            <div style={styles.childIndicators}>
              {event.children.map((childData, index) => (
                <div 
                  key={childData.child.id}
                  style={{
                    ...styles.childIndicator,
                    backgroundColor: childData.childColor.primary,
                    right: `${12 + (index * 20)}px`, // Overlap by 20px each
                    zIndex: event.children.length - index // Higher z-index for leftmost badges
                  }}
                  title={childData.child.name}
                >
                  {getUserInitials(childData.child.name)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%'
  },
  header: {
    marginBottom: 'var(--space-4)'
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0,
    textAlign: 'left'
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)'
  },
  eventCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'var(--transition-normal)',
    position: 'relative',
    display: 'flex',
    gap: 'var(--space-4)',
    alignItems: 'flex-start'
  },
  timeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '60px',
    textAlign: 'center'
  },
  timeDisplay: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)'
  },
  dayIndicator: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    backgroundColor: '#fafbfc',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    marginTop: 'var(--space-1)',
    fontWeight: 'var(--font-weight-medium)'
  },
  eventContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    minWidth: 0
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-2)'
  },
  eventTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)',
    flex: 1
  },
  eventDescription: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)'
  },
  eventLocation: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  },
  locationLabel: {
    fontWeight: 'var(--font-weight-bold)',
    marginRight: 'var(--space-1)'
  },
  locationText: {
    flex: 1
  },
  additionalInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-1)',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    backgroundColor: '#f8f9fa',
    padding: 'var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    lineHeight: 'var(--line-height-normal)'
  },
  infoIcon: {
    fontSize: 'var(--font-size-xs)',
    marginTop: '1px',
    flexShrink: 0
  },
  infoText: {
    flex: 1
  },
  childIndicators: {
    position: 'absolute',
    top: 'calc(var(--space-3) + 10px)',
    right: 0,
    display: 'flex',
    alignItems: 'center'
  },
  childIndicator: {
    position: 'absolute',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'white',
    boxShadow: 'var(--shadow-sm)',
    border: '2px solid white'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-8)',
    color: 'var(--text-secondary)'
  },
  emptyIcon: {
    fontSize: 'var(--font-size-4xl)',
    marginBottom: 'var(--space-3)'
  },
  emptyText: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-2) 0'
  },
  emptySubtext: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    margin: 0
  }
};

// Add hover effects
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .upcoming-events-container .event-card:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  `;
  
  if (!document.querySelector('#upcoming-events-styles')) {
    styleElement.id = 'upcoming-events-styles';
    document.head.appendChild(styleElement);
  }
}

export default UpcomingEventsForMe;