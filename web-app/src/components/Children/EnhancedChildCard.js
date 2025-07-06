import React, { useState } from 'react';

const EnhancedChildCard = ({ 
  child, 
  upcomingEvents = [], 
  onEditChild
}) => {
  const [imageError, setImageError] = useState(false);
  // Calculate age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 0;
    const birthDate = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
    const today = new Date();
    const diffTime = Math.abs(today - birthDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months > 0 ? `${months}m` : `${Math.floor(diffDays / 7)}w`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
    }
  };

  // Get age-appropriate color theme
  const getChildTheme = (age) => {
    const ageInMonths = calculateAgeInMonths(child.dateOfBirth);
    
    if (ageInMonths < 24) {
      // Infants (0-2): Soft pastels
      return {
        primary: '#E8F5E8',
        accent: '#4CAF50',
        text: '#2E7D32'
      };
    } else if (ageInMonths < 60) {
      // Toddlers (2-5): Bright playful
      return {
        primary: '#FFF3E0',
        accent: '#FF9800',
        text: '#F57C00'
      };
    } else {
      // School age (5+): Sophisticated
      return {
        primary: '#F3E5F5',
        accent: '#9C27B0',
        text: '#7B1FA2'
      };
    }
  };

  const calculateAgeInMonths = (dateOfBirth) => {
    if (!dateOfBirth) return 0;
    const birthDate = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
    const today = new Date();
    return Math.floor((today - birthDate) / (1000 * 60 * 60 * 24 * 30.44));
  };

  // Format time for display
  const formatTime = (date) => {
    if (!date) return '';
    const eventDate = date.toDate ? date.toDate() : new Date(date);
    return eventDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Get next 2 events for this child
  const getNextEvents = () => {
    const now = new Date();
    const childEvents = upcomingEvents
      .filter(event => 
        event.childIds && 
        event.childIds.includes(child.id) &&
        (event.startTime ? (event.startTime.toDate ? event.startTime.toDate() : new Date(event.startTime)) > now : true)
      )
      .sort((a, b) => {
        const timeA = a.startTime ? (a.startTime.toDate ? a.startTime.toDate() : new Date(a.startTime)) : new Date();
        const timeB = b.startTime ? (b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime)) : new Date();
        return timeA - timeB;
      })
      .slice(0, 2);
    
    return childEvents;
  };

  // Get current status based on recent activities
  const getCurrentStatus = () => {
    const nextEvents = getNextEvents();
    const now = new Date();
    
    if (nextEvents.length === 0) {
      return { text: 'Free time', color: '#4CAF50', icon: '🟢' };
    }
    
    const nextEvent = nextEvents[0];
    const nextEventTime = nextEvent.startTime ? (nextEvent.startTime.toDate ? nextEvent.startTime.toDate() : new Date(nextEvent.startTime)) : null;
    
    if (!nextEventTime) {
      return { text: 'Free time', color: '#4CAF50', icon: '🟢' };
    }
    
    const timeDiff = nextEventTime - now;
    const minutesUntilNext = Math.floor(timeDiff / (1000 * 60));
    
    if (minutesUntilNext <= 30) {
      return { text: 'Activity soon', color: '#FF9800', icon: '🟡' };
    } else {
      return { text: 'Active', color: '#4CAF50', icon: '🟢' };
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const age = calculateAge(child.dateOfBirth);
  const theme = getChildTheme(age);
  const nextEvents = getNextEvents();
  const status = getCurrentStatus();

  return (
    <div style={{
      ...styles.card,
      borderLeft: `4px solid ${theme.accent}`
    }}>
      {/* Header with child info and status */}
      <div style={styles.header}>
        <div style={styles.childInfo}>
          <div style={styles.profileContainer}>
            {child.profilePictureUrl && !imageError ? (
              <img 
                src={child.profilePictureUrl} 
                alt={`${child.name} profile`}
                style={styles.profileImage}
                onError={handleImageError}
              />
            ) : (
              <div style={{
                ...styles.profilePlaceholder,
                backgroundColor: theme.accent,
                color: 'white'
              }}>
                {getUserInitials(child.name)}
              </div>
            )}
          </div>
          <div style={styles.nameSection}>
            <div style={styles.childName}>{child.name}</div>
          </div>
        </div>
        <div style={styles.statusContainer}>
          <div style={{
            ...styles.statusIndicator,
            color: status.color
          }}>
            <span style={styles.statusIcon}>{status.icon}</span>
            <span style={styles.statusText}>{status.text}</span>
          </div>
        </div>
      </div>

      {/* Calendar activities section */}
      <div style={styles.activitiesSection}>
        <div style={styles.activitiesLabel}>Next Activities</div>
        
        {nextEvents.length === 0 ? (
          <div style={styles.noActivities}>
            <span style={styles.noActivitiesIcon}>✨</span>
            <span style={styles.noActivitiesText}>No scheduled activities</span>
          </div>
        ) : (
          <div style={styles.activitiesFlow}>
            {nextEvents.map((event, index) => (
              <React.Fragment key={event.id}>
                <div style={styles.activityItem}>
                  <div style={styles.activityName}>{event.title}</div>
                  <div style={styles.activityTime}>
                    {formatTime(event.startTime)}
                  </div>
                </div>
                {index < nextEvents.length - 1 && (
                  <div style={styles.activityArrow}>→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Action button */}
      <div style={styles.actions}>
        <button 
          style={{
            ...styles.editButton,
            borderColor: theme.accent,
            color: theme.accent
          }}
          onClick={() => onEditChild && onEditChild(child)}
        >
          Edit
        </button>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    minWidth: '280px',
    maxWidth: '320px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'var(--transition-normal)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  
  childInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flex: 1
  },
  
  profileContainer: {
    position: 'relative'
  },
  
  profileImage: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '2px solid var(--border-light)'
  },
  
  profilePlaceholder: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    border: '2px solid var(--border-light)'
  },
  
  nameSection: {
    flex: 1,
    minWidth: 0
  },
  
  childName: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)',
    marginBottom: 'var(--space-1)'
  },
  
  
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)'
  },
  
  statusIcon: {
    fontSize: 'var(--font-size-sm)'
  },
  
  statusText: {
    fontSize: 'var(--font-size-xs)'
  },
  
  activitiesSection: {
    backgroundColor: '#fafbfc',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    minHeight: '60px',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)'
  },
  
  activitiesLabel: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  
  noActivities: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) 0'
  },
  
  noActivitiesIcon: {
    fontSize: 'var(--font-size-lg)'
  },
  
  noActivitiesText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic'
  },
  
  activitiesFlow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    flexWrap: 'wrap'
  },
  
  activityItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    minWidth: '80px'
  },
  
  activityName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)'
  },
  
  activityTime: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    fontWeight: 'var(--font-weight-medium)',
    backgroundColor: 'var(--white)',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    alignSelf: 'flex-start'
  },
  
  activityArrow: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-tertiary)',
    fontWeight: 'var(--font-weight-bold)',
    margin: '0 var(--space-1)'
  },
  
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 'var(--space-1)'
  },
  
  editButton: {
    padding: 'var(--space-1) var(--space-3)',
    backgroundColor: 'transparent',
    border: '1px solid',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    minHeight: '28px'
  }
};

export default EnhancedChildCard;