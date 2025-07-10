import React, { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { getAllEventsForDate } from '../../utils/calendarEventHelpers';
import CalendarFilters from './CalendarFilters';
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

const CalendarAgendaView = ({ 
  familyData,
  children = [],
  userData,
  userRole,
  recurringActivities = [],
  calendarEvents = []
}) => {
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [selectedFilters, setSelectedFilters] = useState({ responsibility: 'all', childId: 'all' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Get events for today and tomorrow
  const todayEvents = useMemo(() => {
    const today = new Date();
    const currentTime = today.getHours() * 60 + today.getMinutes();
    const allTodayEvents = getAllEventsForDate(children, today, recurringActivities, calendarEvents);
    
    // Filter out past events - only show current and future events
    return allTodayEvents.filter(event => event.endMinutes >= currentTime);
  }, [children, recurringActivities, calendarEvents]);

  const tomorrowEvents = useMemo(() => {
    const tomorrow = addDays(new Date(), 1);
    return getAllEventsForDate(children, tomorrow, recurringActivities, calendarEvents);
  }, [children, recurringActivities, calendarEvents]);

  // Filter and group events for today and tomorrow
  const filteredEvents = useMemo(() => {
    const allEvents = [...todayEvents, ...tomorrowEvents];
    
    return allEvents.filter(event => {
      // Responsibility filter
      if (selectedFilters.responsibility !== 'all') {
        // Map responsibility types
        let eventResponsibility = event.responsibility;
        if (eventResponsibility === 'au_pair') eventResponsibility = 'aupair';
        
        // Check if event matches filter
        if (selectedFilters.responsibility === 'aupair') {
          // Aupair filter includes: aupair, kid/alone, shared
          if (!['aupair', 'kid/alone', 'shared'].includes(eventResponsibility)) {
            return false;
          }
        } else if (selectedFilters.responsibility === 'parent') {
          // Parent filter includes: parent and shared
          if (!['parent', 'shared'].includes(eventResponsibility)) {
            return false;
          }
        } else if (eventResponsibility !== selectedFilters.responsibility) {
          return false;
        }
      }
      
      // Child filter
      if (selectedFilters.childId !== 'all' && 
          event.childId !== selectedFilters.childId) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort chronologically
      return a.startMinutes - b.startMinutes;
    });
  }, [todayEvents, tomorrowEvents, selectedFilters]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups = {
      today: todayEvents.filter(event => {
        // Apply filters
        if (selectedFilters.responsibility !== 'all') {
          let eventResponsibility = event.responsibility;
          if (eventResponsibility === 'au_pair') eventResponsibility = 'aupair';
          
          if (selectedFilters.responsibility === 'aupair') {
            if (!['aupair', 'kid/alone', 'shared'].includes(eventResponsibility)) {
              return false;
            }
          } else if (selectedFilters.responsibility === 'parent') {
            if (!['parent', 'shared'].includes(eventResponsibility)) {
              return false;
            }
          } else if (eventResponsibility !== selectedFilters.responsibility) {
            return false;
          }
        }
        if (selectedFilters.childId !== 'all' && 
            event.childId !== selectedFilters.childId) {
          return false;
        }
        return true;
      }),
      tomorrow: tomorrowEvents.filter(event => {
        // Apply filters
        if (selectedFilters.responsibility !== 'all') {
          let eventResponsibility = event.responsibility;
          if (eventResponsibility === 'au_pair') eventResponsibility = 'aupair';
          
          if (selectedFilters.responsibility === 'aupair') {
            if (!['aupair', 'kid/alone', 'shared'].includes(eventResponsibility)) {
              return false;
            }
          } else if (selectedFilters.responsibility === 'parent') {
            if (!['parent', 'shared'].includes(eventResponsibility)) {
              return false;
            }
          } else if (eventResponsibility !== selectedFilters.responsibility) {
            return false;
          }
        }
        if (selectedFilters.childId !== 'all' && 
            event.childId !== selectedFilters.childId) {
          return false;
        }
        return true;
      })
    };
    
    return groups;
  }, [todayEvents, tomorrowEvents, selectedFilters]);

  const toggleExpanded = (eventId) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const getChildInfo = (childId) => {
    return children.find(child => child.id === childId);
  };

  const getChildColor = (childId) => {
    const childIndex = children.findIndex(child => child.id === childId);
    const color = getChildColorFromId(childId, childIndex);
    return color.light;
  };

  const getResponsibilityTag = (responsibility) => {
    // Map old values to new display values
    let displayText = responsibility;
    if (responsibility === 'au_pair') displayText = 'Aupair';
    else if (responsibility === 'parent') displayText = 'Parent';
    else if (responsibility === 'shared') displayText = 'Shared';
    else if (responsibility === 'kid/alone') displayText = 'Kid/Alone';
    else if (responsibility === 'school') displayText = 'School';
    
    return displayText.charAt(0).toUpperCase() + displayText.slice(1);
  };

  const getResponsibilityColor = (responsibility) => {
    // Define colors for different responsibilities
    const colors = {
      'au_pair': { bg: '#E3F2FD', text: '#1976D2' }, // Blue
      'aupair': { bg: '#E3F2FD', text: '#1976D2' }, // Blue
      'parent': { bg: '#F3E5F5', text: '#7B1FA2' }, // Purple
      'shared': { bg: '#E8F5E9', text: '#388E3C' }, // Green
      'kid/alone': { bg: '#FFF3E0', text: '#F57C00' }, // Orange
      'school': { bg: '#FFEBEE', text: '#C62828' } // Red
    };
    
    return colors[responsibility] || { bg: '#F5F5F5', text: '#616161' }; // Default gray
  };

  const formatEndTime = (event) => {
    const endMinutes = event.endMinutes || (event.startMinutes + (event.duration || 60));
    const hours = Math.floor(endMinutes / 60);
    const minutes = endMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleEventClick = (event) => {
    const transformedEvent = {
      ...event,
      children: event.childName ? [{ child: { id: event.childId, name: event.childName } }] : [],
      isToday: isToday(new Date())
    };
    setEditingEvent(transformedEvent);
    setShowEditModal(true);
  };

  const handleSaveEventChanges = () => {
    setShowEditModal(false);
    setEditingEvent(null);
  };

  const renderEventCard = (event) => {
    const isExpanded = expandedEvents.has(event.id);
    const child = getChildInfo(event.childId);
    const childColor = getChildColor(event.childId);
    
    // Calculate leave by time if travel time exists
    const leaveByTime = event.travelTime ? 
      format(new Date(new Date(`${event.date} ${event.time}`).getTime() - event.travelTime * 60000), 'h:mm a') : 
      null;

    return (
      <div 
        key={event.id}
        style={styles.eventCard}
        onClick={() => toggleExpanded(event.id)}
      >
        {/* Compact View */}
        <div style={styles.compactView}>
          <div style={styles.timeColumn}>
            <div style={styles.eventTime}>{event.time || format(new Date(event.startTime), 'h:mm a')}</div>
            <div style={styles.endTime}>{formatEndTime(event)}</div>
          </div>
          
          <div style={styles.eventInfo}>
            <div style={styles.eventHeader}>
              <span style={styles.eventTitle}>{event.title}</span>
              {child && (
                <div style={{
                  ...styles.childCircle, 
                  backgroundColor: getChildColorFromId(child.id).primary
                }}>
                  {getUserInitials(child.name)}
                </div>
              )}
            </div>
            
            <div style={styles.responsibilityLine}>
              {event.type === 'school' ? (
                // For school events, show drop-off and pick-up responsibilities
                <>
                  {event.dropOffResponsibility && (
                    <div style={{
                      ...styles.responsibilityTag,
                      backgroundColor: getResponsibilityColor(event.dropOffResponsibility === 'au_pair' ? 'aupair' : event.dropOffResponsibility).bg,
                      color: getResponsibilityColor(event.dropOffResponsibility === 'au_pair' ? 'aupair' : event.dropOffResponsibility).text
                    }}>
                      Drop: {getResponsibilityTag(event.dropOffResponsibility)}
                    </div>
                  )}
                  {event.pickUpResponsibility && event.pickUpResponsibility !== event.dropOffResponsibility && (
                    <div style={{
                      ...styles.responsibilityTag,
                      backgroundColor: getResponsibilityColor(event.pickUpResponsibility === 'au_pair' ? 'aupair' : event.pickUpResponsibility).bg,
                      color: getResponsibilityColor(event.pickUpResponsibility === 'au_pair' ? 'aupair' : event.pickUpResponsibility).text
                    }}>
                      Pick: {getResponsibilityTag(event.pickUpResponsibility)}
                    </div>
                  )}
                  {event.pickUpResponsibility === event.dropOffResponsibility && event.dropOffResponsibility && (
                    <div style={{
                      ...styles.responsibilityTag,
                      backgroundColor: getResponsibilityColor(event.dropOffResponsibility === 'au_pair' ? 'aupair' : event.dropOffResponsibility).bg,
                      color: getResponsibilityColor(event.dropOffResponsibility === 'au_pair' ? 'aupair' : event.dropOffResponsibility).text
                    }}>
                      {getResponsibilityTag(event.dropOffResponsibility)}
                    </div>
                  )}
                </>
              ) : (
                // For non-school events, show regular responsibility or transportation info
                <>
                  {event.dropOffResponsibility && (
                    <span style={styles.transport}>Drop: {event.dropOffResponsibility}</span>
                  )}
                  {event.pickUpResponsibility && (
                    <span style={styles.transport}>Pick: {event.pickUpResponsibility}</span>
                  )}
                  {!event.dropOffResponsibility && !event.pickUpResponsibility && event.responsibility && (
                    <div style={{
                      ...styles.responsibilityTag,
                      backgroundColor: getResponsibilityColor(event.responsibility).bg,
                      color: getResponsibilityColor(event.responsibility).text
                    }}>
                      {getResponsibilityTag(event.responsibility)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div style={styles.expandedView}>
            {event.location && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Location:</span>
                <span style={styles.detailValue}>{event.location}</span>
              </div>
            )}
            
            {event.dropOffResponsibility && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Drop-off:</span>
                <span style={styles.detailValue}>
                  {event.dropOffResponsibility} 
                  {leaveByTime && ` (Leave by: ${leaveByTime})`}
                </span>
              </div>
            )}
            
            {event.pickUpResponsibility && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Pick-up:</span>
                <span style={styles.detailValue}>{event.pickUpResponsibility}</span>
              </div>
            )}
            
            {event.notes && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Notes:</span>
                <span style={styles.detailValue}>{event.notes}</span>
              </div>
            )}
            
            {event.requiredItems && event.requiredItems.length > 0 && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Required:</span>
                <span style={styles.detailValue}>{event.requiredItems.join(', ')}</span>
              </div>
            )}
            
            <button 
              style={styles.editButton}
              onClick={(e) => {
                e.stopPropagation();
                handleEventClick(event);
              }}
            >
              Edit Event
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Filters */}
      <CalendarFilters
        selectedFilters={selectedFilters}
        onFilterChange={setSelectedFilters}
        children={children}
        currentUserRole={userRole}
      />

      {/* Today Section */}
      {groupedEvents.today.length > 0 && (
        <div style={styles.daySection}>
          <h3 style={styles.dayHeader}>Today</h3>
          <div style={styles.eventsList}>
            {groupedEvents.today.map(renderEventCard)}
          </div>
        </div>
      )}
      
      {/* Tomorrow Section */}
      {groupedEvents.tomorrow.length > 0 && (
        <div style={styles.daySection}>
          <h3 style={styles.dayHeader}>Tomorrow</h3>
          <div style={styles.eventsList}>
            {groupedEvents.tomorrow.map(renderEventCard)}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {groupedEvents.today.length === 0 && groupedEvents.tomorrow.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No events scheduled for today or tomorrow</p>
        </div>
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
    padding: '16px',
    backgroundColor: 'var(--md-sys-color-surface)',
    minHeight: '400px'
  },
  daySection: {
    marginBottom: '24px'
  },
  dayHeader: {
    fontSize: '18px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '12px',
    fontFamily: 'var(--md-sys-typescale-title-medium-font-family-name)'
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  eventCard: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  compactView: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  timeColumn: {
    minWidth: '80px',
    flexShrink: 0
  },
  eventTime: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  },
  endTime: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '2px',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)'
  },
  leaveByTime: {
    fontSize: '12px',
    color: 'var(--md-sys-color-primary)',
    marginTop: '2px',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)'
  },
  eventInfo: {
    flex: 1,
    minWidth: 0
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px'
  },
  eventTitle: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  childCircle: {
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
    border: '2px solid white',
    flexShrink: 0
  },
  responsibilityLine: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    display: 'flex',
    gap: '12px'
  },
  transport: {
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  responsibility: {
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  responsibilityTag: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)'
  },
  expandIcon: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    flexShrink: 0
  },
  expandedView: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--md-sys-color-outline-variant)'
  },
  detailRow: {
    display: 'flex',
    marginBottom: '8px',
    fontSize: '14px',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  detailLabel: {
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginRight: '8px',
    minWidth: '80px'
  },
  detailValue: {
    color: 'var(--md-sys-color-on-surface)',
    flex: 1
  },
  editButton: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  emptyText: {
    fontSize: '16px',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  }
};

export default CalendarAgendaView;