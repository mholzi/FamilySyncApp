import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import './NotificationBell.css';

const NotificationBell = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { unreadCount, loading } = useNotifications();

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleCloseDropdown = () => {
    setShowDropdown(false);
  };

  if (loading) {
    return (
      <div className="notification-bell-container">
        <div className="notification-bell loading">
          <span className="bell-icon">🔔</span>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell"
        onClick={handleToggleDropdown}
        aria-label="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {showDropdown && (
        <NotificationDropdown onClose={handleCloseDropdown} />
      )}
    </div>
  );
};

export default NotificationBell;