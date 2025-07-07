import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Create a new time-off request (babysitting or holiday)
 */
export const createTimeOffRequest = async (familyId, requestData) => {
  try {
    const requestRef = await addDoc(collection(db, 'families', familyId, 'timeOffRequests'), {
      ...requestData,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      familyId
    });
    
    console.log('Time-off request created:', requestRef.id);
    return requestRef.id;
  } catch (error) {
    console.error('Error creating time-off request:', error);
    throw error;
  }
};

/**
 * Respond to a time-off request (accept/decline/acknowledge)
 */
export const respondToTimeOffRequest = async (familyId, requestId, status, response = '') => {
  try {
    const requestRef = doc(db, 'families', familyId, 'timeOffRequests', requestId);
    
    const updateData = {
      status,
      response: response.trim(),
      respondedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await updateDoc(requestRef, updateData);
    
    console.log('Response submitted:', { requestId, status });
    
    // If accepted and it's a babysitting request, create calendar event
    if (status === 'accepted') {
      // We need to get the request data to create the calendar event
      // This will be handled by the calling component
    }
    
    return { success: true, status };
  } catch (error) {
    console.error('Error responding to request:', error);
    throw error;
  }
};

/**
 * Listen to time-off requests for a family
 */
export const useTimeOffRequests = (familyId, userId, userRole) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!familyId || !userId) {
      setLoading(false);
      return;
    }

    try {
      let q;
      
      // Use simpler queries to avoid composite index requirements
      // We'll sort in memory instead of using orderBy with where
      if (userRole === 'parent') {
        q = query(
          collection(db, 'families', familyId, 'timeOffRequests'),
          where('requestedBy', '==', userId)
        );
      } else {
        // Au pairs see all requests for their family (since they're the only au pair)
        q = query(
          collection(db, 'families', familyId, 'timeOffRequests')
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in memory by createdAt descending
        requestsData.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return timeB - timeA;
        });
        
        setRequests(requestsData);
        setLoading(false);
        setError(null);
      }, (err) => {
        console.error('Error listening to requests:', err);
        setError(err.message);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up requests listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [familyId, userId, userRole]);

  return { requests, loading, error };
};

/**
 * Create calendar event from accepted request
 */
export const createCalendarEventFromRequest = async (familyId, request) => {
  try {
    const eventData = {
      title: request.title,
      description: request.description || '',
      startTime: request.startTime,
      endTime: request.endTime,
      type: request.type === 'babysitting' ? 'babysitting' : 'family_away',
      children: request.children,
      createdBy: request.requestedBy,
      assignedTo: request.type === 'babysitting' ? [request.targetUser] : [],
      source: 'timeOffRequest',
      sourceRequestId: request.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const eventRef = await addDoc(collection(db, 'families', familyId, 'calendar'), eventData);
    
    // Update the request to link to the calendar event
    const requestRef = doc(db, 'families', familyId, 'timeOffRequests', request.id);
    await updateDoc(requestRef, {
      calendarEventId: eventRef.id,
      updatedAt: Timestamp.now()
    });

    console.log('Calendar event created from request:', eventRef.id);
    return eventRef.id;
  } catch (error) {
    console.error('Error creating calendar event from request:', error);
    throw error;
  }
};

/**
 * Get pending requests count for notifications
 */
export const getPendingRequestsCount = (requests, userRole) => {
  if (userRole === 'parent') {
    // Parents see count of responses received
    return requests.filter(req => req.status !== 'pending').length;
  } else {
    // Au pairs see count of pending requests to respond to
    return requests.filter(req => req.status === 'pending').length;
  }
};

/**
 * Format request for display
 */
export const formatRequestForDisplay = (request) => {
  const startDate = request.startTime?.toDate ? request.startTime.toDate() : new Date(request.startTime);
  const endDate = request.endTime?.toDate ? request.endTime.toDate() : new Date(request.endTime);
  
  return {
    ...request,
    formattedStartTime: startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    formattedEndTime: endDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    isUpcoming: startDate > new Date(),
    isPast: endDate < new Date(),
    isToday: startDate.toDateString() === new Date().toDateString()
  };
};