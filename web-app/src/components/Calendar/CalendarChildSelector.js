import React from 'react';

const CalendarChildSelector = ({ 
  children, 
  selectedChildren, 
  onSelectionChange, 
  userRole 
}) => {
  // Handle empty or invalid children prop
  if (!children || !Array.isArray(children) || children.length === 0) {
    return null; // Don't show the selector if no children
  }
  
  const handleChildToggle = (childId) => {
    if (selectedChildren === 'all') {
      // Switch to single child selection
      onSelectionChange([childId]);
    } else if (Array.isArray(selectedChildren)) {
      if (selectedChildren.includes(childId)) {
        // Remove child from selection
        const newSelection = selectedChildren.filter(id => id !== childId);
        if (newSelection.length === 0) {
          onSelectionChange('all');
        } else {
          onSelectionChange(newSelection);
        }
      } else {
        // Add child to selection
        onSelectionChange([...selectedChildren, childId]);
      }
    }
  };

  const handleViewModeToggle = () => {
    if (selectedChildren === 'all') {
      // Switch to single child mode (select first child)
      onSelectionChange(children.length > 0 ? [children[0].id] : []);
    } else {
      // Switch to all children mode
      onSelectionChange('all');
    }
  };

  const isChildSelected = (childId) => {
    if (selectedChildren === 'all') return true;
    return Array.isArray(selectedChildren) && selectedChildren.includes(childId);
  };

  const getChildColor = (childId, index) => {
    // Simple color assignment based on index
    const colors = [
      '#7C3AED', '#EC4899', '#F59E0B', '#10B981', 
      '#3B82F6', '#06B6D4', '#8B5CF6', '#F97316'
    ];
    return colors[index % colors.length];
  };

  return (
    <div style={styles.container}>
      <div style={styles.toggleGroup}>
        {/* All Kids / Family button */}
        <button
          style={{
            ...styles.toggleButton,
            ...(selectedChildren === 'all' ? styles.toggleButtonActive : {})
          }}
          onClick={() => onSelectionChange('all')}
        >
          All Kids
        </button>
        
        {/* Individual child buttons */}
        {children.map((child, index) => (
          <button
            key={child.id}
            style={{
              ...styles.toggleButton,
              ...(selectedChildren !== 'all' && selectedChildren.includes(child.id) ? styles.toggleButtonActive : {})
            }}
            onClick={() => {
              if (selectedChildren === 'all') {
                onSelectionChange([child.id]);
              } else {
                onSelectionChange('all');
              }
            }}
          >
            {child.name}
          </button>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    margin: '0 16px 16px',
  },
  toggleGroup: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '4px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  toggleButton: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    backgroundColor: 'transparent',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    whiteSpace: 'nowrap'
  },
  toggleButtonActive: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center'
  },
  emptyText: {
    color: 'var(--md-sys-color-on-surface-variant)',
    font: 'var(--md-sys-typescale-body-medium-font)'
  }
};

export default CalendarChildSelector;