import React from 'react';

const BottomNavigation = ({ currentView, onNavigate, pendingApprovalCount = 0 }) => {
  return (
    <nav style={styles.bottomNav}>
      <div 
        style={{
          ...styles.navItem,
          ...(currentView === 'dashboard' ? styles.navItemActive : {})
        }}
        onClick={() => onNavigate('dashboard')}
      >
        <span style={styles.navIcon}>🏠</span>
        <span style={styles.navLabel}>Home</span>
      </div>
      <div 
        style={{
          ...styles.navItem,
          ...(currentView === 'smart_calendar' ? styles.navItemActive : {})
        }}
        onClick={() => onNavigate('smart_calendar')}
      >
        <span style={styles.navIcon}>📅</span>
        <span style={styles.navLabel}>Calendar</span>
      </div>
      <div 
        style={{
          ...styles.navItem,
          ...(currentView === 'shopping' ? styles.navItemActive : {}),
          position: 'relative'
        }}
        onClick={() => onNavigate('shopping')}
      >
        <span style={styles.navIcon}>🛒</span>
        <span style={styles.navLabel}>Shopping</span>
        {pendingApprovalCount > 0 && (
          <div style={styles.badge}>
            {pendingApprovalCount}
          </div>
        )}
      </div>
      <div 
        style={{
          ...styles.navItem,
          ...(currentView === 'messages' ? styles.navItemActive : {})
        }}
        onClick={() => onNavigate('messages')}
      >
        <span style={styles.navIcon}>📧</span>
        <span style={styles.navLabel}>Messages</span>
      </div>
      <div 
        style={{
          ...styles.navItem,
          ...(currentView === 'profile' ? styles.navItemActive : {})
        }}
        onClick={() => onNavigate('profile')}
      >
        <span style={styles.navIcon}>👤</span>
        <span style={styles.navLabel}>Profile</span>
      </div>
    </nav>
  );
};

const styles = {
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '10px 0 25px 0',
    borderTop: '1px solid #E5E5EA',
    boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
    zIndex: 1000
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    cursor: 'pointer',
    padding: '8px 4px',
    borderRadius: '8px',
    transition: 'background-color 0.2s'
  },
  navItemActive: {
    backgroundColor: '#E3F2FD'
  },
  navIcon: {
    fontSize: '20px'
  },
  navLabel: {
    fontSize: '10px',
    color: '#8E8E93'
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '8px',
    backgroundColor: '#FF3B30',
    color: 'white',
    borderRadius: '10px',
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '600'
  }
};

export default BottomNavigation;