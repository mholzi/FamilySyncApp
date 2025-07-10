import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { useFamily } from './useFamily';
import { 
  subscribeToNotifications, 
  markNotificationAsRead,
  NOTIFICATION_TYPES 
} from '../utils/notificationUtils';

export const useNotifications = () => {
  const [user] = useAuthState(auth);
  const { familyData, userRole } = useFamily();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !familyData || !userRole) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Subscribe to notifications
    const unsubscribe = subscribeToNotifications(
      familyData.id,
      userRole,
      user.uid,
      (notificationsList) => {
        setNotifications(notificationsList);
        setUnreadCount(notificationsList.filter(n => !n.read).length);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, familyData, userRole]);

  const markAsRead = async (notificationId) => {
    if (!familyData) return;
    
    try {
      await markNotificationAsRead(familyData.id, notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!familyData) return;
    
    try {
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => markNotificationAsRead(familyData.id, n.id))
      );
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Get notifications by type
  const getNotificationsByType = (type) => {
    return notifications.filter(n => n.type === type);
  };

  // Get recent notifications (last 24 hours)
  const getRecentNotifications = () => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return notifications.filter(n => {
      const createdAt = n.createdAt?.toDate() || new Date();
      return createdAt > oneDayAgo;
    });
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    getNotificationsByType,
    getRecentNotifications,
    NOTIFICATION_TYPES
  };
};