import React from 'react';

const BottomNavigation = ({ currentView, onNavigate, pendingApprovalCount = 0, unansweredQuestionsCount = 0 }) => {
  const getNavItemStyle = (viewName) => ({
    cursor: 'pointer',
    color: currentView === viewName ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
    backgroundColor: currentView === viewName ? 'var(--md-sys-color-primary-container)' : 'transparent',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    position: 'relative',
    margin: '4px'
  });

  const getIconStyle = (viewName) => ({
    marginBottom: '2px',
    fontSize: currentView === viewName ? '24px' : '20px',
    transition: 'font-size var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  });

  return (
    <nav className="md3-surface-container md3-elevation-2" style={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      zIndex: 1000,
      borderTop: '1px solid var(--md-sys-color-outline-variant)' 
    }}>
      <div className="md3-flex">
        <div 
          className={`md3-flex-1 md3-flex md3-flex-column md3-flex-center md3-p-12 md3-touch-target`}
          style={getNavItemStyle('dashboard')}
          onClick={() => onNavigate('dashboard')}
        >
          <span className="md3-title-medium" style={getIconStyle('dashboard')}>🏠</span>
          <span className="md3-label-small">Home</span>
        </div>
        <div 
          className={`md3-flex-1 md3-flex md3-flex-column md3-flex-center md3-p-12 md3-touch-target`}
          style={getNavItemStyle('calendar')}
          onClick={() => onNavigate('calendar')}
        >
          <span className="md3-title-medium" style={getIconStyle('calendar')}>📅</span>
          <span className="md3-label-small">Calendar</span>
        </div>
        <div 
          className={`md3-flex-1 md3-flex md3-flex-column md3-flex-center md3-p-12 md3-touch-target`}
          style={getNavItemStyle('shopping')}
          onClick={() => onNavigate('shopping')}
        >
          <span className="md3-title-medium" style={getIconStyle('shopping')}>🛒</span>
          <span className="md3-label-small">Shopping</span>
          {pendingApprovalCount > 0 && (
            <div style={{ 
              position: 'absolute',
              top: '-2px',
              right: '8px',
              width: '20px',
              height: '20px',
              borderRadius: 'var(--md-sys-shape-corner-full)',
              backgroundColor: 'var(--md-sys-color-error)',
              color: 'var(--md-sys-color-on-error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {pendingApprovalCount}
            </div>
          )}
        </div>
        <div 
          className={`md3-flex-1 md3-flex md3-flex-column md3-flex-center md3-p-12 md3-touch-target`}
          style={getNavItemStyle('messages')}
          onClick={() => onNavigate('messages')}
        >
          <span className="md3-title-medium" style={getIconStyle('messages')}>💬</span>
          <span className="md3-label-small">Messages</span>
          {unansweredQuestionsCount > 0 && (
            <div style={{ 
              position: 'absolute',
              top: '-2px',
              right: '8px',
              width: '20px',
              height: '20px',
              borderRadius: 'var(--md-sys-shape-corner-full)',
              backgroundColor: 'var(--md-sys-color-error)',
              color: 'var(--md-sys-color-on-error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {unansweredQuestionsCount}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};


export default BottomNavigation;