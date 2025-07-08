import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { getNextOccurrences } from '../../utils/recurringActivityTemplates';
import { subscribeToEventOverrides, getEventOverride, applyEventOverride } from '../../utils/eventOverridesUtils';
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
  maxEvents = 5 
}) => {
  const [recurringActivities, setRecurringActivities] = useState([]);
  const [babysittingRequests, setBabysittingRequests] = useState([]);
  const [eventOverrides, setEventOverrides] = useState({});
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [eventFilter, setEventFilter] = useState('my'); // 'my' or 'all'

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

      // Filter based on user role and event filter
      const shouldShow = (activity) => {
        if (eventFilter === 'all') {
          // Show all family events regardless of responsibility
          return true;
        } else {
          // For both parents and au pairs, "my events" / "au pair events" shows au pair responsibilities
          return responsibilities[activity] === 'au_pair' || responsibilities[activity] === 'shared';
        }
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
            additionalInfo: null,
            responsibility: responsibilities.wakeUp,
            originalResponsibility: responsibilities.wakeUp
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
            additionalInfo: 'Check if there are any special dietary requirements for today',
            responsibility: responsibilities.breakfast,
            originalResponsibility: responsibilities.breakfast
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
              additionalInfo: routine.mealTimes.lunch.length === 0 ? 'Usually provided at school' : null,
              responsibility: responsibilities.lunch,
              originalResponsibility: responsibilities.lunch
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
            additionalInfo: responsibilities.dinner === 'shared' ? 'Coordinate with parents' : null,
            responsibility: responsibilities.dinner,
            originalResponsibility: responsibilities.dinner
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
              additionalInfo: null,
              responsibility: responsibilities.snacks,
              originalResponsibility: responsibilities.snacks
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
                additionalInfo: `Duration: ${nap.duration} minutes${nap.isFlexible ? ' (flexible timing)' : ''}`,
                responsibility: responsibilities.naps,
                originalResponsibility: responsibilities.naps
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
            additionalInfo: responsibilities.bedtime === 'shared' ? 'Coordinate with parents' : null,
            responsibility: responsibilities.bedtime,
            originalResponsibility: responsibilities.bedtime
          });
        }
      }
    });

    // Add school pickup events based on schedule and pickup person
    children.forEach((child, childIndex) => {
      if (!child.schoolSchedule || !child.pickupPerson) return;

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
              pickupTitle = 'School End';
              pickupDescription = `${child.name} comes home alone from school`;
              pickupResponsibility = 'aware'; // Special responsibility type for awareness
            }

            // Enhanced display for travel time and school address
            let schoolAddress = null;
            let enhancedAdditionalInfo = null;
            
            if (todayPickupPerson === 'alone') {
              // For "alone" pickups, don't show location or additional info
              schoolAddress = null;
              enhancedAdditionalInfo = null;
            } else {
              // For actual pickups, show school address and travel time
              schoolAddress = child.schoolInfo?.address || 'School';
              const travelTime = child.schoolInfo?.travelTime;
              if (travelTime) {
                enhancedAdditionalInfo = `⏱️ Travel time: ${travelTime} minutes - Plan ahead for pickup!`;
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
          if (eventFilter === 'all') {
            // Show all family events regardless of responsibility
            return true;
          } else {
            // For both parents and au pairs, "my events" / "au pair events" shows au pair responsibilities
            return responsibilities[activity] === 'au_pair' || responsibilities[activity] === 'shared';
          }
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
            additionalInfo: null,
            responsibility: responsibilities.wakeUp,
            originalResponsibility: responsibilities.wakeUp
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
            additionalInfo: 'Check if there are any special dietary requirements for tomorrow',
            responsibility: responsibilities.breakfast,
            originalResponsibility: responsibilities.breakfast
          });
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
                  pickupTitle = 'School End';
                  pickupDescription = `${child.name} comes home alone from school`;
                  pickupResponsibility = 'aware'; // Special responsibility type for awareness
                }

                // Enhanced display for travel time and school address
                let schoolAddress = null;
                let enhancedAdditionalInfo = null;
                
                if (tomorrowPickupPerson === 'alone') {
                  // For "alone" pickups, don't show location or additional info
                  schoolAddress = null;
                  enhancedAdditionalInfo = null;
                } else {
                  // For actual pickups, show school address and travel time
                  schoolAddress = child.schoolInfo?.address || 'School';
                  const travelTime = child.schoolInfo?.travelTime;
                  if (travelTime) {
                    enhancedAdditionalInfo = `⏱️ Travel time: ${travelTime} minutes - Plan ahead for pickup!`;
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
          <h3 style={styles.title}>Upcoming Events</h3>
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
        <h3 style={styles.title}>Upcoming Events</h3>
        <div style={styles.filterButtons}>
          <button
            style={{
              ...styles.filterButton,
              ...(eventFilter === 'my' ? styles.filterButtonActive : {})
            }}
            onClick={() => setEventFilter('my')}
          >
            {userRole === 'aupair' ? 'My Events' : 'Au Pair Events'}
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(eventFilter === 'all' ? styles.filterButtonActive : {})
            }}
            onClick={() => setEventFilter('all')}
          >
            All Family Events
          </button>
        </div>
      </div>
      
      <div style={styles.eventsList}>
        {upcomingEvents.map((event) => (
          <div key={event.id} style={styles.eventCard} className="event-card">
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
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0,
    textAlign: 'left',
    flex: 1
  },
  filterButtons: {
    display: 'flex',
    gap: 'var(--space-2)',
    backgroundColor: '#f8f9fa',
    padding: '2px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)'
  },
  filterButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    whiteSpace: 'nowrap'
  },
  filterButtonActive: {
    backgroundColor: 'var(--white)',
    color: 'var(--primary-purple)',
    boxShadow: 'var(--shadow-sm)'
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
    alignItems: 'flex-start',
    paddingBottom: '50px' // Add extra space for the responsibility badge
  },
  timeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '60px',
    textAlign: 'center'
  },
  timeContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
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
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-2)'
  },
  eventTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  modifiedBadge: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  editButton: {
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    minWidth: '80px',
    backgroundColor: '#f3f4f6',
    color: 'var(--text-primary)',
    position: 'absolute',
    bottom: '10px',
    right: '10px'
  },
  responsibilityBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    opacity: 0.8,
    position: 'absolute',
    bottom: '10px',
    left: '10px' // 10px margin from the left edge
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