import { doc, updateDoc, collection, addDoc, Timestamp, query, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Create a new household todo
export const createHouseholdTodo = async (familyId, todoData, createdBy) => {
  try {
    const todoRef = await addDoc(collection(db, 'families', familyId, 'householdTodos'), {
      title: todoData.title,
      description: todoData.description || '',
      priority: todoData.priority || 'medium', // high, medium, low
      category: todoData.category || 'general', // cleaning, maintenance, organization, general
      estimatedTime: todoData.estimatedTime || null, // in minutes
      dueDate: todoData.dueDate || null, // Timestamp
      isRecurring: todoData.isRecurring || false,
      recurringType: todoData.recurringType || null, // daily, weekly, monthly, custom
      recurringDays: todoData.recurringDays || [], // [0,1,2,3,4,5,6] for Sunday-Saturday
      recurringInterval: todoData.recurringInterval || 1, // every X days/weeks/months
      status: 'pending', // pending, completed, overdue
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      completionNotes: '',
      completionPhotos: [],
      assignedTo: 'aupair', // Always assigned to au pair
      createdBy: createdBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      nextDueDate: todoData.isRecurring ? calculateNextDueDate(todoData) : todoData.dueDate
    });
    
    return todoRef.id;
  } catch (error) {
    console.error('Error creating household todo:', error);
    throw error;
  }
};

// Calculate next due date for recurring todos
const calculateNextDueDate = (todoData) => {
  if (!todoData.isRecurring || !todoData.dueDate) return todoData.dueDate;
  
  const currentDate = todoData.dueDate.toDate();
  const interval = todoData.recurringInterval || 1;
  
  switch (todoData.recurringType) {
    case 'daily':
      return Timestamp.fromDate(new Date(currentDate.getTime() + (interval * 24 * 60 * 60 * 1000)));
    case 'weekly':
      return Timestamp.fromDate(new Date(currentDate.getTime() + (interval * 7 * 24 * 60 * 60 * 1000)));
    case 'monthly':
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + interval);
      return Timestamp.fromDate(nextMonth);
    default:
      return todoData.dueDate;
  }
};

// Complete a household todo
export const completeHouseholdTodo = async (familyId, todoId, completionData, completedBy) => {
  try {
    const updateData = {
      status: 'completed',
      isCompleted: true,
      completedAt: Timestamp.now(),
      completedBy: completedBy,
      completionNotes: completionData.notes || '',
      completionPhotos: completionData.photos || [],
      updatedAt: Timestamp.now()
    };

    await updateDoc(doc(db, 'families', familyId, 'householdTodos', todoId), updateData);
    
    // If it's a recurring todo, create the next instance
    const todoDoc = await doc(db, 'families', familyId, 'householdTodos', todoId).get();
    if (todoDoc.exists()) {
      const todoData = todoDoc.data();
      if (todoData.isRecurring) {
        await createNextRecurringTodo(familyId, todoData, todoData.createdBy);
      }
    }
  } catch (error) {
    console.error('Error completing household todo:', error);
    throw error;
  }
};

// Create next instance of recurring todo
const createNextRecurringTodo = async (familyId, originalTodo, createdBy) => {
  try {
    const nextDueDate = calculateNextDueDate({
      ...originalTodo,
      dueDate: originalTodo.nextDueDate || originalTodo.dueDate
    });
    
    const nextTodoData = {
      ...originalTodo,
      dueDate: nextDueDate,
      nextDueDate: calculateNextDueDate({
        ...originalTodo,
        dueDate: nextDueDate
      }),
      status: 'pending',
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      completionNotes: '',
      completionPhotos: []
    };
    
    delete nextTodoData.id;
    delete nextTodoData.createdAt;
    delete nextTodoData.updatedAt;
    
    await createHouseholdTodo(familyId, nextTodoData, createdBy);
  } catch (error) {
    console.error('Error creating next recurring todo:', error);
    throw error;
  }
};

// Update household todo
export const updateHouseholdTodo = async (familyId, todoId, updateData) => {
  try {
    const updates = {
      ...updateData,
      updatedAt: Timestamp.now()
    };
    
    // Recalculate next due date if recurring settings changed
    if (updateData.isRecurring !== undefined || updateData.dueDate !== undefined || 
        updateData.recurringType !== undefined || updateData.recurringInterval !== undefined) {
      const todoDoc = await doc(db, 'families', familyId, 'householdTodos', todoId).get();
      if (todoDoc.exists()) {
        const currentData = todoDoc.data();
        const mergedData = { ...currentData, ...updateData };
        if (mergedData.isRecurring) {
          updates.nextDueDate = calculateNextDueDate(mergedData);
        }
      }
    }
    
    await updateDoc(doc(db, 'families', familyId, 'householdTodos', todoId), updates);
  } catch (error) {
    console.error('Error updating household todo:', error);
    throw error;
  }
};

// Delete household todo
export const deleteHouseholdTodo = async (familyId, todoId) => {
  try {
    await deleteDoc(doc(db, 'families', familyId, 'householdTodos', todoId));
  } catch (error) {
    console.error('Error deleting household todo:', error);
    throw error;
  }
};

// Get household todos for today
export const getTodaysHouseholdTodos = (familyId, callback) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const todosQuery = query(
      collection(db, 'families', familyId, 'householdTodos'),
      where('dueDate', '<=', Timestamp.fromDate(today)),
      where('status', '==', 'pending'),
      orderBy('dueDate', 'asc')
    );
    
    return onSnapshot(todosQuery, callback);
  } catch (error) {
    console.error('Error getting today\'s household todos:', error);
    throw error;
  }
};

// Get all household todos with status filter
export const getHouseholdTodos = (familyId, statusFilter = null, callback) => {
  try {
    let todosQuery;
    
    if (statusFilter) {
      todosQuery = query(
        collection(db, 'families', familyId, 'householdTodos'),
        where('status', '==', statusFilter),
        orderBy('priority', 'desc'),
        orderBy('dueDate', 'asc')
      );
    } else {
      todosQuery = query(
        collection(db, 'families', familyId, 'householdTodos'),
        orderBy('priority', 'desc'),
        orderBy('dueDate', 'asc')
      );
    }
    
    return onSnapshot(todosQuery, callback);
  } catch (error) {
    console.error('Error getting household todos:', error);
    throw error;
  }
};

// Mark overdue todos
export const markOverdueTodos = async (familyId) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    
    const overdueQuery = query(
      collection(db, 'families', familyId, 'householdTodos'),
      where('dueDate', '<', Timestamp.fromDate(yesterday)),
      where('status', '==', 'pending')
    );
    
    const snapshot = await overdueQuery.get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { 
        status: 'overdue',
        updatedAt: Timestamp.now() 
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error marking overdue todos:', error);
    throw error;
  }
};

// Get todo statistics
export const getTodoStatistics = async (familyId, timeRange = 'week') => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    
    const completedQuery = query(
      collection(db, 'families', familyId, 'householdTodos'),
      where('completedAt', '>=', Timestamp.fromDate(startDate)),
      where('completedAt', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'completed')
    );
    
    const completedSnapshot = await completedQuery.get();
    
    const totalQuery = query(
      collection(db, 'families', familyId, 'householdTodos'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );
    
    const totalSnapshot = await totalQuery.get();
    
    return {
      completed: completedSnapshot.size,
      total: totalSnapshot.size,
      completionRate: totalSnapshot.size > 0 ? (completedSnapshot.size / totalSnapshot.size) * 100 : 0
    };
  } catch (error) {
    console.error('Error getting todo statistics:', error);
    throw error;
  }
};