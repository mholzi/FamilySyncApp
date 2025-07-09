import React, { useState } from 'react';
import { getUserInitials } from '../../utils/userUtils';

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

const CalendarEventCard = ({ 
  event, 
  hasConflict = false, 
  onEdit, 
  onDelete,
  userRole 
}) => {
  const [showPopup, setShowPopup] = useState(false);

  const getEventTypeStyle = (type) => {
    const styles = {
      routine: {
        backgroundColor: '#DBEAFE',
        borderLeft: '4px solid #3B82F6',
        icon: '🏠'
      },
      school: {
        backgroundColor: '#FEF3C7',
        borderLeft: '4px solid #F59E0B',
        icon: '🏫'
      },
      activity: {
        backgroundColor: '#D1FAE5',
        borderLeft: '4px solid #10B981',
        icon: '🏃'
      },
      social: {
        backgroundColor: '#EDE9FE',
        borderLeft: '4px solid #7C3AED',
        icon: '👫'
      },
      medical: {
        backgroundColor: '#FEE2E2',
        borderLeft: '4px solid #EF4444',
        icon: '🏥'
      },
      oneTime: {
        backgroundColor: '#F3F4F6',
        borderLeft: '4px solid #6B7280',
        icon: '🎯'
      }
    };
    return styles[type] || styles.oneTime;
  };


  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const formatDuration = (duration) => {
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const typeStyle = getEventTypeStyle(event.type);
  const startTime = formatTime(event.startMinutes);
  const endTime = formatTime(event.endMinutes);
  const duration = formatDuration(event.duration);

  const canEdit = userRole === 'parent' || (userRole === 'aupair' && event.responsibility === 'au_pair');

  return (
    <div 
      style={{
        ...styles.eventCard,
        ...typeStyle,
        ...(hasConflict ? styles.conflictCard : {}),
        ...(event.duration < 30 ? styles.shortEvent : {})
      }}
      onClick={() => setShowPopup(true)}
    >
      {/* Main event info */}
      <div style={styles.eventHeader}>
        <div style={styles.titleRow}>
          <div style={styles.eventTitle}>
            <span style={styles.eventIcon}>{event.icon}</span>
            <span style={styles.titleText}>{event.title}</span>
          </div>
          <div style={styles.childCircle}>
            {event.childId && event.childName && (
              <div 
                style={{
                  ...styles.childIndicator,
                  backgroundColor: getChildColor(event.childId).primary
                }}
                title={event.childName}
              >
                {getUserInitials(event.childName)}
              </div>
            )}
          </div>
        </div>
        
        <div style={styles.timeInfo}>
          <span style={styles.timeText}>
            {startTime} - {endTime} ({duration})
          </span>
          {hasConflict && (
            <span style={styles.conflictBadge}>⚠️ Conflict</span>
          )}
        </div>
      </div>

      {/* Event Details Popup */}
      {showPopup && (
        <div style={styles.popupOverlay} onClick={() => setShowPopup(false)}>
          <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
            <div style={styles.popupHeader}>
              <div style={styles.popupTitle}>
                <span style={styles.popupIcon}>{event.icon}</span>
                <span>{event.title}</span>
              </div>
              <button 
                style={styles.closeButton}
                onClick={() => setShowPopup(false)}
              >
                ×
              </button>
            </div>
            
            <div style={styles.popupContent}>
              <div style={styles.popupTimeInfo}>
                <span style={styles.popupTime}>
                  {startTime} - {endTime} ({duration})
                </span>
                {hasConflict && (
                  <span style={styles.popupConflict}>⚠️ Conflict</span>
                )}
              </div>

              {event.childName && (
                <div style={styles.popupDetailRow}>
                  <span style={styles.popupDetailIcon}>👶</span>
                  <span style={styles.popupDetailText}>{event.childName}</span>
                </div>
              )}

              {event.location && (
                <div style={styles.popupDetailRow}>
                  <span style={styles.popupDetailIcon}>📍</span>
                  <span style={styles.popupDetailText}>{event.location}</span>
                </div>
              )}
              
              {event.requiredItems && event.requiredItems.length > 0 && (
                <div style={styles.popupDetailRow}>
                  <span style={styles.popupDetailIcon}>🎒</span>
                  <div style={styles.popupDetailText}>
                    <div style={styles.popupItemsTitle}>Required items:</div>
                    <ul style={styles.popupItemsList}>
                      {event.requiredItems.map((item, index) => (
                        <li key={index} style={styles.popupItem}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {event.notes && (
                <div style={styles.popupDetailRow}>
                  <span style={styles.popupDetailIcon}>📝</span>
                  <span style={styles.popupDetailText}>{event.notes}</span>
                </div>
              )}

              {/* Transportation info for activities */}
              {event.type === 'activity' && event.transportation && (
                <div style={styles.popupDetailRow}>
                  <span style={styles.popupDetailIcon}>🚗</span>
                  <div style={styles.popupDetailText}>
                    <div style={styles.popupTransportationTitle}>Transportation:</div>
                    <div style={styles.popupTransportationInfo}>
                      Drop-off: {event.transportation.dropoff || 'au_pair'}
                      <br />
                      Pick-up: {event.transportation.pickup || 'au_pair'}
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {canEdit && (
                <div style={styles.popupActionButtons}>
                  <button 
                    style={styles.popupEditButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit && onEdit(event);
                      setShowPopup(false);
                    }}
                  >
                    ✏️ Edit
                  </button>
                  {event.type !== 'routine' && event.type !== 'school' && onDelete && (
                    <button 
                      style={styles.popupDeleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(event);
                        setShowPopup(false);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  eventCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    fontSize: 'var(--font-size-sm)',
    position: 'relative',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: 'var(--space-1)'
  },
  conflictCard: {
    borderColor: '#EF4444 !important',
    backgroundColor: '#FEF2F2'
  },
  shortEvent: {
    padding: 'var(--space-2)'
  },
  eventHeader: {
    marginBottom: 'var(--space-2)'
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-1)'
  },
  eventTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    flex: 1
  },
  eventIcon: {
    fontSize: 'var(--font-size-base)',
    lineHeight: 1
  },
  titleText: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)'
  },
  responsibilityBadge: {
    display: 'flex',
    alignItems: 'center',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  },
  responsibilityIcon: {
    fontSize: 'var(--font-size-sm)',
    lineHeight: 1
  },
  childCircle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  childIndicator: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'white',
    boxShadow: 'var(--shadow-sm)',
    border: '2px solid white'
  },
  timeInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timeText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    fontWeight: 'var(--font-weight-medium)'
  },
  conflictBadge: {
    fontSize: 'var(--font-size-xs)',
    color: '#DC2626',
    fontWeight: 'var(--font-weight-semibold)',
    backgroundColor: '#FEE2E2',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)'
  },
  // Popup styles
  popupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  popup: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    maxWidth: '400px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  popupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--border-light)'
  },
  popupTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)'
  },
  popupIcon: {
    fontSize: 'var(--font-size-lg)'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-xl)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)'
  },
  popupContent: {
    padding: 'var(--space-4)'
  },
  popupTimeInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-4)',
    padding: 'var(--space-3)',
    backgroundColor: 'var(--gray-50)',
    borderRadius: 'var(--radius-md)'
  },
  popupTime: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)'
  },
  popupConflict: {
    fontSize: 'var(--font-size-xs)',
    color: '#DC2626',
    fontWeight: 'var(--font-weight-medium)'
  },
  popupDetailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-3)'
  },
  popupDetailIcon: {
    fontSize: 'var(--font-size-base)',
    lineHeight: 1,
    marginTop: '2px'
  },
  popupDetailText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)',
    flex: 1
  },
  popupItemsTitle: {
    fontWeight: 'var(--font-weight-medium)',
    marginBottom: 'var(--space-2)',
    color: 'var(--text-primary)'
  },
  popupItemsList: {
    margin: 0,
    paddingLeft: 'var(--space-4)',
    fontSize: 'var(--font-size-sm)'
  },
  popupItem: {
    marginBottom: 'var(--space-1)'
  },
  popupTransportationTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    marginBottom: 'var(--space-2)',
    color: 'var(--text-primary)'
  },
  popupTransportationInfo: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)'
  },
  popupActionButtons: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-4)',
    paddingTop: 'var(--space-4)',
    borderTop: '1px solid var(--border-light)'
  },
  popupEditButton: {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  popupDeleteButton: {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: '#EF4444',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  }
};

export default CalendarEventCard;