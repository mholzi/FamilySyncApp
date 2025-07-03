import { doc, setDoc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Create a new family (called when a parent signs up)
export const createFamily = async (userId, userName) => {
  try {
    const familyId = userId; // Use parent's userId as familyId for simplicity
    
    // Create family document
    await setDoc(doc(db, 'families', familyId), {
      id: familyId,
      name: `${userName}'s Family`,
      memberUids: [userId],
      parentUids: [userId],
      aupairUids: [],
      childrenUids: [],
      defaultLanguage: 'en',
      timezone: 'Europe/Berlin',
      createdAt: Timestamp.now(),
      createdBy: userId,
      inviteCode: generateInviteCode(),
      inviteCodeExpiry: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days
    });

    return familyId;
  } catch (error) {
    console.error('Error creating family:', error);
    throw error;
  }
};

// Generate a random 7-character invite code
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Add a child to the family
export const addChild = async (familyId, childData) => {
  try {
    const childRef = await addDoc(collection(db, 'families', familyId, 'children'), {
      ...childData,
      createdAt: Timestamp.now()
    });
    return childRef.id;
  } catch (error) {
    console.error('Error adding child:', error);
    throw error;
  }
};

// Create a new task
export const createTask = async (familyId, taskData) => {
  try {
    const taskRef = await addDoc(collection(db, 'families', familyId, 'tasks'), {
      ...taskData,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return taskRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Update task status
export const updateTaskStatus = async (familyId, taskId, status, userId) => {
  try {
    const updateData = {
      status,
      updatedAt: Timestamp.now()
    };

    if (status === 'completed') {
      updateData.completedAt = Timestamp.now();
      updateData.completedBy = userId;
    }

    await updateDoc(doc(db, 'families', familyId, 'tasks', taskId), updateData);
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

// Create a calendar event
export const createCalendarEvent = async (familyId, eventData) => {
  try {
    const eventRef = await addDoc(collection(db, 'families', familyId, 'calendar'), {
      ...eventData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return eventRef.id;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

// Create a shopping list
export const createShoppingList = async (familyId, listData) => {
  try {
    const listRef = await addDoc(collection(db, 'families', familyId, 'shopping'), {
      ...listData,
      isArchived: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return listRef.id;
  } catch (error) {
    console.error('Error creating shopping list:', error);
    throw error;
  }
};

// Add item to shopping list
export const addShoppingItem = async (familyId, listId, item, userId) => {
  try {
    // Get the current shopping list
    const listRef = doc(db, 'families', familyId, 'shopping', listId);
    
    // Add the new item to the items array
    const newItem = {
      id: Date.now().toString(), // Simple ID generation
      ...item,
      isPurchased: false,
      addedBy: userId,
      purchasedBy: null,
      purchasedAt: null
    };

    // Update the document by adding to the items array
    await updateDoc(listRef, {
      [`items.${newItem.id}`]: newItem,
      updatedAt: Timestamp.now()
    });

    return newItem.id;
  } catch (error) {
    console.error('Error adding shopping item:', error);
    throw error;
  }
};

// Toggle shopping item purchased status
export const toggleShoppingItem = async (familyId, listId, itemId, isPurchased, userId) => {
  try {
    const listRef = doc(db, 'families', familyId, 'shopping', listId);
    
    const updateData = {
      [`items.${itemId}.isPurchased`]: isPurchased,
      updatedAt: Timestamp.now()
    };

    if (isPurchased) {
      updateData[`items.${itemId}.purchasedBy`] = userId;
      updateData[`items.${itemId}.purchasedAt`] = Timestamp.now();
    } else {
      updateData[`items.${itemId}.purchasedBy`] = null;
      updateData[`items.${itemId}.purchasedAt`] = null;
    }

    await updateDoc(listRef, updateData);
  } catch (error) {
    console.error('Error toggling shopping item:', error);
    throw error;
  }
};

// Create a note
export const createNote = async (familyId, noteData) => {
  try {
    const noteRef = await addDoc(collection(db, 'families', familyId, 'notes'), {
      ...noteData,
      readBy: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return noteRef.id;
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
};