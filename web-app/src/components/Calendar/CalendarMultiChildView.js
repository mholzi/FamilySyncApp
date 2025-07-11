import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { getAllEventsForDate } from '../../utils/calendarEventHelpers';
import CalendarQuickAdd from './CalendarQuickAdd';
import EditEventModal from '../Dashboard/EditEventModal';

// Import child color utilities
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

const getChildColorFromId = (childId, index = 0) => {
  if (!childId) return CHILD_COLORS[index % CHILD_COLORS.length];
  
  let hash = 0;
  for (let i = 0; i < childId.length; i++) {
    hash = ((hash << 5) - hash) + childId.charCodeAt(i);
    hash = hash & hash;
  }
  
  const colorIndex = Math.abs(hash) % CHILD_COLORS.length;
  return CHILD_COLORS[colorIndex];
};

const getUserInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const CalendarMultiChildView = ({ 
  familyData,
  children = [], 
  userData,
  userRole,
  recurringActivities = [],
  selectedDate = new Date(),
  calendarEvents = []
}) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTime, setQuickAddTime] = useState(null);
  const [quickAddChildId, setQuickAddChildId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Handle event click
  const onEventClick = (event) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingEvent(null);
  };

  // Handle save event changes
  const handleSaveEventChanges = (updatedEvent) => {
    // This function should be implemented based on your event update logic
    console.log('Event updated:', updatedEvent);
    closeEditModal();
  };
  
  // Get all events for the selected date
  const events = useMemo(() => {
    return getAllEventsForDate(children, selectedDate, recurringActivities, calendarEvents);
  }, [children, selectedDate, recurringActivities, calendarEvents]);
  // Fixed timeline bounds 6-24h
  const { startHour, endHour } = useMemo(() => {
    return {
      startHour: 6,
      endHour: 24
    };
  }, []);

  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i
  );

  // Group events by child
  const eventsByChild = useMemo(() => {
    const grouped = {};
    children.forEach(child => {
      grouped[child.id] = events.filter(event => event.childId === child.id);
    });
    return grouped;
  }, [events, children]);

  // Get child color
  const getChildColor = (childId) => {
    const childIndex = children.findIndex(child => child.id === childId);
    const color = getChildColorFromId(childId, childIndex);
    return color.light;
  };

  // Calculate event position and height
  const getEventStyle = (event, childIndex) => {
    const time = event.time || format(new Date(event.startTime), 'HH:mm');
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = (hours - startHour) * 60 + minutes;
    const duration = event.duration || 60;
    
    const top = (startMinutes / 60) * 80; // 80px per hour
    const height = (duration / 60) * 80;
    const childWidth = 100 / children.length;
    const left = childIndex * childWidth;
    
    // Check for conflicts
    const hasConflict = events.some(otherEvent => {
      if (otherEvent.id === event.id || otherEvent.childId === event.childId) return false;
      
      const otherTime = otherEvent.time || format(new Date(otherEvent.startTime), 'HH:mm');
      const [otherHours, otherMinutes] = otherTime.split(':').map(Number);
      const otherStart = otherHours * 60 + otherMinutes;
      const otherEnd = otherStart + (otherEvent.duration || 60);
      const eventStart = hours * 60 + minutes;
      const eventEnd = eventStart + duration;
      
      return (eventStart < otherEnd && eventEnd > otherStart);
    });
    
    return {
      position: 'absolute',
      top: `${top}px`,
      left: `${left}%`,
      width: `${childWidth}%`,
      height: `${height}px`,
      padding: '0 4px',
      zIndex: 10,
      border: hasConflict ? '2px solid var(--md-sys-color-error)' : 'none'
    };
  };

  const handleTimelineClick = (hour, childId) => {
    const clickedTime = `${hour.toString().padStart(2, '0')}:00`;
    setQuickAddTime(clickedTime);
    setQuickAddChildId(childId);
    setShowQuickAdd(true);
  };

  const handleEventClick = (event) => {
    // Transform the calendar event to match the format expected by EditEventModal
    const transformedEvent = {
      ...event,
      children: event.childName ? [{ child: { id: event.childId, name: event.childName } }] : [],
      isToday: selectedDate.toDateString() === new Date().toDateString()
    };
    setEditingEvent(transformedEvent);
    setShowEditModal(true);
  };

  const handleQuickAdd = (eventData) => {
    // This would save to database
    console.log('Adding event:', eventData);
    setShowQuickAdd(false);
    setQuickAddTime(null);
    setQuickAddChildId(null);
    // Refresh events after adding
  };

  // Get responsibility color
  const getResponsibilityColor = (event) => {
    // Check for school events with transport responsibilities
    if (event.type === 'school' && (event.dropOffResponsibility || event.pickUpResponsibility)) {
      const dropOff = event.dropOffResponsibility?.toLowerCase();
      const pickUp = event.pickUpResponsibility?.toLowerCase();
      
      // Check if shared (different responsibilities for drop-off and pick-up)
      if (dropOff && pickUp && dropOff !== pickUp) {
        return { background: '#F3E5F5', border: '#7B1FA2', textColor: '#1A1A1A' }; // Dark text for shared
      }
      // Check specific responsibilities
      if ((dropOff === 'au_pair' || dropOff === 'aupair') || (pickUp === 'au_pair' || pickUp === 'aupair')) {
        return { background: '#BBDEFB', border: '#2196F3', textColor: '#0D47A1' }; // Blue for aupair
      }
      if (dropOff === 'parent' || pickUp === 'parent') {
        return { background: '#C8E6C9', border: '#4CAF50', textColor: '#1B5E20' }; // Green for parent
      }
    }
    
    // Check regular responsibility field
    const responsibility = event.responsibility?.toLowerCase();
    if (responsibility === 'au_pair' || responsibility === 'aupair') {
      return { background: '#BBDEFB', border: '#2196F3', textColor: '#0D47A1' }; // Blue for aupair
    }
    if (responsibility === 'parent') {
      return { background: '#C8E6C9', border: '#4CAF50', textColor: '#1B5E20' }; // Green for parent
    }
    if (responsibility === 'shared') {
      return { background: '#F3E5F5', border: '#7B1FA2', textColor: '#1A1A1A' }; // Dark text for shared
    }
    
    // Default to child color if no specific responsibility
    return null;
  };

  // Check if an event has ended (is in the past)
  const isEventPast = (event) => {
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Only check if the selected date is today
    if (selectedDate.toDateString() === now.toDateString()) {
      // Calculate event end time in minutes
      const time = event.time || format(new Date(event.startTime), 'HH:mm');
      const [hours, minutes] = time.split(':').map(Number);
      const eventStartMinutes = hours * 60 + minutes;
      const eventEndMinutes = eventStartMinutes + (event.duration || 60);
      
      return eventEndMinutes < currentTimeMinutes;
    }
    
    return false;
  };


  const renderEvent = (event, childIndex) => {
    const child = children[childIndex];
    const isTransportEvent = event.dropOffResponsibility || event.pickUpResponsibility;
    const responsibilityColor = getResponsibilityColor(event);
    const childColor = getChildColorFromId(event.childId);
    const isPast = isEventPast(event);
    
    return (
      <div
        key={event.id}
        style={{
          ...getEventStyle(event, childIndex),
          pointerEvents: 'auto',
          opacity: isPast ? 0.5 : 1
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleEventClick(event);
        }}
      >
        <div style={{
          ...styles.eventCard,
          backgroundColor: responsibilityColor ? responsibilityColor.background : getChildColor(event.childId),
          border: `2px solid ${responsibilityColor ? responsibilityColor.border : childColor.primary}`,
          ...(isPast ? { filter: 'grayscale(50%)' } : {})
        }}>
          <div style={styles.eventContentRow}>
            <div style={{
              ...styles.eventTime,
              color: responsibilityColor ? responsibilityColor.textColor : getChildColorFromId(event.childId).primary,
              fontWeight: responsibilityColor ? '600' : '500'
            }}>
              {event.time || format(new Date(event.startTime), 'HH:mm')}
            </div>
            <div style={{
              ...styles.eventTitle,
              color: responsibilityColor ? responsibilityColor.textColor : '#000000',
              fontWeight: responsibilityColor ? '600' : '500'
            }}>{event.title}</div>
          </div>
          
          {/* Transport indicators */}
          {isTransportEvent && (
            <div style={styles.transportIndicators}>
              {event.dropOffResponsibility && (
                <span style={styles.transportIcon} title={`Drop: ${event.dropOffResponsibility}`}>
                  →{event.dropOffResponsibility.charAt(0)}
                </span>
              )}
              {event.pickUpResponsibility && (
                <span style={styles.transportIcon} title={`Pick: ${event.pickUpResponsibility}`}>
                  ←{event.pickUpResponsibility.charAt(0)}
                </span>
              )}
            </div>
          )}
          
          {/* Child indicator */}
          <div style={styles.childIndicator}>
            <div style={{
              ...styles.childCircle,
              backgroundColor: getChildColorFromId(child.id).primary
            }}>
              {getUserInitials(child.name)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Timeline Card */}
      <div style={styles.timelineCard}>
        {/* Child Headers */}
        <div style={styles.headerRow}>
          <div style={styles.timeHeader}></div>
          {children.map(child => (
            <div key={child.id} style={styles.childHeader}>
              <div style={{
                ...styles.childHeaderCircle, 
                backgroundColor: getChildColorFromId(child.id).primary
              }}>
                {getUserInitials(child.name)}
              </div>
              <span style={styles.childName}>{child.name}</span>
            </div>
          ))}
        </div>

        {/* Timeline Container */}
        <div style={styles.timelineContainer}>
          {/* Hour Column */}
          <div style={styles.hourColumn}>
            {hours.map(hour => (
              <div key={hour} style={styles.hourMarker}>
                <span style={styles.hourLabel}>{`${hour}:00`}</span>
              </div>
            ))}
          </div>

          {/* Events Column */}
          <div style={styles.eventsColumn}>
            <div 
              style={styles.eventsArea}
              onClick={(e) => {
                // Calculate clicked time and child based on position
                const rect = e.currentTarget.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const relativeX = e.clientX - rect.left;
                const minutesFromStart = (relativeY / 80) * 60;
                const clickedHour = startHour + Math.floor(minutesFromStart / 60);
                const clickedMinutes = Math.floor(minutesFromStart % 60);
                const roundedMinutes = Math.round(clickedMinutes / 15) * 15; // Round to 15-min intervals
                
                const clickedTime = `${clickedHour.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
                
                // Determine which child column was clicked
                const childIndex = Math.floor((relativeX / rect.width) * children.length);
                const clickedChild = children[childIndex];
                
                if (clickedChild) {
                  setQuickAddTime(clickedTime);
                  setQuickAddChildId(clickedChild.id);
                  setShowQuickAdd(true);
                }
              }}
            >
              {/* Hour grid lines */}
              {hours.map(hour => (
                <div 
                  key={`line-${hour}`} 
                  style={{
                    ...styles.hourLine,
                    top: (hour - startHour) * 80
                  }}
                />
              ))}

              {/* Vertical grid lines for children */}
              {children.map((child, index) => (
                <div
                  key={`vline-${child.id}`}
                  style={{
                    position: 'absolute',
                    left: `${(index / children.length) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: 'var(--md-sys-color-outline-variant)',
                    opacity: 0.5
                  }}
                />
              ))}

              {/* Events */}
              {children.map((child, childIndex) => (
                eventsByChild[child.id]?.map(event => renderEvent(event, childIndex))
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Add Modal */}
      {showQuickAdd && (
        <CalendarQuickAdd
          children={children}
          selectedDate={selectedDate}
          onSave={handleQuickAdd}
          onCancel={() => {
            setShowQuickAdd(false);
            setQuickAddTime(null);
            setQuickAddChildId(null);
          }}
          userRole={userRole}
          prefilledTime={quickAddTime}
        />
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <EditEventModal
          event={editingEvent}
          familyId={familyData?.id}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEventChanges}
        />
      )}

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>Responsibility:</div>
        <div style={styles.legendItems}>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#BBDEFB', border: '2px solid #2196F3'}} />
            <span style={styles.legendLabel}>Aupair</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#C8E6C9', border: '2px solid #4CAF50'}} />
            <span style={styles.legendLabel}>Parent</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#E1BEE7', border: '2px solid #9C27B0'}} />
            <span style={styles.legendLabel}>Shared</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--md-sys-color-background)',
    padding: '16px',
    gap: '16px',
    marginBottom: '100px'
  },
  timelineCard: {
    backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    overflow: 'hidden',
    boxShadow: 'var(--md-sys-elevation-level1)',
    flex: 1
  },
  timelineContainer: {
    display: 'flex',
    height: '100%',
    minHeight: '500px'
  },
  headerRow: {
    display: 'flex',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    padding: '12px 0'
  },
  timeHeader: {
    width: '72px',
    flexShrink: 0
  },
  hourColumn: {
    width: '72px',
    borderRight: '1px solid var(--md-sys-color-outline-variant)',
    backgroundColor: 'var(--md-sys-color-surface-container-high)'
  },
  hourMarker: {
    height: '80px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '8px 4px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  hourLabel: {
    font: 'var(--md-sys-typescale-label-small-font)',
    color: 'var(--md-sys-color-on-surface-variant)',
    textAlign: 'center'
  },
  eventsColumn: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'var(--md-sys-color-surface)'
  },
  eventsArea: {
    position: 'relative',
    minHeight: '100%',
    height: (24 - 6) * 80, // (endHour - startHour) * 80px per hour
    cursor: 'pointer'
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '1px',
    backgroundColor: 'var(--md-sys-color-outline-variant)',
    zIndex: 1,
    opacity: 0.5
  },
  childHeader: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  childHeaderCircle: {
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
  childName: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-label-medium-font-family-name)'
  },
  eventCard: {
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '4px 8px',
    paddingRight: '32px', // Space for the child circle
    margin: '2px',
    height: 'calc(100% - 4px)',
    cursor: 'pointer',
    pointerEvents: 'auto',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  eventContentRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    width: '100%',
    marginTop: '2px'
  },
  eventTime: {
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)',
    flexShrink: 0,
    minWidth: '45px'
  },
  eventTitle: {
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    flex: 1,
    textAlign: 'center',
    wordWrap: 'break-word',
    whiteSpace: 'normal',
    lineHeight: '1.2',
    overflow: 'hidden'
  },
  transportIndicators: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    display: 'flex',
    gap: '4px'
  },
  transportIcon: {
    fontSize: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: '#000000',
    padding: '2px 4px',
    borderRadius: '4px',
    fontWeight: '600',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  childIndicator: {
    position: 'absolute',
    top: '4px',
    right: '4px'
  },
  childCircle: {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '700',
    color: 'white',
    boxShadow: 'var(--md-sys-elevation-level1)',
    border: '2px solid white'
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 16px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    marginTop: '16px',
    marginBottom: '100px'
  },
  legendTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-label-medium-font-family-name)'
  },
  legendItems: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  legendColor: {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)'
  },
  legendLabel: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-body-medium-font-family-name)'
  }
};

export default CalendarMultiChildView;