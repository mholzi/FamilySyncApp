import React, { useState, useEffect } from 'react';

const ReminderAlert = ({ notification, onDismiss, onSnooze }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 100);
  }, []);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 300);
  };

  const handleSnooze = (minutes) => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onSnooze(minutes);
    }, 300);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeStr;
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      style={{
        ...styles.container,
        transform: isAnimating ? 'translateX(0)' : 'translateX(100%)'
      }}
    >
      <div style={styles.alert}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.reminderIcon}>⏰</div>
            <div style={styles.headerText}>
              <div style={styles.reminderLabel}>Reminder</div>
              <div style={styles.timeText}>
                Starting in {notification.reminderTime || 15} minutes
              </div>
            </div>
          </div>
          <button style={styles.closeButton} onClick={handleDismiss}>
            ×
          </button>
        </div>

        {/* Event Details */}
        <div style={styles.eventDetails}>
          <div style={styles.eventTitle}>{notification.eventTitle}</div>
          <div style={styles.eventInfo}>
            <span style={styles.eventTime}>
              {formatTime(notification.eventTime)}
            </span>
            {notification.childName && (
              <>
                <span style={styles.separator}>•</span>
                <span style={styles.childName}>{notification.childName}</span>
              </>
            )}
          </div>
          
          {notification.leaveByTime && (
            <div style={styles.leaveByAlert}>
              🚗 Leave by: {notification.leaveByTime}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button 
            style={styles.snoozeButton}
            onClick={() => handleSnooze(5)}
          >
            Snooze 5m
          </button>
          <button 
            style={styles.snoozeButton}
            onClick={() => handleSnooze(10)}
          >
            Snooze 10m
          </button>
          <button 
            style={styles.dismissButton}
            onClick={handleDismiss}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    transition: 'transform 0.3s ease-in-out',
    maxWidth: '360px',
    width: '100%',
    pointerEvents: 'auto'
  },
  alert: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    border: '1px solid var(--border-light)',
    overflow: 'hidden',
    animation: 'slideIn 0.3s ease-out'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)'
  },
  reminderIcon: {
    fontSize: 'var(--font-size-xl)',
    lineHeight: 1
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)'
  },
  reminderLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    opacity: 0.9
  },
  timeText: {
    fontSize: 'var(--font-size-xs)',
    opacity: 0.8
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'var(--white)',
    fontSize: 'var(--font-size-xl)',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    opacity: 0.8,
    transition: 'opacity 0.2s'
  },
  eventDetails: {
    padding: 'var(--space-4)'
  },
  eventTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  eventInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-2)'
  },
  eventTime: {
    fontWeight: 'var(--font-weight-medium)'
  },
  separator: {
    color: 'var(--text-tertiary)'
  },
  childName: {
    color: 'var(--primary-purple)',
    fontWeight: 'var(--font-weight-medium)'
  },
  leaveByAlert: {
    backgroundColor: 'var(--warning-light)',
    color: 'var(--warning-dark)',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    border: '1px solid var(--warning-border)'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-2)',
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--border-light)',
    backgroundColor: 'var(--gray-50)'
  },
  snoozeButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--border-medium)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  dismissButton: {
    flex: 1,
    padding: 'var(--space-2) var(--space-4)',
    border: 'none',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  }
};

export default ReminderAlert;