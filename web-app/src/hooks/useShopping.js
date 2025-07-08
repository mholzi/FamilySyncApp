import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import firestoreListenerManager from '../utils/firestoreListenerManager';

export const useShopping = (familyId) => {
  const [shoppingLists, setShoppingLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      setShoppingLists([]);
      return;
    }

    let unsubscribe = null;

    const setupListener = async () => {
      try {
        // Create unique listener key for this family's shopping
        const listenerKey = firestoreListenerManager.createKey('shopping', {
          familyId: familyId
        });

        unsubscribe = firestoreListenerManager.registerListener(
          listenerKey,
          () => {
            const shoppingQuery = query(
              collection(db, 'families', familyId, 'shopping'),
              orderBy('createdAt', 'desc')
            );

            return onSnapshot(shoppingQuery, 
              (snapshot) => {
                try {
                  const allShoppingData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate()
              }));
              
              // Filter out archived items client-side
              const activeShoppingData = allShoppingData.filter(list => !list.isArchived);
              
              setShoppingLists(activeShoppingData);
              setLoading(false);
              setError(null);
            } catch (err) {
              console.error('Error processing shopping lists:', err);
              setError(err.message);
              setShoppingLists([]);
            }
          }, 
          (err) => {
            console.error('Error fetching shopping lists:', err);
            // If it's a permission error or index error, set empty list
            if (err.code === 'permission-denied' || err.code === 'failed-precondition') {
              setShoppingLists([]);
              setError('Unable to load shopping lists. Please check permissions.');
            } else {
              setError(err.message);
            }
            setLoading(false);
          }
        );
          },
          'useShopping'
        );
      } catch (err) {
        console.error('Error setting up shopping listener:', err);
        setError(err.message);
        setShoppingLists([]);
        setLoading(false);
      }
    };

    setupListener();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [familyId]);

  return {
    shoppingLists,
    loading,
    error
  };
};