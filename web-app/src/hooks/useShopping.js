import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const useShopping = (familyId) => {
  const [shoppingLists, setShoppingLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    try {
      // Get active shopping lists
      const shoppingQuery = query(
        collection(db, 'families', familyId, 'shopping'),
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(shoppingQuery, (snapshot) => {
        const shoppingData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        }));
        
        setShoppingLists(shoppingData);
        setLoading(false);
      }, (err) => {
        console.error('Error fetching shopping lists:', err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();

    } catch (err) {
      console.error('Error setting up shopping listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [familyId]);

  return {
    shoppingLists,
    loading,
    error
  };
};