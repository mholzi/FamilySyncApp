import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Task service layer for FamilySync
 * 
 * PATTERN: Use this structure for service layer implementation
 * - Separation of concerns (business logic from UI)
 * - Consistent error handling
 * - Input validation
 * - Caching strategies
 * - Batch operations
 * - Pagination support
 */

/**
 * Task service class
 */
class TaskService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cache key for tasks
   * @param {string} familyId - Family ID
   * @param {Object} filters - Query filters
   * @returns {string} Cache key
   */
  _getCacheKey(familyId, filters = {}) {
    return `tasks_${familyId}_${JSON.stringify(filters)}`;
  }

  /**
   * Check if cached data is still valid
   * @param {string} key - Cache key
   * @returns {boolean} Whether cache is valid
   */
  _isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    return Date.now() - cached.timestamp < this.cacheExpiry;
  }

  /**
   * Validate task data
   * @param {Object} taskData - Task data to validate
   * @returns {Object} Validation result
   */
  _validateTaskData(taskData) {
    const errors = {};
    
    if (!taskData.title || taskData.title.trim().length === 0) {
      errors.title = 'Task title is required';
    }
    
    if (taskData.title && taskData.title.length > 100) {
      errors.title = 'Task title must be less than 100 characters';
    }
    
    if (!taskData.assignedTo || taskData.assignedTo.trim().length === 0) {
      errors.assignedTo = 'Task must be assigned to someone';
    }
    
    if (taskData.dueDate && !(taskData.dueDate instanceof Date)) {
      errors.dueDate = 'Due date must be a valid date';
    }
    
    if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
      errors.priority = 'Priority must be low, medium, or high';
    }
    
    if (taskData.description && taskData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Create a new task
   * @param {string} familyId - Family ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task with ID
   */
  async createTask(familyId, taskData) {
    try {
      // Validate input
      if (!familyId) {
        throw new Error('Family ID is required');
      }
      
      const validation = this._validateTaskData(taskData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }
      
      // Prepare task document
      const taskDoc = {
        ...taskData,
        familyId,
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        completedAt: null,
        completedBy: null,
        priority: taskData.priority || 'medium'
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'families', familyId, 'tasks'), taskDoc);
      
      // Clear cache for this family
      this._clearFamilyCache(familyId);
      
      // Return task with ID
      return {
        id: docRef.id,
        ...taskDoc,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Update an existing task
   * @param {string} familyId - Family ID
   * @param {string} taskId - Task ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated task
   */
  async updateTask(familyId, taskId, updates) {
    try {
      // Validate input
      if (!familyId || !taskId) {
        throw new Error('Family ID and Task ID are required');
      }
      
      // Validate updates
      const validation = this._validateTaskData(updates);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }
      
      const taskRef = doc(db, 'families', familyId, 'tasks', taskId);
      
      // Check if task exists
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      // Prepare update data
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      // Update in Firestore
      await updateDoc(taskRef, updateData);
      
      // Clear cache
      this._clearFamilyCache(familyId);
      
      // Return updated task
      return {
        id: taskId,
        ...taskDoc.data(),
        ...updates,
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Complete a task
   * @param {string} familyId - Family ID
   * @param {string} taskId - Task ID
   * @param {string} userId - User who completed the task
   * @returns {Promise<Object>} Updated task
   */
  async completeTask(familyId, taskId, userId) {
    try {
      if (!familyId || !taskId || !userId) {
        throw new Error('Family ID, Task ID, and User ID are required');
      }
      
      const updates = {
        completed: true,
        completedAt: serverTimestamp(),
        completedBy: userId
      };
      
      return await this.updateTask(familyId, taskId, updates);
      
    } catch (error) {
      console.error('Error completing task:', error);
      throw new Error(`Failed to complete task: ${error.message}`);
    }
  }

  /**
   * Delete a task
   * @param {string} familyId - Family ID
   * @param {string} taskId - Task ID
   * @returns {Promise<void>}
   */
  async deleteTask(familyId, taskId) {
    try {
      if (!familyId || !taskId) {
        throw new Error('Family ID and Task ID are required');
      }
      
      const taskRef = doc(db, 'families', familyId, 'tasks', taskId);
      
      // Check if task exists
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      // Delete from Firestore
      await deleteDoc(taskRef);
      
      // Clear cache
      this._clearFamilyCache(familyId);
      
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Get tasks for a family with filtering and pagination
   * @param {string} familyId - Family ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Tasks with pagination info
   */
  async getTasks(familyId, options = {}) {
    try {
      if (!familyId) {
        throw new Error('Family ID is required');
      }
      
      const {
        assignedTo,
        completed,
        priority,
        pageSize = 20,
        lastDoc,
        orderByField = 'createdAt',
        orderDirection = 'desc',
        useCache = true
      } = options;
      
      // Check cache
      const cacheKey = this._getCacheKey(familyId, options);
      if (useCache && this._isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey).data;
      }
      
      // Build query
      let q = collection(db, 'families', familyId, 'tasks');
      
      // Apply filters
      if (assignedTo) {
        q = query(q, where('assignedTo', '==', assignedTo));
      }
      
      if (completed !== undefined) {
        q = query(q, where('completed', '==', completed));
      }
      
      if (priority) {
        q = query(q, where('priority', '==', priority));
      }
      
      // Apply ordering
      q = query(q, orderBy(orderByField, orderDirection));
      
      // Apply pagination
      if (pageSize) {
        q = query(q, limit(pageSize));
      }
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      // Execute query
      const snapshot = await getDocs(q);
      
      // Process results
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const result = {
        data: tasks,
        hasMore: snapshot.docs.length === pageSize,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        total: snapshot.size
      };
      
      // Cache result
      if (useCache) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw new Error(`Failed to get tasks: ${error.message}`);
    }
  }

  /**
   * Get tasks assigned to a specific user
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User's tasks
   */
  async getUserTasks(familyId, userId, options = {}) {
    try {
      if (!familyId || !userId) {
        throw new Error('Family ID and User ID are required');
      }
      
      const result = await this.getTasks(familyId, {
        ...options,
        assignedTo: userId
      });
      
      return result.data;
      
    } catch (error) {
      console.error('Error getting user tasks:', error);
      throw new Error(`Failed to get user tasks: ${error.message}`);
    }
  }

  /**
   * Get overdue tasks
   * @param {string} familyId - Family ID
   * @returns {Promise<Array>} Overdue tasks
   */
  async getOverdueTasks(familyId) {
    try {
      if (!familyId) {
        throw new Error('Family ID is required');
      }
      
      const result = await this.getTasks(familyId, {
        completed: false,
        useCache: false // Don't cache overdue tasks
      });
      
      // Filter overdue tasks (client-side filtering for date comparison)
      const now = new Date();
      const overdueTasks = result.data.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
        return dueDate < now;
      });
      
      return overdueTasks;
      
    } catch (error) {
      console.error('Error getting overdue tasks:', error);
      throw new Error(`Failed to get overdue tasks: ${error.message}`);
    }
  }

  /**
   * Create multiple tasks in a batch
   * @param {string} familyId - Family ID
   * @param {Array} tasksData - Array of task data
   * @returns {Promise<Array>} Created tasks
   */
  async createMultipleTasks(familyId, tasksData) {
    try {
      if (!familyId || !Array.isArray(tasksData) || tasksData.length === 0) {
        throw new Error('Family ID and non-empty tasks array are required');
      }
      
      if (tasksData.length > 500) {
        throw new Error('Cannot create more than 500 tasks at once');
      }
      
      // Validate all tasks
      for (const [index, taskData] of tasksData.entries()) {
        const validation = this._validateTaskData(taskData);
        if (!validation.isValid) {
          throw new Error(`Task ${index + 1} validation failed: ${Object.values(validation.errors).join(', ')}`);
        }
      }
      
      // Create batch
      const batch = writeBatch(db);
      const taskRefs = [];
      
      tasksData.forEach(taskData => {
        const taskRef = doc(collection(db, 'families', familyId, 'tasks'));
        const taskDoc = {
          ...taskData,
          familyId,
          completed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          completedAt: null,
          completedBy: null,
          priority: taskData.priority || 'medium'
        };
        
        batch.set(taskRef, taskDoc);
        taskRefs.push({ ref: taskRef, data: taskDoc });
      });
      
      // Commit batch
      await batch.commit();
      
      // Clear cache
      this._clearFamilyCache(familyId);
      
      // Return created tasks
      return taskRefs.map(({ ref, data }) => ({
        id: ref.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
    } catch (error) {
      console.error('Error creating multiple tasks:', error);
      throw new Error(`Failed to create multiple tasks: ${error.message}`);
    }
  }

  /**
   * Get task statistics for a family
   * @param {string} familyId - Family ID
   * @returns {Promise<Object>} Task statistics
   */
  async getTaskStatistics(familyId) {
    try {
      if (!familyId) {
        throw new Error('Family ID is required');
      }
      
      const allTasks = await this.getTasks(familyId, {
        pageSize: 1000, // Get all tasks
        useCache: false
      });
      
      const tasks = allTasks.data;
      
      const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.completed).length,
        pending: tasks.filter(t => !t.completed).length,
        overdue: 0,
        byPriority: {
          high: tasks.filter(t => t.priority === 'high').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          low: tasks.filter(t => t.priority === 'low').length
        },
        byUser: {}
      };
      
      // Calculate overdue tasks
      const now = new Date();
      stats.overdue = tasks.filter(task => {
        if (!task.dueDate || task.completed) return false;
        const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
        return dueDate < now;
      }).length;
      
      // Calculate tasks by user
      tasks.forEach(task => {
        if (!stats.byUser[task.assignedTo]) {
          stats.byUser[task.assignedTo] = {
            total: 0,
            completed: 0,
            pending: 0
          };
        }
        
        stats.byUser[task.assignedTo].total++;
        if (task.completed) {
          stats.byUser[task.assignedTo].completed++;
        } else {
          stats.byUser[task.assignedTo].pending++;
        }
      });
      
      return stats;
      
    } catch (error) {
      console.error('Error getting task statistics:', error);
      throw new Error(`Failed to get task statistics: ${error.message}`);
    }
  }

  /**
   * Clear cache for a specific family
   * @param {string} familyId - Family ID
   */
  _clearFamilyCache(familyId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`tasks_${familyId}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const taskService = new TaskService();
export default taskService;