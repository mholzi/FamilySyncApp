import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { subscribeToEventOverrides, getEventOverride, applyEventOverride } from '../../utils/eventOverridesUtils';
import { useCalendar } from '../../hooks/useCalendar';
import EditEventModal from './EditEventModal';

// Child color utility
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

// Helper function to get responsibility info
const getResponsibilityInfo = (responsibility) => {
  const responsibilityMap = {
    'au_pair': { label: 'Au Pair', color: '#3B82F6' },
    'parent': { label: 'Parent', color: '#10B981' },
    'shared': { label: 'Shared', color: '#F59E0B' },
    'awareness': { label: 'Awareness', color: '#6B7280' }
  };
  
  return responsibilityMap[responsibility] || { label: 'Unknown', color: '#6B7280' };
};

// Helper function to convert time to minutes
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to format time
const formatTime = (time) => {
  if (!time) return '';
  if (time.includes(':')) return time;
  return time.padStart(2, '0') + ':00';
};

// Get user initials for child indicator
const getUserInitials = (name) => {
  if (!name) return 'C';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const UpcomingCalendarEvents = ({ 
  children = [], 
  userRole = 'aupair',
  familyId = null,
  userId = null,
  maxEvents = 15
}) => {
  const [babysittingRequests, setBabysittingRequests] = useState([]);
  const [eventOverrides, setEventOverrides] = useState({});
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [eventFilter, setEventFilter] = useState('my'); // 'my' or 'all'
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [eventCache, setEventCache] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const [networkError, setNetworkError] = useState(null);
  const [loadingStates, setLoadingStates] = useState({
    calendar: false,
    babysitting: false
  });

  // Performance constants
  const INITIAL_EVENT_LIMIT = 15;
  const CACHE_DURATION = 30000; // 30 seconds

  // Get calendar events using the useCalendar hook
  const { events: calendarEvents, loading: calendarLoading, error: calendarError } = useCalendar(familyId, userId);

  // Network error recovery
  const handleNetworkError = (error, eventType) => {
    console.warn(`Network error for ${eventType}:`, error);
    setNetworkError(`${eventType} events unavailable - ${error.message}`);
    
    // Set loading state to false for this event type
    setLoadingStates(prev => ({ ...prev, [eventType]: false }));
    
    // Auto-retry after 5 seconds
    setTimeout(() => {
      setNetworkError(null);
    }, 5000);
  };

  // Fetch accepted babysitting requests from Firestore
  useEffect(() => {
    if (!familyId) {
      setBabysittingRequests([]);
      return;
    }

    let unsubscribe = null;
    setLoadingStates(prev => ({ ...prev, babysitting: true }));

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
            setLoadingStates(prev => ({ ...prev, babysitting: false }));
            // Clear any previous network errors for this type
            if (networkError && networkError.includes('babysitting')) {
              setNetworkError(null);
            }
          } catch (error) {
            console.warn('Error processing babysitting requests snapshot:', error);
            setBabysittingRequests([]);
            handleNetworkError(error, 'babysitting');
          }
        },
        (error) => {
          console.warn('Error fetching babysitting requests:', error);
          setBabysittingRequests([]);
          handleNetworkError(error, 'babysitting');
        }
      );
    } catch (error) {
      console.warn('Error setting up babysitting requests listener:', error);
      setBabysittingRequests([]);
      handleNetworkError(error, 'babysitting');
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

  // Get upcoming calendar events and babysitting requests only
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

    // Add calendar events (primary focus - "Other" events like doctor appointments, playdates)
    if (calendarEvents && calendarEvents.length > 0) {
      calendarEvents.forEach((event) => {
        try {
          // Filter by attendees - only show events where user is in attendees array
          if (!event.attendees || !event.attendees.includes(userId)) {
            return;
          }

          const startTime = event.startTime;
          const eventTime = timeToMinutes(startTime.toTimeString().slice(0, 5)); // Format HH:MM
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
                      time: startTime.toTimeString().slice(0, 5), // Extract start time only
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
                    time: startTime.toTimeString().slice(0, 5), // Extract start time only
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
                additionalInfo: `Until ${endTime.toTimeString().slice(0, 5)}`,
                responsibility: 'au_pair',
                originalResponsibility: 'au_pair'
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
                additionalInfo: `Until ${endTime.toTimeString().slice(0, 5)}`,
                responsibility: 'au_pair',
                originalResponsibility: 'au_pair'
              });
            });
          }
        }
      } catch (error) {
        console.warn('Error processing babysitting request:', error, request);
      }
    });

    // Convert grouped events to array and sort by time
    const sortedEvents = Array.from(eventGroups.values())
      .sort((a, b) => {
        if (a.isToday && !b.isToday) return -1;
        if (!a.isToday && b.isToday) return 1;
        return a.minutes - b.minutes;
      })
      .slice(0, maxEvents);

    return sortedEvents;
  };

  // Memoized event aggregation for performance  
  const allEvents = useMemo(() => {
    return getUpcomingEvents();
  }, [children, babysittingRequests, calendarEvents, eventOverrides, eventFilter, userRole]);

  // Implement caching with staleness detection
  const cachedEvents = useMemo(() => {
    const now = Date.now();
    if (eventCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      return eventCache;
    }
    
    const freshEvents = allEvents;
    setEventCache(freshEvents);
    setCacheTimestamp(now);
    return freshEvents;
  }, [allEvents, eventCache, cacheTimestamp, CACHE_DURATION]);

  // Apply pagination
  const displayedEvents = useMemo(() => {
    if (showAllEvents) {
      return cachedEvents;
    }
    return cachedEvents.slice(0, INITIAL_EVENT_LIMIT);
  }, [cachedEvents, showAllEvents, INITIAL_EVENT_LIMIT]);

  const hasMoreEvents = cachedEvents.length > INITIAL_EVENT_LIMIT;

  if (displayedEvents.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Upcoming Events</h3>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}></div>
          <p style={styles.emptyText}>No upcoming events</p>
          <p style={styles.emptySubtext}>
            {userRole === 'aupair' 
              ? 'No calendar events or babysitting requests scheduled!' 
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
      
      {/* Error handling for all event types */}
      {calendarError && (
        <div style={styles.errorMessage}>
          <span style={styles.errorIcon}>⚠️</span>
          <span>Calendar events unavailable - {calendarError}</span>
        </div>
      )}
      
      {networkError && (
        <div style={styles.errorMessage}>
          <span style={styles.errorIcon}>⚠️</span>
          <span>{networkError}</span>
        </div>
      )}

      {/* Loading states for individual event types */}
      {(loadingStates.calendar || loadingStates.babysitting) && (
        <div style={styles.loadingMessage}>
          <span style={styles.loadingIcon}>⏳</span>
          <span>Loading events...</span>
        </div>
      )}
      
      <div style={styles.eventsList}>
        {displayedEvents.map((event) => (
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
              
              <div style={styles.eventDescription}>
                {event.description}
              </div>
              
              {event.location && (
                <div style={styles.eventLocation}>
                  <span style={styles.locationLabel}>Location:</span>
                  <span style={styles.locationText}>{event.location}</span>
                </div>
              )}
              
              {event.additionalInfo && (
                <div style={styles.additionalInfo}>
                  <span style={styles.infoIcon}></span>
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

      {/* Show More Button */}
      {hasMoreEvents && !showAllEvents && (
        <div style={styles.showMoreContainer}>
          <button
            style={styles.showMoreButton}
            onClick={() => setShowAllEvents(true)}
          >
            Show More Events ({cachedEvents.length - INITIAL_EVENT_LIMIT} more)
          </button>
        </div>
      )}

      {/* Show Less Button */}
      {showAllEvents && hasMoreEvents && (
        <div style={styles.showMoreContainer}>
          <button
            style={styles.showMoreButton}
            onClick={() => setShowAllEvents(false)}
          >
            Show Less Events
          </button>
        </div>
      )}

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
    left: '10px'
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
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    color: '#dc2626'
  },
  errorIcon: {
    fontSize: 'var(--font-size-base)'
  },
  loadingMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    color: '#0284c7'
  },
  loadingIcon: {
    fontSize: 'var(--font-size-base)'
  },
  showMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 'var(--space-4)',
    paddingTop: 'var(--space-3)'
  },
  showMoreButton: {
    padding: 'var(--space-3) var(--space-6)',
    backgroundColor: 'var(--primary-purple)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    boxShadow: 'var(--shadow-sm)'
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
    .upcoming-events-container button:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  `;
  
  if (!document.querySelector('#upcoming-events-styles')) {
    styleElement.id = 'upcoming-events-styles';
    document.head.appendChild(styleElement);
  }
}

export default UpcomingCalendarEvents;