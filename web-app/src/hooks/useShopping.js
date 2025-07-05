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
      // Get all shopping lists and filter client-side to avoid index requirement
      const shoppingQuery = query(
        collection(db, 'families', familyId, 'shopping'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(shoppingQuery, (snapshot) => {
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