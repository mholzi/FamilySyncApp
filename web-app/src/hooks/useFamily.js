import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import firestoreListenerManager from '../utils/firestoreListenerManager';

export const useFamily = (userId) => {
  const [userData, setUserData] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let unsubscribeChildren = null;

    const fetchInitialData = async () => {
      try {
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const user = { id: userDoc.id, ...userDoc.data() };
        setUserData(user);

        if (!user.familyId) {
          setLoading(false);
          return;
        }

        // Get family data
        const familyDoc = await getDoc(doc(db, 'families', user.familyId));
        if (familyDoc.exists()) {
          setFamilyData({ id: familyDoc.id, ...familyDoc.data() });
        }

        // Set up real-time listener for children using listener manager
        const listenerKey = firestoreListenerManager.createKey('children', {
          familyId: user.familyId,
          isActive: true
        });

        unsubscribeChildren = firestoreListenerManager.registerListener(
          listenerKey,
          () => {
            const childrenQuery = query(
              collection(db, 'children'),
              where('familyId', '==', user.familyId),
              where('isActive', '==', true)
            );

            return onSnapshot(childrenQuery, 
              (snapshot) => {
                try {
                  const childrenData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }));
                  
                  // Deduplicate children by ID to prevent React key warnings
                  const uniqueChildren = childrenData.reduce((acc, child) => {
                    const existingIndex = acc.findIndex(existing => existing.id === child.id);
                    if (existingIndex >= 0) {
                      // Keep the most recent version (last in the array)
                      acc[existingIndex] = child;
                    } else {
                      acc.push(child);
                    }
                    return acc;
                  }, []);
                  
                  console.log('Children fetched:', uniqueChildren.length, 'unique children');
                  setChildren(uniqueChildren);
                } catch (err) {
                  console.error('Error processing children data:', err);
                  setChildren([]);
                }
              }, 
              (error) => {
                console.error('Error listening to children:', error);
                
                // Handle specific Firestore assertion errors
                if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
                  console.warn('Firestore assertion error detected, falling back to empty state');
                  setChildren([]);
                  setError('Connection issue detected. Please refresh the page.');
                  return;
                }
                
                setChildren([]);
                setError('Unable to load children data');
              }
            );
          },
          'useFamily'
        );

        setLoading(false);

      } catch (err) {
        console.error('Error fetching family data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchInitialData();

    // Cleanup function
    return () => {
      if (unsubscribeChildren) {
        unsubscribeChildren();
      }
    };
  }, [userId]);

  return {
    userData,
    familyData,
    children,
    loading,
    error
  };
};