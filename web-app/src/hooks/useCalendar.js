import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const useCalendar = (familyId, userId) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!familyId || !userId) {
      setLoading(false);
      return;
    }

    try {
      // Get events from today's start (not current time) to show all of today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const eventsQuery = query(
        collection(db, 'families', familyId, 'calendar'),
        where('startTime', '>=', Timestamp.fromDate(today)),
        orderBy('startTime', 'asc'),
        limit(50) // Add reasonable limit for performance
      );

      const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
          endTime: doc.data().endTime?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        }));
        
        setEvents(eventsData);
        setLoading(false);
      }, (err) => {
        console.error('Error fetching calendar events:', err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();

    } catch (err) {
      console.error('Error setting up calendar listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [familyId, userId]);

  return {
    events,
    loading,
    error
  };
};