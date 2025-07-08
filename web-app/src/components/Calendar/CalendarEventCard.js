import React, { useState } from 'react';

const CalendarEventCard = ({ 
  event, 
  hasConflict = false, 
  onEdit, 
  userRole 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const getResponsibilityInfo = (responsibility) => {
    const responsibilities = {
      parent: { label: 'Parent', icon: '👨‍👩‍👧', color: '#6366F1' },
      au_pair: { label: 'Au Pair', icon: '👤', color: '#10B981' },
      other_parent: { label: 'Other Parent', icon: '👤', color: '#F59E0B' },
      grandparent: { label: 'Grandparent', icon: '👴', color: '#EC4899' },
      child_alone: { label: 'Child Alone', icon: '🚶', color: '#94A3B8' },
      school: { label: 'School', icon: '🏫', color: '#F59E0B' }
    };
    return responsibilities[responsibility] || responsibilities.au_pair;
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
  const responsibilityInfo = getResponsibilityInfo(event.responsibility);
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
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Main event info */}
      <div style={styles.eventHeader}>
        <div style={styles.titleRow}>
          <div style={styles.eventTitle}>
            <span style={styles.eventIcon}>{event.icon}</span>
            <span style={styles.titleText}>{event.title}</span>
          </div>
          <div style={styles.responsibilityBadge}>
            <span style={{
              ...styles.responsibilityIcon,
              color: responsibilityInfo.color
            }}>
              {responsibilityInfo.icon}
            </span>
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

      {/* Expanded details */}
      {isExpanded && (
        <div style={styles.expandedContent}>
          {event.location && (
            <div style={styles.detailRow}>
              <span style={styles.detailIcon}>📍</span>
              <span style={styles.detailText}>{event.location}</span>
            </div>
          )}
          
          {event.requiredItems && event.requiredItems.length > 0 && (
            <div style={styles.detailRow}>
              <span style={styles.detailIcon}>🎒</span>
              <div style={styles.detailText}>
                <div style={styles.itemsTitle}>Required items:</div>
                <ul style={styles.itemsList}>
                  {event.requiredItems.map((item, index) => (
                    <li key={index} style={styles.item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {event.notes && (
            <div style={styles.detailRow}>
              <span style={styles.detailIcon}>📝</span>
              <span style={styles.detailText}>{event.notes}</span>
            </div>
          )}

          {/* Transportation info for activities */}
          {event.type === 'activity' && event.transportation && (
            <div style={styles.transportationInfo}>
              <div style={styles.transportationTitle}>Transportation:</div>
              <div style={styles.transportationDetails}>
                {event.transportation.dropoff === 'au_pair' && (
                  <span style={styles.transportDetail}>🚗 Drop-off: Au Pair</span>
                )}
                {event.transportation.pickup === 'au_pair' && (
                  <span style={styles.transportDetail}>🚗 Pick-up: Au Pair</span>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {canEdit && (
            <div style={styles.actionButtons}>
              <button 
                style={styles.editButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                ✏️ Edit
              </button>
              {event.type !== 'routine' && event.type !== 'school' && (
                <button 
                  style={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Delete event:', event.id);
                  }}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapse indicator */}
      <div style={styles.expandIndicator}>
        <span style={styles.expandArrow}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>
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
  expandedContent: {
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
    paddingTop: 'var(--space-3)',
    marginTop: 'var(--space-2)'
  },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-2)'
  },
  detailIcon: {
    fontSize: 'var(--font-size-sm)',
    lineHeight: 1,
    marginTop: '2px'
  },
  detailText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)',
    flex: 1
  },
  itemsTitle: {
    fontWeight: 'var(--font-weight-medium)',
    marginBottom: 'var(--space-1)'
  },
  itemsList: {
    margin: 0,
    paddingLeft: 'var(--space-4)',
    fontSize: 'var(--font-size-xs)'
  },
  item: {
    marginBottom: 'var(--space-1)'
  },
  transportationInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 'var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 'var(--space-2)'
  },
  transportationTitle: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    marginBottom: 'var(--space-1)'
  },
  transportationDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)'
  },
  transportDetail: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)'
  },
  actionButtons: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-3)'
  },
  editButton: {
    padding: 'var(--space-2) var(--space-3)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  deleteButton: {
    padding: 'var(--space-2) var(--space-3)',
    backgroundColor: '#EF4444',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  expandIndicator: {
    position: 'absolute',
    top: 'var(--space-2)',
    right: 'var(--space-2)',
    opacity: 0.6
  },
  expandArrow: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)'
  }
};

export default CalendarEventCard;