import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  Timestamp, 
  arrayUnion,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';

export const useFamilyNotes = (familyId, userId) => {
  const [allNotes, setAllNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time listener for family notes
  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    const notesRef = collection(db, 'families', familyId, 'notes');
    const notesQuery = query(notesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllNotes(notesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching family notes:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  // Filter notes that haven't been dismissed by current user
  const visibleNotes = useMemo(() => {
    if (!userId) return [];
    return allNotes.filter(note => 
      !note.dismissedBy?.includes(userId)
    );
  }, [allNotes, userId]);

  // Create a new note
  const createNote = async (noteData) => {
    if (!familyId || !userId) throw new Error('Missing familyId or userId');

    try {
      const notesRef = collection(db, 'families', familyId, 'notes');
      const newNote = {
        ...noteData,
        familyId,
        createdBy: userId,
        createdAt: Timestamp.now(),
        dismissedBy: [],
        isActive: true
      };

      const docRef = await addDoc(notesRef, newNote);
      return docRef.id;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  };

  // Edit an existing note (clears dismissals)
  const editNote = async (noteId, updatedData) => {
    if (!familyId || !userId) throw new Error('Missing familyId or userId');

    try {
      const noteRef = doc(db, 'families', familyId, 'notes', noteId);
      await updateDoc(noteRef, {
        ...updatedData,
        editedAt: Timestamp.now(),
        editedBy: userId,
        dismissedBy: [] // Clear dismissals when note is edited
      });
    } catch (error) {
      console.error('Error editing note:', error);
      throw error;
    }
  };

  // Delete a note completely
  const deleteNote = async (noteId) => {
    if (!familyId) throw new Error('Missing familyId');

    try {
      const noteRef = doc(db, 'families', familyId, 'notes', noteId);
      await deleteDoc(noteRef);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  };

  // Dismiss a note for the current user
  const dismissNote = async (noteId) => {
    if (!familyId || !userId) throw new Error('Missing familyId or userId');

    try {
      // Optimistic update - remove from local state immediately
      setAllNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === noteId 
            ? { ...note, dismissedBy: [...(note.dismissedBy || []), userId] }
            : note
        )
      );

      const noteRef = doc(db, 'families', familyId, 'notes', noteId);
      await updateDoc(noteRef, {
        dismissedBy: arrayUnion(userId)
      });

      // Check if all family members have dismissed this note
      // This would require knowing all family member IDs
      // For now, we'll let the cleanup happen via a cloud function or manual process
      
    } catch (error) {
      console.error('Error dismissing note:', error);
      
      // Revert optimistic update on error
      setAllNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === noteId 
            ? { ...note, dismissedBy: (note.dismissedBy || []).filter(id => id !== userId) }
            : note
        )
      );
      
      throw error;
    }
  };

  return {
    allNotes,
    visibleNotes,
    loading,
    error,
    createNote,
    editNote,
    deleteNote,
    dismissNote
  };
};

export default useFamilyNotes;