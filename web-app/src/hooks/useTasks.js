import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const useTasks = (familyId, userId) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!familyId || !userId) {
      setLoading(false);
      return;
    }

    try {
      // Get today's date range
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      // Query for today's tasks assigned to current user
      const tasksQuery = query(
        collection(db, 'families', familyId, 'tasks'),
        where('assignedTo', '==', userId),
        where('dueDate', '>=', Timestamp.fromDate(startOfDay)),
        where('dueDate', '<', Timestamp.fromDate(endOfDay)),
        orderBy('dueDate', 'asc')
      );

      const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate(), // Convert Timestamp to Date
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          completedAt: doc.data().completedAt?.toDate()
        }));
        
        setTasks(tasksData);
        setLoading(false);
      }, (err) => {
        console.error('Error fetching tasks:', err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();

    } catch (err) {
      console.error('Error setting up tasks listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [familyId, userId]);

  return {
    tasks,
    loading,
    error
  };
};