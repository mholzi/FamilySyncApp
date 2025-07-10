import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';

// Notification types
export const NOTIFICATION_TYPES = {
  EVENT_CREATED: 'event_created',
  EVENT_UPDATED: 'event_updated',
  EVENT_DELETED: 'event_deleted',
  EVENT_CANCELLED: 'event_cancelled',
  REMINDER: 'reminder',
  CONFLICT_ALERT: 'conflict_alert'
};

// Create a notification
export const createNotification = async (familyId, notification) => {
  try {
    const notificationData = {
      ...notification,
      createdAt: serverTimestamp(),
      read: false,
      acknowledged: false
    };

    const notificationsRef = collection(db, 'families', familyId, 'notifications');
    const docRef = await addDoc(notificationsRef, notificationData);
    
    return { id: docRef.id, ...notificationData };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Send event change notification to parents
export const notifyParentsOfEventChange = async (familyId, eventData, changeType, changedBy) => {
  try {
    const notification = {
      type: changeType,
      title: getNotificationTitle(changeType, eventData),
      message: getNotificationMessage(changeType, eventData, changedBy),
      eventId: eventData.id,
      eventTitle: eventData.title,
      eventDate: eventData.date,
      eventTime: eventData.time || eventData.startTime,
      childId: eventData.childId,
      childName: eventData.childName,
      changedBy: changedBy.uid,
      changedByName: changedBy.displayName || changedBy.email,
      targetRole: 'parent', // Only parents receive these notifications
      priority: 'high'
    };

    return await createNotification(familyId, notification);
  } catch (error) {
    console.error('Error notifying parents:', error);
    throw error;
  }
};

// Get notification title based on change type
const getNotificationTitle = (changeType, eventData) => {
  switch (changeType) {
    case NOTIFICATION_TYPES.EVENT_CREATED:
      return `New Event Added: ${eventData.title}`;
    case NOTIFICATION_TYPES.EVENT_UPDATED:
      return `Event Updated: ${eventData.title}`;
    case NOTIFICATION_TYPES.EVENT_DELETED:
      return `Event Deleted: ${eventData.title}`;
    case NOTIFICATION_TYPES.EVENT_CANCELLED:
      return `Event Cancelled: ${eventData.title}`;
    default:
      return `Calendar Update: ${eventData.title}`;
  }
};

// Get notification message based on change type
const getNotificationMessage = (changeType, eventData, changedBy) => {
  const childName = eventData.childName || 'your child';
  const eventTime = eventData.time || eventData.startTime || '';
  
  switch (changeType) {
    case NOTIFICATION_TYPES.EVENT_CREATED:
      return `${changedBy.displayName || 'Au Pair'} added a new event "${eventData.title}" for ${childName} at ${eventTime}`;
    case NOTIFICATION_TYPES.EVENT_UPDATED:
      return `${changedBy.displayName || 'Au Pair'} updated the event "${eventData.title}" for ${childName}`;
    case NOTIFICATION_TYPES.EVENT_DELETED:
      return `${changedBy.displayName || 'Au Pair'} deleted the event "${eventData.title}" for ${childName}`;
    case NOTIFICATION_TYPES.EVENT_CANCELLED:
      return `${changedBy.displayName || 'Au Pair'} cancelled the event "${eventData.title}" for ${childName} scheduled for ${eventTime}`;
    default:
      return `${changedBy.displayName || 'Au Pair'} made changes to "${eventData.title}" for ${childName}`;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (familyId, notificationId) => {
  try {
    const notificationRef = doc(db, 'families', familyId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Subscribe to notifications for a user
export const subscribeToNotifications = (familyId, userRole, userId, callback) => {
  const notificationsRef = collection(db, 'families', familyId, 'notifications');
  
  // Query notifications for this user's role that are unread
  const q = query(
    notificationsRef,
    where('targetRole', '==', userRole),
    where('read', '==', false)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by creation date, newest first
    notifications.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
    
    callback(notifications);
  });
};

// Create a reminder notification
export const createReminderNotification = async (familyId, eventData, reminderMinutes = 15) => {
  try {
    const notification = {
      type: NOTIFICATION_TYPES.REMINDER,
      title: `Reminder: ${eventData.title}`,
      message: `${eventData.title} starts in ${reminderMinutes} minutes`,
      eventId: eventData.id,
      eventTitle: eventData.title,
      eventDate: eventData.date,
      eventTime: eventData.time || eventData.startTime,
      childId: eventData.childId,
      childName: eventData.childName,
      targetRole: eventData.responsibility === 'au_pair' ? 'aupair' : 'parent',
      priority: 'high',
      reminderTime: reminderMinutes
    };

    // If there's transportation involved, add leave-by information
    if (eventData.travelTime && eventData.dropOffResponsibility) {
      notification.leaveByTime = calculateLeaveByTime(eventData.time || eventData.startTime, eventData.travelTime);
      notification.message += ` - Leave by ${notification.leaveByTime}`;
    }

    return await createNotification(familyId, notification);
  } catch (error) {
    console.error('Error creating reminder:', error);
    throw error;
  }
};

// Calculate leave-by time
const calculateLeaveByTime = (eventTime, travelMinutes) => {
  const [hours, minutes] = eventTime.split(':').map(Number);
  const eventDate = new Date();
  eventDate.setHours(hours, minutes, 0, 0);
  eventDate.setMinutes(eventDate.getMinutes() - travelMinutes);
  
  return eventDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};