import { collection, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Automatically clean up old family notes
 * Deletes notes that are:
 * - Older than 3 days
 * - Have no comments OR all comments are also older than 3 days
 */
export const cleanupOldFamilyNotes = async (familyId) => {
  if (!familyId) return;

  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoTimestamp = Timestamp.fromDate(threeDaysAgo);

    // Get all family notes
    const notesRef = collection(db, 'families', familyId, 'notes');
    const notesSnapshot = await getDocs(notesRef);

    const notesToDelete = [];

    for (const noteDoc of notesSnapshot.docs) {
      const noteData = noteDoc.data();
      const noteCreatedAt = noteData.createdAt;

      // Skip if note is less than 3 days old
      if (noteCreatedAt && noteCreatedAt.toMillis() > threeDaysAgoTimestamp.toMillis()) {
        continue;
      }

      // Check if note has recent comments
      const comments = noteData.comments || [];
      let hasRecentActivity = false;

      for (const comment of comments) {
        const commentTimestamp = comment.timestamp;
        
        // Convert different timestamp formats
        let commentTime;
        if (commentTimestamp?.toMillis) {
          commentTime = commentTimestamp.toMillis();
        } else if (commentTimestamp?.getTime) {
          commentTime = commentTimestamp.getTime();
        } else if (typeof commentTimestamp === 'number') {
          commentTime = commentTimestamp;
        } else {
          continue;
        }

        // If any comment is less than 3 days old, keep the note
        if (commentTime > threeDaysAgoTimestamp.toMillis()) {
          hasRecentActivity = true;
          break;
        }
      }

      // If note is old and has no recent activity, mark for deletion
      if (!hasRecentActivity) {
        notesToDelete.push(noteDoc.id);
      }
    }

    // Delete old notes
    const deletePromises = notesToDelete.map(noteId => 
      deleteDoc(doc(db, 'families', familyId, 'notes', noteId))
    );

    await Promise.all(deletePromises);

    if (notesToDelete.length > 0) {
      console.log(`Cleaned up ${notesToDelete.length} old family notes`);
    }

    return notesToDelete.length;
  } catch (error) {
    console.error('Error cleaning up old notes:', error);
    return 0;
  }
};