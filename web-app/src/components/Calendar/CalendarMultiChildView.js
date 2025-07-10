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
    
    const top = (startMinutes / 60) * 60; // 60px per hour
    const height = (duration / 60) * 60;
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


  const renderEvent = (event, childIndex) => {
    const child = children[childIndex];
    const isTransportEvent = event.dropOffResponsibility || event.pickUpResponsibility;
    
    return (
      <div
        key={event.id}
        style={{
          ...getEventStyle(event, childIndex),
        }}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(event);
        }}
      >
        <div style={{
          ...styles.eventCard,
          backgroundColor: getChildColor(event.childId),
          border: `1px solid ${getChildColorFromId(event.childId).primary}`,
        }}>
          <div style={styles.eventContentRow}>
            <div style={{
              ...styles.eventTime,
              color: getChildColorFromId(event.childId).primary
            }}>
              {event.time || format(new Date(event.startTime), 'h:mm a')}
            </div>
            <div style={{
              ...styles.eventTitle,
              color: '#000000' // Black for better readability
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

      {/* Timeline */}
      <div style={styles.timeline}>
        {/* Hour markers */}
        {hours.map(hour => (
          <div key={hour} style={styles.hourRow}>
            <div style={styles.hourLabel}>
              {`${hour}:00`}
            </div>
            <div style={styles.hourGrid}>
              {children.map((child, index) => (
                <div
                  key={`${hour}-${child.id}`}
                  style={styles.hourCell}
                  onClick={() => handleTimelineClick(hour, child.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Events overlay */}
        <div style={styles.eventsContainer}>
          {children.map((child, childIndex) => (
            eventsByChild[child.id]?.map(event => renderEvent(event, childIndex))
          ))}
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
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    overflow: 'hidden',
    marginBottom: '100px'
  },
  headerRow: {
    display: 'flex',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    padding: '12px 0'
  },
  timeHeader: {
    width: '80px',
    flexShrink: 0
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
  timeline: {
    position: 'relative',
    overflow: 'auto',
    maxHeight: '600px'
  },
  hourRow: {
    display: 'flex',
    height: '60px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  hourLabel: {
    width: '80px',
    padding: '8px',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)',
    flexShrink: 0
  },
  hourGrid: {
    flex: 1,
    display: 'flex',
    position: 'relative'
  },
  hourCell: {
    flex: 1,
    borderRight: '1px solid var(--md-sys-color-outline-variant)',
    cursor: 'pointer',
    transition: 'background-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    '&:hover': {
      backgroundColor: 'var(--md-sys-color-surface-container-low)'
    }
  },
  eventsContainer: {
    position: 'absolute',
    top: 0,
    left: '80px',
    right: 0,
    bottom: 0,
    pointerEvents: 'none'
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
  }
};

export default CalendarMultiChildView;