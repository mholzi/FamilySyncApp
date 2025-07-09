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
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      // Reset hours for date comparison
      const scheduleDay = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      
      if (scheduleDay.getTime() === todayDay.getTime()) return 'Today';
      if (scheduleDay.getTime() === tomorrowDay.getTime()) return 'Tomorrow';
      
      // Check if overdue
      if (scheduleDay < todayDay) return 'Overdue';
      
      // Show day after tomorrow or specific date
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(tomorrow.getDate() + 1);
      const dayAfterDay = new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate());
      
      if (scheduleDay.getTime() === dayAfterDay.getTime()) return 'Day after tomorrow';
      
      return scheduledDate.toLocaleDateString();
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
      style={styles.taskCard}
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
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '8px',
    ':hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transform: 'translateY(-1px)'
    }
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
    color: '#1f2937',
    flex: 1
  },
  scheduleBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0277bd',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    marginLeft: '8px',
    whiteSpace: 'nowrap'
  },
  overdueBadge: {
    backgroundColor: '#ffebee',
    color: '#c62828'
  },
  taskDescription: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4'
  },
  completedBadge: {
    marginTop: '8px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    alignSelf: 'flex-start'
  }
};

export default ShoppingListTaskCard;