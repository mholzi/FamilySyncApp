import React from 'react';

const ShoppingListTaskCard = ({ list, onNavigate }) => {
  const items = Array.isArray(list.items) 
    ? list.items 
    : Object.values(list.items || {});
  
  const completedItems = items.filter(item => item.isPurchased).length;
  const totalItems = items.length;
  const remainingItems = totalItems - completedItems;
  const isCompleted = totalItems > 0 && completedItems === totalItems;

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
          <h4 style={styles.taskTitle}>{list.name}</h4>
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
  taskTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
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