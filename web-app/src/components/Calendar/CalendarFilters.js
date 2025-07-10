import React from 'react';

const CalendarFilters = ({ 
  selectedFilters = { responsibility: 'all', childId: 'all' },
  onFilterChange,
  children = [],
  currentUserRole
}) => {
  const handleResponsibilityChange = (value) => {
    onFilterChange({ ...selectedFilters, responsibility: value });
  };

  const handleChildChange = (value) => {
    onFilterChange({ ...selectedFilters, childId: value });
  };

  const responsibilityOptions = [
    { value: 'all', label: 'All' },
    { value: 'aupair', label: 'Aupair' },
    { value: 'parent', label: 'Parent' },
    ...(currentUserRole === 'au_pair' ? [{ value: 'my_events', label: 'My Events' }] : [])
  ];

  const childOptions = [
    { value: 'all', label: 'All Kids' },
    ...children.map(child => ({ value: child.id, label: child.name }))
  ];

  return (
    <div style={styles.container}>
      {/* Responsibility Filter */}
      <div style={styles.filterGroup}>
        <label style={styles.filterLabel}>Responsibility</label>
        <div style={styles.toggleGroup}>
          {responsibilityOptions.map(option => (
            <button
              key={option.value}
              style={{
                ...styles.toggleButton,
                ...(selectedFilters.responsibility === option.value ? styles.toggleButtonActive : {})
              }}
              onClick={() => handleResponsibilityChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Child Filter */}
      <div style={styles.filterGroup}>
        <label style={styles.filterLabel}>Child</label>
        <div style={styles.toggleGroup}>
          {childOptions.map(option => (
            <button
              key={option.value}
              style={{
                ...styles.toggleButton,
                ...(selectedFilters.childId === option.value ? styles.toggleButtonActive : {})
              }}
              onClick={() => handleChildChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '12px 16px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    marginBottom: '16px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)'
  },
  toggleGroup: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '4px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    flexWrap: 'wrap'
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
    whiteSpace: 'nowrap',
    minWidth: 'auto'
  },
  toggleButtonActive: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  }
};

export default CalendarFilters;