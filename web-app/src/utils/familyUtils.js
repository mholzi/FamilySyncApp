import { doc, setDoc, updateDoc, collection, addDoc, Timestamp, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  validateShoppingListData, 
  validateShoppingItemInput, 
  validateFamilyId, 
  validateUserId,
  sanitizeShoppingListData,
  sanitizeShoppingItemData,
  createUserFriendlyError
} from './shoppingValidation';

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
    // Validate inputs
    validateFamilyId(familyId);
    validateShoppingListData(listData);
    
    // Sanitize data
    const sanitizedData = sanitizeShoppingListData({
      ...listData,
      familyId,
      isArchived: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    const listRef = await addDoc(collection(db, 'families', familyId, 'shopping'), sanitizedData);
    return listRef.id;
  } catch (error) {
    console.error('Error creating shopping list:', error);
    throw new Error(createUserFriendlyError(error));
  }
};

// Add item to shopping list (transaction-based)
export const addShoppingItem = async (familyId, listId, item, userId) => {
  try {
    // Validate inputs
    validateFamilyId(familyId);
    validateUserId(userId);
    validateShoppingItemInput(item, userId);
    
    return await runTransaction(db, async (transaction) => {
      const listRef = doc(db, 'families', familyId, 'shopping', listId);
      const listDoc = await transaction.get(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('Shopping list not found');
      }
      
      const listData = listDoc.data();
      
      // Ensure items is an object
      if (!listData.items || typeof listData.items !== 'object' || Array.isArray(listData.items)) {
        listData.items = {};
      }
      
      // Create new item with validation
      const newItem = sanitizeShoppingItemData({
        ...item,
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9)
      }, userId);
      
      // Check for duplicate item names
      const existingItem = Object.values(listData.items).find(
        existingItem => existingItem.name.toLowerCase() === newItem.name.toLowerCase()
      );
      
      if (existingItem) {
        throw new Error('Item already exists in shopping list');
      }
      
      // Add item to the list
      const updatedItems = {
        ...listData.items,
        [newItem.id]: newItem
      };
      
      // Update the document
      transaction.update(listRef, {
        items: updatedItems,
        updatedAt: Timestamp.now()
      });
      
      return newItem.id;
    });
  } catch (error) {
    console.error('Error adding shopping item:', error);
    throw new Error(createUserFriendlyError(error));
  }
};

// Toggle shopping item purchased status (transaction-based)
export const toggleShoppingItem = async (familyId, listId, itemId, isPurchased, userId) => {
  try {
    // Validate inputs
    validateFamilyId(familyId);
    validateUserId(userId);
    
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('Invalid itemId');
    }
    
    if (typeof isPurchased !== 'boolean') {
      throw new Error('Invalid isPurchased value');
    }
    
    return await runTransaction(db, async (transaction) => {
      const listRef = doc(db, 'families', familyId, 'shopping', listId);
      const listDoc = await transaction.get(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('Shopping list not found');
      }
      
      const listData = listDoc.data();
      
      // Ensure items is an object
      if (!listData.items || typeof listData.items !== 'object' || Array.isArray(listData.items)) {
        throw new Error('Invalid shopping list data structure');
      }
      
      // Check if item exists
      if (!listData.items[itemId]) {
        throw new Error('Item not found in shopping list');
      }
      
      // Update the item
      const updatedItems = {
        ...listData.items,
        [itemId]: {
          ...listData.items[itemId],
          isPurchased,
          purchasedBy: isPurchased ? userId : null,
          purchasedAt: isPurchased ? Timestamp.now() : null,
          lastModified: Timestamp.now()
        }
      };
      
      // Update the document
      transaction.update(listRef, {
        items: updatedItems,
        updatedAt: Timestamp.now()
      });
      
      return true;
    });
  } catch (error) {
    console.error('Error toggling shopping item:', error);
    throw new Error(createUserFriendlyError(error));
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

// Mark shopping list as completed (ready for receipt upload)
export const markShoppingListCompleted = async (familyId, listId) => {
  try {
    const listRef = doc(db, 'families', familyId, 'shopping', listId);
    await updateDoc(listRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error marking shopping list as completed:', error);
    throw error;
  }
};