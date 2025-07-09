import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import firestoreListenerManager from '../utils/firestoreListenerManager';
import { createUserFriendlyError } from '../utils/shoppingValidation';

export const useShopping = (familyId) => {
  const [shoppingLists, setShoppingLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      setShoppingLists([]);
      setError(null);
      return;
    }

    let unsubscribe = null;
    let retryTimeout = null;

    const setupListener = async () => {
      try {
        setLoading(true);
        setError(null);

        // Validate familyId
        if (typeof familyId !== 'string' || familyId.trim() === '') {
          throw new Error('Invalid family ID');
        }

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
                  // Validate snapshot
                  if (!snapshot) {
                    throw new Error('Invalid data received from server');
                  }

                  const allShoppingData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    
                    // Validate document structure
                    if (!data || typeof data !== 'object') {
                      console.warn(`Invalid shopping list data for document ${doc.id}`);
                      return null;
                    }

                    // Ensure items is always an object
                    if (!data.items || typeof data.items !== 'object' || Array.isArray(data.items)) {
                      data.items = {};
                    }

                    return {
                      id: doc.id,
                      ...data,
                      createdAt: data.createdAt?.toDate() || new Date(),
                      updatedAt: data.updatedAt?.toDate() || new Date()
                    };
                  }).filter(Boolean); // Remove null entries
                  
                  // Filter out archived items client-side
                  const activeShoppingData = allShoppingData.filter(list => !list.isArchived);
                  
                  setShoppingLists(activeShoppingData);
                  setLoading(false);
                  setError(null);
                  setRetryCount(0); // Reset retry count on success
                } catch (err) {
                  console.error('Error processing shopping lists:', err);
                  setError(createUserFriendlyError(err));
                  setShoppingLists([]);
                  setLoading(false);
                }
              }, 
              (err) => {
                console.error('Error fetching shopping lists:', err);
                
                // Handle specific error types
                let errorMessage = createUserFriendlyError(err);
                
                if (err.code === 'permission-denied') {
                  errorMessage = 'Access denied. Please check your permissions or try logging in again.';
                  setShoppingLists([]);
                } else if (err.code === 'failed-precondition') {
                  errorMessage = 'Database configuration issue. Please contact support.';
                  setShoppingLists([]);
                } else if (err.code === 'unavailable') {
                  errorMessage = 'Service temporarily unavailable. Retrying...';
                  // Implement retry logic for network errors
                  if (retryCount < 3) {
                    retryTimeout = setTimeout(() => {
                      setRetryCount(prev => prev + 1);
                      setupListener();
                    }, Math.pow(2, retryCount) * 1000); // Exponential backoff
                    return;
                  }
                } else {
                  errorMessage = 'Unable to load shopping lists. Please try again.';
                }
                
                setError(errorMessage);
                setLoading(false);
              }
            );
          },
          'useShopping'
        );
      } catch (err) {
        console.error('Error setting up shopping listener:', err);
        setError(createUserFriendlyError(err));
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
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [familyId, retryCount]);

  // Retry function for manual retry
  const retry = () => {
    setRetryCount(0);
    setError(null);
    setLoading(true);
  };

  return {
    shoppingLists,
    loading,
    error,
    retry
  };
};