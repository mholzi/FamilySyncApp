import React from 'react';

const CalendarChildSelector = ({ 
  children, 
  selectedChildren, 
  onSelectionChange, 
  userRole 
}) => {
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
      <div style={styles.selectorRow}>
        {/* View mode toggle */}
        <button 
          style={styles.viewModeButton}
          onClick={handleViewModeToggle}
        >
          {selectedChildren === 'all' ? 'Family View' : 'Single View'}
        </button>

        {/* Child buttons */}
        <div style={styles.childButtons}>
          {children.map((child, index) => {
            const isSelected = isChildSelected(child.id);
            const childColor = getChildColor(child.id, index);
            
            return (
              <button
                key={child.id}
                style={{
                  ...styles.childButton,
                  ...(isSelected ? {
                    ...styles.childButtonSelected,
                    backgroundColor: `${childColor}15`,
                    borderColor: childColor,
                    color: childColor
                  } : styles.childButtonUnselected)
                }}
                onClick={() => handleChildToggle(child.id)}
              >
                <div style={styles.childButtonContent}>
                  {child.profilePictureUrl ? (
                    <img 
                      src={child.profilePictureUrl} 
                      alt={child.name}
                      style={styles.childAvatar}
                    />
                  ) : (
                    <div style={{
                      ...styles.childAvatarPlaceholder,
                      backgroundColor: childColor
                    }}>
                      {child.name.charAt(0)}
                    </div>
                  )}
                  <span style={styles.childName}>{child.name}</span>
                </div>
              </button>
            );
          })}

          {/* All Kids button */}
          <button
            style={{
              ...styles.childButton,
              ...(selectedChildren === 'all' ? styles.allKidsSelected : styles.childButtonUnselected)
            }}
            onClick={() => onSelectionChange('all')}
          >
            <div style={styles.childButtonContent}>
              <div style={styles.allKidsIcon}>👥</div>
              <span style={styles.childName}>All Kids</span>
            </div>
          </button>
        </div>

        {/* Selection info */}
        <div style={styles.selectionInfo}>
          {selectedChildren === 'all' ? (
            <span style={styles.infoText}>Showing all children</span>
          ) : (
            <span style={styles.infoText}>
              {Array.isArray(selectedChildren) ? selectedChildren.length : 0} selected
            </span>
          )}
        </div>
      </div>

      {/* View mode explanation */}
      <div style={styles.helpText}>
        {selectedChildren === 'all' ? (
          <span>👥 Family view: See shared events and all activities together</span>
        ) : (
          <span>👤 Focus view: See individual schedule with full details</span>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'var(--white)',
    borderBottom: '1px solid var(--border-light)',
    padding: 'var(--space-4) var(--space-5)'
  },
  selectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-2)'
  },
  viewModeButton: {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--gray-100)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    whiteSpace: 'nowrap'
  },
  childButtons: {
    display: 'flex',
    gap: 'var(--space-2)',
    flex: 1,
    overflowX: 'auto',
    paddingBottom: 'var(--space-1)'
  },
  childButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: '2px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--white)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    minWidth: '100px',
    whiteSpace: 'nowrap'
  },
  childButtonSelected: {
    borderWidth: '2px',
    fontWeight: 'var(--font-weight-semibold)'
  },
  childButtonUnselected: {
    borderColor: 'var(--border-light)',
    color: 'var(--text-secondary)'
  },
  allKidsSelected: {
    backgroundColor: 'var(--primary-purple)',
    borderColor: 'var(--primary-purple)',
    color: 'var(--white)'
  },
  childButtonContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-1)'
  },
  childAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover'
  },
  childAvatarPlaceholder: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--white)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)'
  },
  allKidsIcon: {
    fontSize: 'var(--font-size-xl)',
    lineHeight: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  childName: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)'
  },
  selectionInfo: {
    padding: 'var(--space-2)',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap'
  },
  infoText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)'
  },
  helpText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    textAlign: 'center'
  }
};

export default CalendarChildSelector;