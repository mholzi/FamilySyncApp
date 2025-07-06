import { 
  doc, 
  deleteDoc, 
  updateDoc, 
  arrayRemove, 
  arrayUnion,
  collection, 
  getDocs, 
  getDoc,
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Check if a note should be deleted (all family members have dismissed it)
 * This would typically be called by a cloud function, but can be used client-side
 * @param {string} familyId 
 * @param {string} noteId 
 * @param {Array} familyMemberIds 
 * @param {Array} dismissedBy 
 */
export const checkAndCleanupNote = async (familyId, noteId, familyMemberIds, dismissedBy) => {
  // Check if all current family members have dismissed the note
  const allDismissed = familyMemberIds.every(memberId => 
    dismissedBy.includes(memberId)
  );

  if (allDismissed) {
    try {
      const noteRef = doc(db, 'families', familyId, 'notes', noteId);
      await deleteDoc(noteRef);
      console.log(`Note ${noteId} deleted - dismissed by all family members`);
      return true;
    } catch (error) {
      console.error('Error deleting fully dismissed note:', error);
      return false;
    }
  }

  return false;
};

/**
 * Clean up dismiss arrays when family composition changes
 * Remove user IDs that are no longer part of the family
 * @param {string} familyId 
 * @param {Array} currentFamilyMemberIds 
 */
export const cleanupDismissArrays = async (familyId, currentFamilyMemberIds) => {
  try {
    const notesRef = collection(db, 'families', familyId, 'notes');
    const notesSnapshot = await getDocs(notesRef);

    const batch = [];

    notesSnapshot.docs.forEach(noteDoc => {
      const noteData = noteDoc.data();
      const currentDismissedBy = noteData.dismissedBy || [];
      
      // Find user IDs that are no longer family members
      const invalidDismissals = currentDismissedBy.filter(
        userId => !currentFamilyMemberIds.includes(userId)
      );

      if (invalidDismissals.length > 0) {
        // Remove invalid user IDs from dismissedBy array
        const noteRef = doc(db, 'families', familyId, 'notes', noteDoc.id);
        
        // Create update operation for each invalid dismissal
        invalidDismissals.forEach(invalidUserId => {
          batch.push(
            updateDoc(noteRef, {
              dismissedBy: arrayRemove(invalidUserId)
            })
          );
        });
      }
    });

    // Execute all cleanup operations
    await Promise.all(batch);
    console.log(`Cleaned up dismiss arrays for ${batch.length} notes`);
    
    return batch.length;
  } catch (error) {
    console.error('Error cleaning up dismiss arrays:', error);
    throw error;
  }
};

/**
 * Get family member IDs for a family
 * @param {string} familyId 
 * @returns {Array} Array of user IDs
 */
export const getFamilyMemberIds = async (familyId) => {
  try {
    // Get family document to get member UIDs
    const familyRef = doc(db, 'families', familyId);
    const familyDoc = await getDoc(familyRef);
    
    if (!familyDoc.exists()) {
      throw new Error('Family not found');
    }

    const familyData = familyDoc.data();
    const memberIds = [
      ...(familyData.parentUids || []),
      ...(familyData.auPairUids || [])
    ];

    return memberIds;
  } catch (error) {
    console.error('Error getting family member IDs:', error);
    throw error;
  }
};

/**
 * Enhanced dismiss function that checks for cleanup
 * @param {string} familyId 
 * @param {string} noteId 
 * @param {string} userId 
 */
export const dismissNoteWithCleanup = async (familyId, noteId, userId) => {
  try {
    // First, perform the normal dismiss operation
    const noteRef = doc(db, 'families', familyId, 'notes', noteId);
    await updateDoc(noteRef, {
      dismissedBy: arrayUnion(userId)
    });

    // Get updated note data
    const updatedNoteDoc = await getDoc(noteRef);
    if (!updatedNoteDoc.exists()) return;

    const updatedNoteData = updatedNoteDoc.data();
    const familyMemberIds = await getFamilyMemberIds(familyId);

    // Check if cleanup is needed
    await checkAndCleanupNote(
      familyId, 
      noteId, 
      familyMemberIds, 
      updatedNoteData.dismissedBy || []
    );

  } catch (error) {
    console.error('Error dismissing note with cleanup:', error);
    throw error;
  }
};

/**
 * Validate note data before creation/update
 * @param {Object} noteData 
 * @param {string} userRole 
 * @returns {Object} Validated note data
 */
export const validateNoteData = (noteData, userRole) => {
  const validatedData = { ...noteData };

  // Ensure valid priority
  const validPriorities = ['normal', 'urgent'];
  if (userRole === 'parent') {
    validPriorities.push('important');
  }

  if (!validPriorities.includes(validatedData.priority)) {
    validatedData.priority = 'normal';
  }

  // Ensure valid category
  const validCategories = ['general', 'kids', 'schedule', 'rules'];
  if (!validCategories.includes(validatedData.category)) {
    validatedData.category = 'general';
  }

  // Sanitize content
  validatedData.content = validatedData.content.trim();
  if (!validatedData.content) {
    throw new Error('Note content cannot be empty');
  }

  // Limit content length
  if (validatedData.content.length > 500) {
    validatedData.content = validatedData.content.substring(0, 500);
  }

  return validatedData;
};

export default {
  checkAndCleanupNote,
  cleanupDismissArrays,
  getFamilyMemberIds,
  dismissNoteWithCleanup,
  validateNoteData
};