import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {onCall, CallableRequest} from 'firebase-functions/v2/https';
import {
  validateUserProfile,
  validateChildProfile,
  validateTask,
  validateCalendarEvent,
  validateShoppingItem,
  sanitizeInput
} from './validators';

const db = admin.firestore();

// Helper to check if user is family member
async function isFamilyMember(uid: string, familyId: string): Promise<boolean> {
  try {
    const familyDoc = await db.collection('families').doc(familyId).get();
    const familyData = familyDoc.data();
    return familyData?.memberUids?.includes(uid) || false;
  } catch (error) {
    console.error('Error checking family membership:', error);
    return false;
  }
}

// Validated user profile update
export const updateUserProfile = onCall(async (request: CallableRequest) => {
  // Check authentication
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Sanitize input
  const sanitizedData = sanitizeInput(request.data);

  // Validate data
  const validation = validateUserProfile(sanitizedData);
  if (!validation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', validation.errors.join(', '));
  }

  // Verify user is updating their own profile
  if (request.auth.uid !== sanitizedData.userId) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot update other users profiles');
  }

  // Update profile
  try {
    await db.collection('users').doc(request.auth.uid).update({
      name: sanitizedData.name,
      email: sanitizedData.email,
      phone: sanitizedData.phone || null,
      role: sanitizedData.role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update profile');
  }
});

// Validated child creation
export const createChild = onCall(async (request: CallableRequest) => {
  // Check authentication
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Sanitize input
  const sanitizedData = sanitizeInput(request.data);

  // Validate data
  const validation = validateChildProfile(sanitizedData);
  if (!validation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', validation.errors.join(', '));
  }

  // Verify user is family member
  const isMember = await isFamilyMember(request.auth.uid, sanitizedData.familyId);
  if (!isMember) {
    throw new functions.https.HttpsError('permission-denied', 'Not a member of this family');
  }

  // Create child profile
  try {
    const childRef = await db.collection('children').add({
      ...sanitizedData,
      createdBy: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      childId: childRef.id 
    };
  } catch (error) {
    console.error('Error creating child profile:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create child profile');
  }
});

// Validated task creation
export const createTask = onCall(async (request: CallableRequest) => {
  // Check authentication
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Sanitize input
  const sanitizedData = sanitizeInput(request.data);

  // Validate data
  const validation = validateTask(sanitizedData);
  if (!validation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', validation.errors.join(', '));
  }

  // Verify user is family member
  const isMember = await isFamilyMember(request.auth.uid, sanitizedData.familyId);
  if (!isMember) {
    throw new functions.https.HttpsError('permission-denied', 'Not a member of this family');
  }

  // Create task
  try {
    const taskRef = await db.collection('tasks').add({
      title: sanitizedData.title,
      description: sanitizedData.description || '',
      familyId: sanitizedData.familyId,
      assignedTo: sanitizedData.assignedTo,
      dueDate: sanitizedData.dueDate ? admin.firestore.Timestamp.fromDate(new Date(sanitizedData.dueDate)) : null,
      priority: sanitizedData.priority || 'medium',
      completed: false,
      createdBy: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      taskId: taskRef.id 
    };
  } catch (error) {
    console.error('Error creating task:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create task');
  }
});

// Validated calendar event creation
export const createCalendarEvent = onCall(async (request: CallableRequest) => {
  // Check authentication
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Sanitize input
  const sanitizedData = sanitizeInput(request.data);

  // Validate data
  const validation = validateCalendarEvent(sanitizedData);
  if (!validation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', validation.errors.join(', '));
  }

  // Verify user is family member
  const isMember = await isFamilyMember(request.auth.uid, sanitizedData.familyId);
  if (!isMember) {
    throw new functions.https.HttpsError('permission-denied', 'Not a member of this family');
  }

  // Create event
  try {
    const eventRef = await db.collection('calendarEvents').add({
      title: sanitizedData.title,
      description: sanitizedData.description || '',
      familyId: sanitizedData.familyId,
      startTime: admin.firestore.Timestamp.fromDate(new Date(sanitizedData.startTime)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(sanitizedData.endTime)),
      attendees: sanitizedData.attendees || [],
      location: sanitizedData.location || '',
      createdBy: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      eventId: eventRef.id 
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create event');
  }
});

// Validated shopping item creation
export const createShoppingItem = onCall(async (request: CallableRequest) => {
  // Check authentication
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Sanitize input
  const sanitizedData = sanitizeInput(request.data);

  // Validate data
  const validation = validateShoppingItem(sanitizedData);
  if (!validation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', validation.errors.join(', '));
  }

  // Verify user is family member
  const isMember = await isFamilyMember(request.auth.uid, sanitizedData.familyId);
  if (!isMember) {
    throw new functions.https.HttpsError('permission-denied', 'Not a member of this family');
  }

  // Create shopping item
  try {
    const shoppingRef = db.collection('families').doc(sanitizedData.familyId)
                           .collection('shoppingLists').doc(sanitizedData.listId);
    
    await shoppingRef.update({
      items: admin.firestore.FieldValue.arrayUnion({
        id: admin.firestore.FieldValue.serverTimestamp(),
        name: sanitizedData.name,
        quantity: sanitizedData.quantity || 1,
        category: sanitizedData.category || 'Other',
        purchased: false,
        addedBy: request.auth.uid,
        addedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating shopping item:', error);
    throw new functions.https.HttpsError('internal', 'Failed to add shopping item');
  }
});