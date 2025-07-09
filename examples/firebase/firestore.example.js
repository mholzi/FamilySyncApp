import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Firestore operation patterns for FamilySync
 * 
 * PATTERN: Use these functions as templates for database operations
 * - Consistent error handling
 * - Real-time listeners with cleanup
 * - Proper data validation
 * - Optimistic updates where appropriate
 * - Batch operations for related changes
 */

/**
 * Add a new task to the family's task collection
 * @param {string} familyId - Family identifier
 * @param {Object} taskData - Task data
 * @returns {Promise<string>} Document ID of created task
 */
export const addTask = async (familyId, taskData) => {
  try {
    // Validate required fields
    if (!familyId || !taskData.title || !taskData.assignedTo) {
      throw new Error('Missing required fields: familyId, title, or assignedTo');
    }
    
    const taskDoc = {
      ...taskData,
      familyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completed: false,
      completedAt: null,
      completedBy: null
    };
    
    const docRef = await addDoc(collection(db, 'families', familyId, 'tasks'), taskDoc);
    return docRef.id;
  } catch (error) {
    console.error('Error adding task:', error);
    throw new Error(`Failed to add task: ${error.message}`);
  }
};

/**
 * Update an existing task
 * @param {string} familyId - Family identifier
 * @param {string} taskId - Task identifier
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateTask = async (familyId, taskId, updates) => {
  try {
    if (!familyId || !taskId) {
      throw new Error('Missing required parameters: familyId or taskId');
    }
    
    const taskRef = doc(db, 'families', familyId, 'tasks', taskId);
    
    // Check if task exists
    const taskDoc = await getDoc(taskRef);
    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(taskRef, updateData);
  } catch (error) {
    console.error('Error updating task:', error);
    throw new Error(`Failed to update task: ${error.message}`);
  }
};

/**
 * Complete a task (optimistic update pattern)
 * @param {string} familyId - Family identifier
 * @param {string} taskId - Task identifier
 * @param {string} userId - User who completed the task
 * @returns {Promise<void>}
 */
export const completeTask = async (familyId, taskId, userId) => {
  try {
    if (!familyId || !taskId || !userId) {
      throw new Error('Missing required parameters');
    }
    
    const taskRef = doc(db, 'families', familyId, 'tasks', taskId);
    
    await updateDoc(taskRef, {
      completed: true,
      completedAt: serverTimestamp(),
      completedBy: userId,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error completing task:', error);
    throw new Error(`Failed to complete task: ${error.message}`);
  }
};

/**
 * Delete a task
 * @param {string} familyId - Family identifier
 * @param {string} taskId - Task identifier
 * @returns {Promise<void>}
 */
export const deleteTask = async (familyId, taskId) => {
  try {
    if (!familyId || !taskId) {
      throw new Error('Missing required parameters: familyId or taskId');
    }
    
    const taskRef = doc(db, 'families', familyId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }
};

/**
 * Get tasks for a specific user (real-time listener)
 * @param {string} familyId - Family identifier
 * @param {string} userId - User identifier
 * @param {Function} callback - Callback function to handle data updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUserTasks = (familyId, userId, callback) => {
  if (!familyId || !userId || typeof callback !== 'function') {
    throw new Error('Missing required parameters or invalid callback');
  }
  
  const q = query(
    collection(db, 'families', familyId, 'tasks'),
    where('assignedTo', '==', userId),
    where('completed', '==', false),
    orderBy('dueDate', 'asc'),
    limit(20)
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(tasks);
    },
    (error) => {
      console.error('Error in tasks subscription:', error);
      callback(null, error);
    }
  );
};

/**
 * Get all tasks for a family (real-time listener)
 * @param {string} familyId - Family identifier
 * @param {Function} callback - Callback function to handle data updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToFamilyTasks = (familyId, callback) => {
  if (!familyId || typeof callback !== 'function') {
    throw new Error('Missing required parameters or invalid callback');
  }
  
  const q = query(
    collection(db, 'families', familyId, 'tasks'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(tasks);
    },
    (error) => {
      console.error('Error in family tasks subscription:', error);
      callback(null, error);
    }
  );
};

/**
 * Batch operation example: Create multiple related documents
 * @param {string} familyId - Family identifier
 * @param {Array} items - Array of items to create
 * @returns {Promise<void>}
 */
export const createMultipleTasks = async (familyId, tasks) => {
  try {
    if (!familyId || !Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Missing required parameters or empty tasks array');
    }
    
    if (tasks.length > 500) {
      throw new Error('Batch size cannot exceed 500 operations');
    }
    
    const batch = writeBatch(db);
    
    tasks.forEach(taskData => {
      const taskRef = doc(collection(db, 'families', familyId, 'tasks'));
      const taskDoc = {
        ...taskData,
        familyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        completed: false
      };
      batch.set(taskRef, taskDoc);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error creating multiple tasks:', error);
    throw new Error(`Failed to create tasks: ${error.message}`);
  }
};

/**
 * Get family data with pagination
 * @param {string} familyId - Family identifier
 * @param {number} pageSize - Number of items per page
 * @param {Object} lastDoc - Last document from previous page
 * @returns {Promise<Object>} Page data with documents and pagination info
 */
export const getFamilyTasksPaginated = async (familyId, pageSize = 20, lastDoc = null) => {
  try {
    if (!familyId) {
      throw new Error('Missing required parameter: familyId');
    }
    
    let q = query(
      collection(db, 'families', familyId, 'tasks'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    
    // Add pagination cursor if provided
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      data: tasks,
      hasMore: snapshot.docs.length === pageSize,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
    };
  } catch (error) {
    console.error('Error getting paginated tasks:', error);
    throw new Error(`Failed to get tasks: ${error.message}`);
  }
};

/**
 * Advanced query example: Get tasks with multiple conditions
 * @param {string} familyId - Family identifier
 * @param {Object} filters - Filter conditions
 * @returns {Promise<Array>} Array of filtered tasks
 */
export const getFilteredTasks = async (familyId, filters = {}) => {
  try {
    if (!familyId) {
      throw new Error('Missing required parameter: familyId');
    }
    
    let q = collection(db, 'families', familyId, 'tasks');
    
    // Apply filters
    if (filters.assignedTo) {
      q = query(q, where('assignedTo', '==', filters.assignedTo));
    }
    
    if (filters.completed !== undefined) {
      q = query(q, where('completed', '==', filters.completed));
    }
    
    if (filters.priority) {
      q = query(q, where('priority', '==', filters.priority));
    }
    
    // Add ordering
    q = query(q, orderBy('dueDate', 'asc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting filtered tasks:', error);
    throw new Error(`Failed to get filtered tasks: ${error.message}`);
  }
};