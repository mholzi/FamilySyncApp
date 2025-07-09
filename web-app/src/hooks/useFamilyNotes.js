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
  arrayRemove,
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

  // Calculate unread count
  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    
    return visibleNotes.filter(note => {
      // Note is unread if user is not in the readBy array
      return !note.readBy || !note.readBy.includes(userId);
    }).length;
  }, [visibleNotes, userId]);

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
        readBy: [userId], // Creator has already read their own note
        likedBy: [], // Initialize empty likes array
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
        dismissedBy: [], // Clear dismissals when note is edited
        readBy: arrayUnion(userId) // Ensure editor has read the note
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
        dismissedBy: arrayUnion(userId),
        readBy: arrayUnion(userId) // Mark as read when dismissing
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

  // Toggle like status for a note
  const toggleLike = async (noteId) => {
    if (!familyId || !userId) {
      console.error('Missing familyId or userId');
      return;
    }

    // Store original note state for potential revert
    let originalNote = null;
    
    try {
      const note = allNotes.find(n => n.id === noteId);
      if (!note) {
        console.error('Note not found:', noteId);
        return;
      }

      originalNote = { ...note };
      
      // Initialize arrays if they don't exist
      const currentLikedBy = note.likedBy || [];
      const currentReadBy = note.readBy || [];
      const isLiked = currentLikedBy.includes(userId);
      
      const noteRef = doc(db, 'families', familyId, 'notes', noteId);

      // Optimistic update
      const newLikedBy = isLiked 
        ? currentLikedBy.filter(id => id !== userId)
        : [...currentLikedBy, userId];
      
      const newReadBy = currentReadBy.includes(userId) 
        ? currentReadBy 
        : [...currentReadBy, userId];

      setAllNotes(prevNotes => 
        prevNotes.map(n => 
          n.id === noteId 
            ? { ...n, likedBy: newLikedBy, readBy: newReadBy }
            : n
        )
      );

      // Update in Firestore
      if (isLiked) {
        // Unlike
        await updateDoc(noteRef, {
          likedBy: arrayRemove(userId)
        });
      } else {
        // Like
        await updateDoc(noteRef, {
          likedBy: arrayUnion(userId),
          readBy: arrayUnion(userId)
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // Revert optimistic update on error
      if (originalNote) {
        setAllNotes(prevNotes => 
          prevNotes.map(n => 
            n.id === noteId ? originalNote : n
          )
        );
      }
    }
  };

  // Mark a note as read
  const markAsRead = async (noteId) => {
    if (!familyId || !userId) throw new Error('Missing familyId or userId');

    try {
      const noteRef = doc(db, 'families', familyId, 'notes', noteId);
      await updateDoc(noteRef, {
        readBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error marking note as read:', error);
      throw error;
    }
  };

  return {
    allNotes,
    visibleNotes,
    unreadCount,
    loading,
    error,
    createNote,
    editNote,
    deleteNote,
    dismissNote,
    toggleLike,
    markAsRead
  };
};

export default useFamilyNotes;