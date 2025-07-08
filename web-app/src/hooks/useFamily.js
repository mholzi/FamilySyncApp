import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

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

        // Set up real-time listener for children
        const childrenQuery = query(
          collection(db, 'children'),
          where('familyId', '==', user.familyId),
          where('isActive', '==', true)
        );

        unsubscribeChildren = onSnapshot(childrenQuery, (snapshot) => {
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
        }, (error) => {
          console.error('Error listening to children:', error);
          // Clean up the previous listener before setting up fallback
          if (unsubscribeChildren) {
            unsubscribeChildren();
          }
          
          // Fallback: try without isActive filter
          const fallbackQuery = query(
            collection(db, 'children'),
            where('familyId', '==', user.familyId)
          );
          
          unsubscribeChildren = onSnapshot(fallbackQuery, (snapshot) => {
            const childrenData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Deduplicate children by ID
            const uniqueChildren = childrenData.reduce((acc, child) => {
              const existingIndex = acc.findIndex(existing => existing.id === child.id);
              if (existingIndex >= 0) {
                acc[existingIndex] = child;
              } else {
                acc.push(child);
              }
              return acc;
            }, []);
            
            console.log('Children fetched (fallback):', uniqueChildren.length, 'unique children');
            setChildren(uniqueChildren);
          });
        });

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