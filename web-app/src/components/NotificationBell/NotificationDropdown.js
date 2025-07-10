import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { format } from 'date-fns';
import './NotificationDropdown.css';

const NotificationDropdown = ({ onClose }) => {
  const dropdownRef = useRef(null);
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead,
    unreadCount 
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Navigate to relevant section based on notification type
    if (notification.eventId) {
      // TODO: Navigate to calendar event
      console.log('Navigate to event:', notification.eventId);
    }
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return format(date, 'MMM d');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'event_created':
        return '➕';
      case 'event_updated':
        return '✏️';
      case 'event_deleted':
        return '🗑️';
      case 'event_cancelled':
        return '❌';
      case 'reminder':
        return '⏰';
      case 'conflict_alert':
        return '⚠️';
      default:
        return '📅';
    }
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <div className="notification-header">
        <h3 className="notification-title">Notifications</h3>
        {unreadCount > 0 && (
          <button 
            className="mark-all-read-btn"
            onClick={markAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>
      
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <span className="no-notifications-icon">🔔</span>
            <p className="no-notifications-text">No new notifications</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-item-title">
                  {notification.title}
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-meta">
                  <span className="notification-time">
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                  {notification.childName && (
                    <>
                      <span className="notification-separator">•</span>
                      <span className="notification-child">
                        {notification.childName}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {!notification.read && (
                <div className="notification-unread-dot" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;