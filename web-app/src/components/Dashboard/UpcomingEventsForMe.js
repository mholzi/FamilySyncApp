import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { getNextOccurrences } from '../../utils/recurringActivityTemplates';
import { subscribeToEventOverrides, getEventOverride, applyEventOverride } from '../../utils/eventOverridesUtils';
import { useCalendar } from '../../hooks/useCalendar';
import { useShopping } from '../../hooks/useShopping';
import EditEventModal from './EditEventModal';

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
  userId = null,
  maxEvents = 5,
  recurringActivities = [],
  onNavigate = null
}) => {
  const [babysittingRequests, setBabysittingRequests] = useState([]);
  const [eventOverrides, setEventOverrides] = useState({});
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [eventFilter, setEventFilter] = useState('my'); // 'my' or 'all'

  // Get calendar events using the useCalendar hook
  const { events: calendarEvents, loading: calendarLoading, error: calendarError } = useCalendar(familyId, userId);
  
  // Get shopping lists using the useShopping hook
  const { shoppingLists, loading: shoppingLoading, error: shoppingError } = useShopping(familyId);

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

  // Fetch event overrides for one-off modifications
  useEffect(() => {
    if (!familyId) {
      setEventOverrides({});
      return;
    }

    const unsubscribe = subscribeToEventOverrides(familyId, (overrides) => {
      setEventOverrides(overrides);
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from event overrides:', error);
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

  // Get responsibility display info
  const getResponsibilityInfo = (responsibility) => {
    switch (responsibility) {
      case 'parent':
        return { label: 'Parent', color: '#3b82f6' };
      case 'au_pair':
        return { label: 'Au Pair', color: '#10b981' };
      case 'shared':
        return { label: 'Shared', color: '#f59e0b' };
      case 'aware':
        return { label: 'Awareness', color: '#8b5cf6' };
      default:
        return { label: 'Au Pair', color: '#10b981' };
    }
  };

  // Handle edit event
  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  // Handle save event changes
  const handleSaveEventChanges = () => {
    // The component will re-render due to the event overrides subscription
    setShowEditModal(false);
    setEditingEvent(null);
    
    // Force a small delay to ensure Firestore has time to propagate the change
    setTimeout(() => {
      console.log('Event override saved, current overrides:', Object.keys(eventOverrides));
    }, 100);
  };

  // Get all upcoming events for the au pair from all children
  const getUpcomingEvents = () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDate = new Date().toDateString();
    
    const eventGroups = new Map(); // For grouping similar events

    // Helper function to add event to groups
    const addEventToGroup = (eventData) => {
      // Check for event overrides
      const date = eventData.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
      const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
      
      // Apply override (this will return null if event is cancelled)
      const finalEvent = applyEventOverride(eventData, override);
      if (!finalEvent) return; // Skip cancelled events
      
      // Create a grouping key based on title, time, type, and day
      const groupKey = `${finalEvent.title}-${finalEvent.time}-${finalEvent.type}-${finalEvent.isToday}`;
      
      if (eventGroups.has(groupKey)) {
        // Add child to existing group only if not already present
        const existingGroup = eventGroups.get(groupKey);
        const childExists = existingGroup.children.some(childData => childData.child.id === finalEvent.child.id);
        
        if (!childExists) {
          existingGroup.children.push({
            child: finalEvent.child,
            childColor: finalEvent.childColor
          });
        }
      } else {
        // Create new group
        eventGroups.set(groupKey, {
          ...finalEvent,
          children: [{
            child: finalEvent.child,
            childColor: finalEvent.childColor
          }],
          id: groupKey // Use group key as ID
        });
      }
    };

    // Process routine events from all children
    children.forEach((child, childIndex) => {
      if (!child) return; // Skip null or undefined children
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

      // Filter based on user role and event filter - now checks after applying overrides
      const shouldShow = (activity, eventData = null) => {
        if (eventFilter === 'all') {
          // Show all family events regardless of responsibility
          return true;
        } else {
          // If we have event data with override applied, use that responsibility
          if (eventData && eventData.responsibility) {
            return eventData.responsibility === 'au_pair' || eventData.responsibility === 'shared';
          }
          // Fallback to original responsibilities for initial filtering
          return responsibilities[activity] === 'au_pair' || responsibilities[activity] === 'shared';
        }
      };

      const childColor = getChildColor(child.id, childIndex);

      // Add wake up
      if (routine.wakeUpTime) {
        const eventTime = timeToMinutes(routine.wakeUpTime);
        if (eventTime > currentTime) {
          // Create initial event data
          const eventData = {
            title: 'Wake Up',
            time: routine.wakeUpTime,
            minutes: eventTime,
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: true,
            description: 'Help children wake up and get ready for the day',
            location: null,
            additionalInfo: null,
            responsibility: responsibilities.wakeUp,
            originalResponsibility: responsibilities.wakeUp
          };
          
          // Check for event overrides
          const date = eventData.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
          const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
          
          // Apply override (this will return null if event is cancelled)
          const finalEvent = applyEventOverride(eventData, override);
          if (!finalEvent) return; // Skip cancelled events
          
          // Now check if we should show this event with the final responsibility
          if (shouldShow('wakeUp', finalEvent)) {
            addEventToGroup(finalEvent);
          }
        }
      }

      // Add breakfast
      if (routine.mealTimes?.breakfast) {
        const eventTime = timeToMinutes(routine.mealTimes.breakfast);
        if (eventTime > currentTime) {
          // Create initial event data
          const eventData = {
            title: 'Breakfast',
            time: routine.mealTimes.breakfast,
            minutes: eventTime,
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: true,
            description: 'Prepare and serve breakfast',
            location: null,
            additionalInfo: 'Check if there are any special dietary requirements for today',
            responsibility: responsibilities.breakfast,
            originalResponsibility: responsibilities.breakfast
          };
          
          // Check for event overrides
          const date = eventData.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
          const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
          
          // Apply override (this will return null if event is cancelled)
          const finalEvent = applyEventOverride(eventData, override);
          if (!finalEvent) return; // Skip cancelled events
          
          // Now check if we should show this event with the final responsibility
          if (shouldShow('breakfast', finalEvent)) {
            addEventToGroup(finalEvent);
          }
        }
      }

      // Add lunch times
      if (routine.mealTimes?.lunch) {
        const lunchTimes = Array.isArray(routine.mealTimes.lunch) 
          ? routine.mealTimes.lunch 
          : [routine.mealTimes.lunch];
        
        lunchTimes.forEach((lunchTime, index) => {
          const eventTime = timeToMinutes(lunchTime);
          if (eventTime > currentTime) {
            // Create initial event data
            const eventData = {
              title: lunchTimes.length > 1 ? `Lunch ${index + 1}` : 'Lunch',
              time: lunchTime,
              minutes: eventTime,
              child: child,
              childColor: childColor,
              type: 'routine',
              isToday: true,
              description: 'Prepare lunch',
              location: null,
              additionalInfo: routine.mealTimes.lunch.length === 0 ? 'Usually provided at school' : null,
              responsibility: responsibilities.lunch,
              originalResponsibility: responsibilities.lunch
            };
            
            // Check for event overrides
            const date = eventData.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
            const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
            
            // Apply override (this will return null if event is cancelled)
            const finalEvent = applyEventOverride(eventData, override);
            if (!finalEvent) return; // Skip cancelled events
            
            // Now check if we should show this event with the final responsibility
            if (shouldShow('lunch', finalEvent)) {
              addEventToGroup(finalEvent);
            }
          }
        });
      }

      // Add dinner
      if (routine.mealTimes?.dinner) {
        const eventTime = timeToMinutes(routine.mealTimes.dinner);
        if (eventTime > currentTime) {
          // Create initial event data
          const eventData = {
            title: 'Dinner',
            time: routine.mealTimes.dinner,
            minutes: eventTime,
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: true,
            description: 'Help prepare dinner',
            location: null,
            additionalInfo: responsibilities.dinner === 'shared' ? 'Coordinate with parents' : null,
            responsibility: responsibilities.dinner,
            originalResponsibility: responsibilities.dinner
          };
          
          // Check for event overrides
          const date = eventData.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
          const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
          
          // Apply override (this will return null if event is cancelled)
          const finalEvent = applyEventOverride(eventData, override);
          if (!finalEvent) return; // Skip cancelled events
          
          // Now check if we should show this event with the final responsibility
          if (shouldShow('dinner', finalEvent)) {
            addEventToGroup(finalEvent);
          }
        }
      }

      // Add snacks
      if (routine.mealTimes?.snacks) {
        routine.mealTimes.snacks.forEach((snackTime, index) => {
          const eventTime = timeToMinutes(snackTime);
          if (eventTime > currentTime) {
            // Create initial event data
            const eventData = {
              title: routine.mealTimes.snacks.length > 1 ? `Snack ${index + 1}` : 'Snack',
              time: snackTime,
              minutes: eventTime,
              child: child,
              childColor: childColor,
              type: 'routine',
              isToday: true,
              description: 'Prepare snack',
              location: null,
              additionalInfo: null,
              responsibility: responsibilities.snacks,
              originalResponsibility: responsibilities.snacks
            };
            
            // Check for event overrides
            const date = eventData.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
            const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
            
            // Apply override (this will return null if event is cancelled)
            const finalEvent = applyEventOverride(eventData, override);
            if (!finalEvent) return; // Skip cancelled events
            
            // Now check if we should show this event with the final responsibility
            if (shouldShow('snacks', finalEvent)) {
              addEventToGroup(finalEvent);
            }
          }
        });
      }

      // Add nap times
      if (routine.napTimes && routine.napTimes.length > 0) {
        routine.napTimes.forEach((nap, index) => {
          if (nap.startTime) {
            const eventTime = timeToMinutes(nap.startTime);
            if (eventTime > currentTime) {
              // Create initial event data
              const eventData = {
                title: routine.napTimes.length > 1 ? `Nap ${index + 1}` : 'Nap Time',
                time: nap.startTime,
                minutes: eventTime,
                child: child,
                childColor: childColor,
                type: 'routine',
                isToday: true,
                description: 'Put children down for nap',
                location: null,
                additionalInfo: `Duration: ${nap.duration} minutes${nap.isFlexible ? ' (flexible timing)' : ''}`,
                responsibility: responsibilities.naps,
                originalResponsibility: responsibilities.naps
              };
              
              // Check for event overrides
              const date = eventData.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
              const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
              
              // Apply override (this will return null if event is cancelled)
              const finalEvent = applyEventOverride(eventData, override);
              if (!finalEvent) return; // Skip cancelled events
              
              // Now check if we should show this event with the final responsibility
              if (shouldShow('naps', finalEvent)) {
                addEventToGroup(finalEvent);
              }
            }
          }
        });
      }

      // Add bedtime
      if (routine.bedtime) {
        const eventTime = timeToMinutes(routine.bedtime);
        if (eventTime > currentTime) {
          // Create initial event data
          const eventData = {
            title: 'Bedtime',
            time: routine.bedtime,
            minutes: eventTime,
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: true,
            description: 'Help with bedtime routine',
            location: null,
            additionalInfo: responsibilities.bedtime === 'shared' ? 'Coordinate with parents' : null,
            responsibility: responsibilities.bedtime,
            originalResponsibility: responsibilities.bedtime
          };
          
          // Check for event overrides
          const date = eventData.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
          const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
          
          // Apply override (this will return null if event is cancelled)
          const finalEvent = applyEventOverride(eventData, override);
          if (!finalEvent) return; // Skip cancelled events
          
          // Now check if we should show this event with the final (potentially overridden) responsibility
          if (shouldShow('bedtime', finalEvent)) {
            addEventToGroup(finalEvent);
          }
        }
      }
    });

    // Add school pickup events based on schedule and pickup person
    children.forEach((child, childIndex) => {
      if (!child || !child.schoolSchedule || !child.pickupPerson) return;

      const now = new Date();
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const childColor = getChildColor(child.id, childIndex);

      // Get today's school schedule
      const todaySchedule = child.schoolSchedule[currentDay];
      if (!todaySchedule || todaySchedule.length === 0) return;

      // Get today's pickup person
      const todayPickupPerson = child.pickupPerson[currentDay];
      if (!todayPickupPerson) return;

      // Filter based on user role and pickup person
      const shouldShowPickup = () => {
        if (userRole === 'parent') {
          // Parents always see all pickup events regardless of who's responsible
          return true;
        } else {
          // Au pairs see pickups they're responsible for, "alone" events (for awareness), or if they want to see all events
          return eventFilter === 'all' || todayPickupPerson === 'aupair' || todayPickupPerson === 'alone';
        }
      };

      if (shouldShowPickup()) {
        // Process each school block for pickup times
        todaySchedule.forEach(block => {
          const endTime = timeToMinutes(block.endTime);
          
          // Only show upcoming pickup times
          if (endTime > currentTime) {
            // Create pickup event details based on pickup person
            let pickupTitle = 'School Pickup';
            let pickupDescription = `Pick up ${child.name} from school`;
            let pickupResponsibility = null;

            if (todayPickupPerson === 'parent') {
              pickupTitle = 'School Pickup (Parent)';
              pickupDescription = `Parent picks up ${child.name} from school`;
              pickupResponsibility = 'parent';
            } else if (todayPickupPerson === 'aupair') {
              pickupTitle = 'School Pickup';
              pickupDescription = `Pick up ${child.name} from school`;
              pickupResponsibility = 'au_pair';
            } else if (todayPickupPerson === 'alone') {
              pickupTitle = 'School End (Awareness)';
              pickupDescription = `${child.name} comes home alone from school`;
              pickupResponsibility = 'awareness';
            }

            // Enhanced display for travel time and school address
            let schoolAddress = null;
            let enhancedAdditionalInfo = null;
            
            if (todayPickupPerson === 'alone') {
              // For "alone" pickups, don't show location or travel time
              schoolAddress = null;
              enhancedAdditionalInfo = 'Awareness: Child coming home independently';
            } else {
              // For actual pickups, show school address and travel time
              schoolAddress = child.schoolInfo?.address || 'School';
              const travelTime = child.schoolInfo?.travelTime;
              if (travelTime) {
                enhancedAdditionalInfo = `Travel time: ${travelTime} minutes - Plan ahead for pickup!`;
              }
            }

            addEventToGroup({
              title: pickupTitle,
              time: block.endTime,
              minutes: endTime,
              child: child,
              childColor: childColor,
              type: 'school_pickup',
              isToday: true,
              description: pickupDescription,
              location: schoolAddress,
              additionalInfo: enhancedAdditionalInfo,
              responsibility: pickupResponsibility,
              originalResponsibility: pickupResponsibility
            });
          }
        });
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

    // Add calendar events (5th event type - doctor appointments, playdates, etc.)
    if (calendarEvents && calendarEvents.length > 0) {
      calendarEvents.forEach((event) => {
        try {
          // Filter by attendees - only show events where user is in attendees array
          if (!event.attendees || !event.attendees.includes(userId)) {
            return;
          }

          const startTime = event.startTime;
          const eventTime = timeToMinutes(startTime.toTimeString().slice(0, 5));
          const eventDate = startTime.toDateString();
          const isToday = eventDate === currentDate;
          
          // Only show today's events that are upcoming, or future events
          if ((isToday && eventTime > currentTime) || startTime > new Date()) {
            // Apply role-based filtering
            const shouldShowCalendarEvent = () => {
              if (eventFilter === 'all') return true;
              // Show if user role matches event responsibility or event is shared
              return event.responsibility === userRole || event.responsibility === 'shared';
            };
            
            if (shouldShowCalendarEvent()) {
              // Process each assigned child for color coding
              if (event.childrenIds && event.childrenIds.length > 0) {
                event.childrenIds.forEach(childId => {
                  const child = children.find(c => c.id === childId);
                  if (child) {
                    const childColor = getChildColor(child.id);
                    
                    addEventToGroup({
                      title: event.title,
                      time: startTime.toTimeString().slice(0, 5),
                      minutes: eventTime,
                      child: child,
                      childColor: childColor,
                      type: 'calendar_event',
                      isToday: isToday,
                      description: event.description || event.title,
                      location: event.location || null,
                      additionalInfo: null,
                      responsibility: event.responsibility || 'parent',
                      originalResponsibility: event.responsibility || 'parent'
                    });
                  }
                });
              } else {
                // If no specific children assigned, assign to first child for consistency
                const defaultChild = children[0];
                if (defaultChild) {
                  const childColor = getChildColor(defaultChild.id);
                  
                  addEventToGroup({
                    title: event.title,
                    time: startTime.toTimeString().slice(0, 5),
                    minutes: eventTime,
                    child: defaultChild,
                    childColor: childColor,
                    type: 'calendar_event',
                    isToday: isToday,
                    description: event.description || event.title,
                    location: event.location || null,
                    additionalInfo: null,
                    responsibility: event.responsibility || 'parent',
                    originalResponsibility: event.responsibility || 'parent'
                  });
                }
              }
            }
          }
        } catch (error) {
          console.warn('Error processing calendar event:', error, event);
        }
      });
    }

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

    // Add shopping tasks scheduled for today
    if (shoppingLists && shoppingLists.length > 0) {
      shoppingLists.forEach((shoppingList) => {
        try {
          // Check if shopping list is scheduled for today
          const shouldShowShoppingTask = () => {
            if (!shoppingList.scheduledFor && !shoppingList.scheduledOption) return false;
            
            if (shoppingList.scheduledOption === 'this-week') return true;
            
            if (shoppingList.scheduledFor) {
              const scheduledDate = new Date(shoppingList.scheduledFor);
              const scheduleDay = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
              const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              
              return scheduleDay <= todayDay;
            }
            
            return false;
          };

          // Only show for au pairs and if scheduled for today
          if (userRole === 'aupair' && shouldShowShoppingTask()) {
            // Calculate a reasonable time for shopping (default to 10:00 AM if not specified)
            const shoppingTime = shoppingList.scheduledTime || '10:00';
            const eventTime = timeToMinutes(shoppingTime);
            
            // Only show if shopping is upcoming today
            if (eventTime > currentTime) {
              // Get items count for display
              const items = Object.values(shoppingList.items || {});
              const completedItems = items.filter(item => item.isPurchased).length;
              const totalItems = items.length;
              const remainingItems = totalItems - completedItems;
              
              // Use first child for color consistency or create a default
              const defaultChild = children[0];
              if (defaultChild) {
                const childColor = getChildColor(defaultChild.id);
                
                addEventToGroup({
                  title: `Shopping: ${shoppingList.name}`,
                  time: shoppingTime,
                  minutes: eventTime,
                  child: defaultChild,
                  childColor: childColor,
                  type: 'shopping',
                  isToday: true,
                  description: totalItems === 0 
                    ? 'No items added yet'
                    : `${remainingItems} of ${totalItems} items remaining`,
                  location: shoppingList.supermarket?.name || 'Supermarket',
                  additionalInfo: shoppingList.supermarket?.location?.address || null,
                  responsibility: 'au_pair',
                  originalResponsibility: 'au_pair',
                  shoppingListId: shoppingList.id
                });
              }
            }
          }
        } catch (error) {
          console.warn('Error processing shopping list:', error, shoppingList);
        }
      });
    }

    // Add tomorrow's events if we need more to reach maxEvents
    if (eventGroups.size < maxEvents) {
      children.forEach((child, childIndex) => {
        if (!child) return; // Skip null or undefined children
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

        const shouldShow = (activity, eventData = null) => {
          if (eventFilter === 'all') {
            // Show all family events regardless of responsibility
            return true;
          } else {
            // If we have event data with override applied, use that responsibility
            if (eventData && eventData.responsibility) {
              return eventData.responsibility === 'au_pair' || eventData.responsibility === 'shared';
            }
            // Fallback to original responsibilities for initial filtering
            return responsibilities[activity] === 'au_pair' || responsibilities[activity] === 'shared';
          }
        };

        const childColor = getChildColor(child.id, childIndex);

        // Add tomorrow's wake up
        if (routine.wakeUpTime) {
          // Create initial event data
          const eventData = {
            title: 'Wake Up',
            time: routine.wakeUpTime,
            minutes: timeToMinutes(routine.wakeUpTime),
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: false,
            description: 'Help children wake up and get ready for the day',
            location: null,
            additionalInfo: null,
            responsibility: responsibilities.wakeUp,
            originalResponsibility: responsibilities.wakeUp
          };
          
          // Check for event overrides
          const date = new Date(Date.now() + 86400000).toDateString();
          const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
          
          // Apply override (this will return null if event is cancelled)
          const finalEvent = applyEventOverride(eventData, override);
          if (!finalEvent) return; // Skip cancelled events
          
          // Now check if we should show this event with the final responsibility
          if (shouldShow('wakeUp', finalEvent)) {
            addEventToGroup(finalEvent);
          }
        }

        // Add tomorrow's breakfast
        if (routine.mealTimes?.breakfast) {
          // Create initial event data
          const eventData = {
            title: 'Breakfast',
            time: routine.mealTimes.breakfast,
            minutes: timeToMinutes(routine.mealTimes.breakfast),
            child: child,
            childColor: childColor,
            type: 'routine',
            isToday: false,
            description: 'Prepare and serve breakfast',
            location: null,
            additionalInfo: 'Check if there are any special dietary requirements for tomorrow',
            responsibility: responsibilities.breakfast,
            originalResponsibility: responsibilities.breakfast
          };
          
          // Check for event overrides
          const date = new Date(Date.now() + 86400000).toDateString();
          const override = getEventOverride(eventOverrides, eventData.type, date, eventData.child.id, eventData.time);
          
          // Apply override (this will return null if event is cancelled)
          const finalEvent = applyEventOverride(eventData, override);
          if (!finalEvent) return; // Skip cancelled events
          
          // Now check if we should show this event with the final responsibility
          if (shouldShow('breakfast', finalEvent)) {
            addEventToGroup(finalEvent);
          }
        }

        // Add tomorrow's school pickup events
        if (child.schoolSchedule && child.pickupPerson) {
          const tomorrowDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][(new Date().getDay())];
          const tomorrowSchedule = child.schoolSchedule[tomorrowDay];
          const tomorrowPickupPerson = child.pickupPerson[tomorrowDay];

          if (tomorrowSchedule && tomorrowSchedule.length > 0 && tomorrowPickupPerson) {
            const shouldShowTomorrowPickup = () => {
              if (userRole === 'parent') {
                // Parents always see all pickup events regardless of who's responsible
                return true;
              } else {
                // Au pairs see pickups they're responsible for, "alone" events (for awareness), or if they want to see all events
                return eventFilter === 'all' || tomorrowPickupPerson === 'aupair' || tomorrowPickupPerson === 'alone';
              }
            };

            if (shouldShowTomorrowPickup()) {
              tomorrowSchedule.forEach(block => {
                let pickupTitle = 'School Pickup';
                let pickupDescription = `Pick up ${child.name} from school`;
                let pickupResponsibility = null;

                if (tomorrowPickupPerson === 'parent') {
                  pickupTitle = 'School Pickup (Parent)';
                  pickupDescription = `Parent picks up ${child.name} from school`;
                  pickupResponsibility = 'parent';
                } else if (tomorrowPickupPerson === 'aupair') {
                  pickupTitle = 'School Pickup';
                  pickupDescription = `Pick up ${child.name} from school`;
                  pickupResponsibility = 'au_pair';
                } else if (tomorrowPickupPerson === 'alone') {
                  pickupTitle = 'School End (Awareness)';
                  pickupDescription = `${child.name} comes home alone from school`;
                  pickupResponsibility = 'awareness';
                }

                // Enhanced display for travel time and school address
                let schoolAddress = null;
                let enhancedAdditionalInfo = null;
                
                if (tomorrowPickupPerson === 'alone') {
                  // For "alone" pickups, don't show location or travel time
                  schoolAddress = null;
                  enhancedAdditionalInfo = 'Awareness: Child coming home independently';
                } else {
                  // For actual pickups, show school address and travel time
                  schoolAddress = child.schoolInfo?.address || 'School';
                  const travelTime = child.schoolInfo?.travelTime;
                  if (travelTime) {
                    enhancedAdditionalInfo = `Travel time: ${travelTime} minutes - Plan ahead for pickup!`;
                  }
                }

                addEventToGroup({
                  title: pickupTitle,
                  time: block.endTime,
                  minutes: timeToMinutes(block.endTime),
                  child: child,
                  childColor: childColor,
                  type: 'school_pickup',
                  isToday: false,
                  description: pickupDescription,
                  location: schoolAddress,
                  additionalInfo: enhancedAdditionalInfo,
                  responsibility: pickupResponsibility,
                  originalResponsibility: pickupResponsibility
                });
              });
            }
          }
        }
      });
    }

    // Add recurring activities
    recurringActivities.forEach(activity => {
      try {
        // Get next occurrences for this activity
        const nextOccurrences = getNextOccurrences(activity, 3);
        
        nextOccurrences.forEach(occurrence => {
          const eventTime = timeToMinutes(occurrence.time);
          const occurrenceDate = occurrence.date.toDateString();
          const isToday = occurrenceDate === currentDate;
          const isTomorrow = occurrenceDate === new Date(Date.now() + 86400000).toDateString();
          
          // Only show today's upcoming events or tomorrow's events (if we need more)
          if ((isToday && eventTime > currentTime) || (isTomorrow && eventGroups.size < maxEvents)) {
            // Check if au pair should see this activity based on transportation responsibilities
            const shouldShowActivity = () => {
              if (eventFilter === 'all') return true;
              
              // Show if au pair is responsible for either dropoff or pickup
              return activity.transportation?.dropoff === 'au_pair' || 
                     activity.transportation?.pickup === 'au_pair';
            };
            
            if (shouldShowActivity()) {
              // Find the assigned child for this activity
              const assignedChild = children.find(child => 
                activity.assignedChildren.includes(child.id)
              );
              
              if (assignedChild) {
                const childColor = getChildColor(assignedChild.id);
                
                // Determine responsibility based on activity timing and transportation
                let responsibility = 'parent'; // default
                if (activity.transportation?.dropoff === 'au_pair' || activity.transportation?.pickup === 'au_pair') {
                  responsibility = 'au_pair';
                } else if (activity.transportation?.dropoff === 'shared' || activity.transportation?.pickup === 'shared') {
                  responsibility = 'shared';
                }
                
                // Create transportation info
                let transportationInfo = '';
                if (activity.transportation?.dropoff === 'au_pair') {
                  transportationInfo += 'Drop-off: Au Pair';
                }
                if (activity.transportation?.pickup === 'au_pair') {
                  if (transportationInfo) transportationInfo += ' | ';
                  transportationInfo += 'Pick-up: Au Pair';
                }
                if (activity.transportation?.dropoff === 'child_alone' || activity.transportation?.pickup === 'child_alone') {
                  if (transportationInfo) transportationInfo += ' | ';
                  transportationInfo += 'Child goes alone';
                }
                
                addEventToGroup({
                  title: activity.name,
                  time: occurrence.time,
                  minutes: eventTime,
                  child: assignedChild,
                  childColor: childColor,
                  type: 'activity',
                  isToday: isToday,
                  description: `${activity.category} activity`,
                  location: activity.location?.name || activity.location?.address,
                  additionalInfo: transportationInfo || `Duration: ${activity.duration} minutes`,
                  responsibility: responsibility,
                  originalResponsibility: responsibility,
                  activityData: activity // Store full activity data for potential future use
                });
              }
            }
          }
        });
      } catch (error) {
        console.warn('Error processing recurring activity:', error, activity);
      }
    });

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
        <div className="md3-flex md3-flex-between md3-flex-center md3-mb-16">
          <div style={styles.title}>Upcoming Events</div>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}></div>
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
      <div className="md3-flex md3-flex-between md3-flex-center md3-mb-16">
        <div style={styles.title}>Upcoming Events</div>
        <div style={styles.filterButtons}>
          <button
            style={{
              ...styles.filterButton,
              ...(eventFilter === 'my' ? styles.filterButtonActive : {})
            }}
            onClick={() => setEventFilter('my')}
          >
            Aupair
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(eventFilter === 'all' ? styles.filterButtonActive : {})
            }}
            onClick={() => setEventFilter('all')}
          >
            Family
          </button>
        </div>
      </div>
      
      <div style={styles.eventsList}>
        {upcomingEvents.map((event) => (
          <div 
            key={event.id} 
            style={{
              ...styles.eventCard,
              ...(event.type === 'shopping' ? { cursor: 'pointer' } : {})
            }}
            className="event-card"
            onClick={event.type === 'shopping' && onNavigate ? () => onNavigate('shopping') : undefined}
          >
            {/* Time and Day indicator */}
            <div style={styles.timeSection}>
              <div style={styles.timeContent}>
                <div style={styles.timeDisplay}>{formatTime(event.time)}</div>
                <div style={styles.dayIndicator}>
                  {event.isToday ? 'Today' : 'Tomorrow'}
                </div>
              </div>
            </div>

            {/* Event content */}
            <div style={styles.eventContent}>
              <div style={styles.eventHeader}>
                <div style={styles.eventTitle}>
                  {event.title}
                  {event.isModified && <span style={styles.modifiedBadge}>Modified</span>}
                </div>
              </div>
              
              {/* Dynamic description for meal events based on responsibility */}
              <div style={styles.eventDescription}>
                {(() => {
                  // Check if this is a meal event
                  const isMealEvent = event.title && (
                    event.title.toLowerCase().includes('breakfast') ||
                    event.title.toLowerCase().includes('lunch') ||
                    event.title.toLowerCase().includes('dinner') ||
                    event.title.toLowerCase().includes('snack')
                  );
                  
                  if (isMealEvent && event.responsibility === 'parent') {
                    // For meal events where parent is responsible
                    const mealName = event.title.toLowerCase().includes('breakfast') ? 'Breakfast' :
                                   event.title.toLowerCase().includes('lunch') ? 'Lunch' :
                                   event.title.toLowerCase().includes('dinner') ? 'Dinner' :
                                   event.title.toLowerCase().includes('snack') ? 'Snack' : 'Meal';
                    return `${mealName} gets prepared by parents`;
                  }
                  
                  // For all other events, use original description
                  return event.description;
                })()}
              </div>
              
              {/* Dynamic location display for school pickup events */}
              {(() => {
                // For school pickup events, always show location if au pair is responsible
                if (event.type === 'school_pickup' && event.responsibility === 'au_pair') {
                  const schoolAddress = event.child?.schoolInfo?.address || event.location || 'School';
                  return (
                    <div style={styles.eventLocationContainer}>
                      <span style={styles.locationLabel}>Location:</span>
                      <div style={styles.eventLocation}>
                        <span style={styles.locationText}>{schoolAddress}</span>
                      </div>
                    </div>
                  );
                } else if (event.location) {
                  return (
                    <div style={styles.eventLocationContainer}>
                      <span style={styles.locationLabel}>Location:</span>
                      <div style={styles.eventLocation}>
                        <span style={styles.locationText}>{event.location}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Dynamic additional info display */}
              {(() => {
                // For school pickup events, always show travel time if au pair is responsible
                if (event.type === 'school_pickup' && event.responsibility === 'au_pair') {
                  const travelTime = event.child?.schoolInfo?.travelTime;
                  if (travelTime) {
                    return (
                      <div style={styles.additionalInfo}>
                        <span style={styles.infoIcon}></span>
                        <span style={styles.infoText}>Travel time: {travelTime} minutes - Plan ahead for pickup!</span>
                      </div>
                    );
                  }
                }
                
                // Check if this is a meal event
                const isMealEvent = event.title && (
                  event.title.toLowerCase().includes('breakfast') ||
                  event.title.toLowerCase().includes('lunch') ||
                  event.title.toLowerCase().includes('dinner') ||
                  event.title.toLowerCase().includes('snack')
                );
                
                // For meal events with parent responsibility, don't show "Coordinate with parents" message
                if (isMealEvent && event.responsibility === 'parent') {
                  return null; // Don't show any additional info
                }
                
                // For all other events with additional info
                if (event.additionalInfo) {
                  return (
                    <div style={styles.additionalInfo}>
                      <span style={styles.infoIcon}></span>
                      <span style={styles.infoText}>{event.additionalInfo}</span>
                    </div>
                  );
                }
                
                return null;
              })()}
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

            {/* Responsibility indicator */}
            {event.responsibility && (
              <div style={{
                ...styles.responsibilityBadge,
                backgroundColor: `${getResponsibilityInfo(event.responsibility).color}15`,
                color: getResponsibilityInfo(event.responsibility).color
              }}>
                {getResponsibilityInfo(event.responsibility).label}
              </div>
            )}

            {/* Edit button for parents */}
            {userRole === 'parent' && (
              <button
                style={styles.editButton}
                onClick={() => handleEditEvent(event)}
                title="Edit this event"
              >
                Edit
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <EditEventModal
          event={editingEvent}
          familyId={familyId}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEventChanges}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%'
  },
  header: {
    marginBottom: 'var(--space-4)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 'var(--space-3)'
  },
  title: {
    fontSize: '24px',
    fontWeight: '400',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    textAlign: 'left',
    flex: 1,
    lineHeight: '32px'
  },
  filterButtons: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '4px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  filterButton: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    backgroundColor: 'transparent',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    whiteSpace: 'nowrap'
  },
  filterButtonActive: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  eventCard: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    boxShadow: 'var(--md-sys-elevation-level1)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    transition: 'var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard)',
    position: 'relative',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    paddingBottom: '50px' // Add extra space for the responsibility badge
  },
  timeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: '70px',
    textAlign: 'left',
    paddingLeft: '0px' // Align with card padding, responsibility badge has absolute positioning
  },
  timeContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  timeDisplay: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--md-sys-color-primary)',
    lineHeight: '1.3'
  },
  dayIndicator: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    marginTop: '4px',
    fontWeight: '500'
  },
  eventContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '8px'
  },
  eventTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: '1.3',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  modifiedBadge: {
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-tertiary-container)',
    backgroundColor: 'var(--md-sys-color-tertiary-container)',
    padding: '2px 6px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  editButton: {
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '80px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)',
    position: 'absolute',
    bottom: '10px',
    right: '10px'
  },
  responsibilityBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    fontSize: '11px',
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    opacity: 0.9,
    position: 'absolute',
    bottom: '10px',
    left: '10px' // 10px margin from the left edge
  },
  eventDescription: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4',
    marginBottom: '4px'
  },
  eventLocationContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px'
  },
  eventLocation: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '6px 12px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)'
  },
  locationLabel: {
    fontWeight: '600',
    color: 'var(--md-sys-color-primary)',
    fontSize: '13px'
  },
  locationText: {
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    flex: 1
  },
  additionalInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '6px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    lineHeight: '1.4',
    marginBottom: '4px'
  },
  infoIcon: {
    fontSize: 'var(--font-size-xs)',
    marginTop: '1px',
    flexShrink: 0
  },
  infoText: {
    flex: 1,
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4'
  },
  childIndicators: {
    position: 'absolute',
    top: '24px', // 16px (card padding) + 8px (additional margin)
    right: 0,
    display: 'flex',
    alignItems: 'center'
  },
  childIndicator: {
    position: 'absolute',
    width: '32px',
    height: '32px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white',
    boxShadow: 'var(--md-sys-elevation-level1)',
    border: '2px solid white'
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px',
    color: 'var(--md-sys-color-on-surface-variant)'
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