import React from 'react';

const ShoppingListTaskCard = ({ list, onNavigate }) => {
  // Items are always stored as objects, not arrays
  const items = Object.values(list.items || {});
  
  const completedItems = items.filter(item => item.isPurchased).length;
  const totalItems = items.length;
  const remainingItems = totalItems - completedItems;
  const isCompleted = totalItems > 0 && completedItems === totalItems;

  const getScheduleDisplay = () => {
    if (!list.scheduledFor && !list.scheduledOption) return '';
    
    if (list.scheduledOption === 'this-week') return 'This week';
    
    if (list.scheduledFor) {
      const scheduledDate = new Date(list.scheduledFor);
      const now = new Date();
      
      // Check if overdue (scheduled time has passed)
      if (scheduledDate < now) return 'Overdue';
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      // Reset hours for date comparison
      const scheduleDay = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      
      if (scheduleDay.getTime() === todayDay.getTime()) {
        const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Today at ${timeStr}`;
      }
      if (scheduleDay.getTime() === tomorrowDay.getTime()) {
        const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Tomorrow at ${timeStr}`;
      }
      
      // Show day after tomorrow or specific date with time
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(tomorrow.getDate() + 1);
      const dayAfterDay = new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate());
      
      if (scheduleDay.getTime() === dayAfterDay.getTime()) {
        const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Day after tomorrow at ${timeStr}`;
      }
      
      return scheduledDate.toLocaleDateString() + ' at ' + scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return '';
  };

  const scheduleDisplay = getScheduleDisplay();
  const isOverdue = scheduleDisplay === 'Overdue';

  const handleClick = () => {
    if (onNavigate) {
      onNavigate('shopping');
    }
  };

  return (
    <div 
      style={{
        ...styles.taskCard,
        ...(isOverdue ? styles.overdueCard : {})
      }}
      onClick={handleClick}
    >
      <div style={styles.taskHeader}>
        <div style={styles.taskIcon}>🛒</div>
        <div style={styles.taskContent}>
          <div style={styles.titleRow}>
            <h4 style={styles.taskTitle}>{list.name}</h4>
            {scheduleDisplay && (
              <span style={{
                ...styles.scheduleBadge,
                ...(isOverdue ? styles.overdueBadge : {})
              }}>
                {scheduleDisplay}
              </span>
            )}
          </div>
          <p style={styles.taskDescription}>
            {totalItems === 0 
              ? 'No items added yet'
              : isCompleted 
                ? `All ${totalItems} items completed ✓`
                : `${remainingItems} of ${totalItems} items remaining`
            }
          </p>
        </div>
      </div>
      {isCompleted && (
        <div style={styles.completedBadge}>
          Complete
        </div>
      )}
    </div>
  );
};

const styles = {
  taskCard: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    marginBottom: '8px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  taskHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  taskIcon: {
    fontSize: '20px',
    minWidth: '20px'
  },
  taskContent: {
    flex: 1,
    minWidth: 0
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px'
  },
  taskTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    flex: 1
  },
  scheduleBadge: {
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    padding: '2px 8px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '11px',
    fontWeight: '500',
    marginLeft: '8px',
    whiteSpace: 'nowrap'
  },
  overdueBadge: {
    backgroundColor: 'var(--md-sys-color-error-container)',
    color: 'var(--md-sys-color-on-error-container)'
  },
  overdueCard: {
    borderColor: 'var(--md-sys-color-error)',
    borderWidth: '2px',
    backgroundColor: 'var(--md-sys-color-error-container)'
  },
  taskDescription: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4'
  },
  completedBadge: {
    marginTop: '8px',
    backgroundColor: 'var(--md-sys-color-secondary-container)',
    color: 'var(--md-sys-color-on-secondary-container)',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '12px',
    fontWeight: '500',
    alignSelf: 'flex-start'
  }
};

export default ShoppingListTaskCard;