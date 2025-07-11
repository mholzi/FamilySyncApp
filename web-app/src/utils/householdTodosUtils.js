import { doc, updateDoc, collection, addDoc, Timestamp, query, where, orderBy, onSnapshot, deleteDoc, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Create a new household todo
export const createHouseholdTodo = async (familyId, todoData, createdBy) => {
  try {
    const todoRef = await addDoc(collection(db, 'families', familyId, 'householdTodos'), {
      // Existing fields
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
      status: 'pending', // pending, completed, overdue, confirmed
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      completionNotes: '',
      completionPhotos: [],
      assignedTo: 'aupair', // Always assigned to au pair
      createdBy: createdBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      nextDueDate: todoData.isRecurring ? calculateNextDueDate(todoData) : todoData.dueDate,
      
      // New enhanced fields
      instructions: todoData.instructions || '',
      examplePhotos: todoData.examplePhotos || [], // URLs of "how we like it done" photos
      examplePhotosUploadedAt: todoData.examplePhotos?.length > 0 ? Timestamp.now() : null, // For 2-month expiration
      difficulty: todoData.difficulty || 'easy', // easy, moderate, complex
      firstTimeHelp: todoData.firstTimeHelp || '', // Additional guidance for new au pairs
      preferredTimeOfDay: todoData.preferredTimeOfDay || '', // morning, afternoon, evening
      templateId: todoData.templateId || null, // Reference to task template if used
      
      // Feedback and communication
      feedback: [], // Array of feedback objects
      helpRequests: [], // Array of help request objects
      suggestions: [] // Array of suggestion objects
    });
    
    return todoRef.id;
  } catch (error) {
    console.error('Error creating household todo:', error);
    throw error;
  }
};

// Calculate next due date for recurring todos
const calculateNextDueDate = (todoData) => {
  if (!todoData.isRecurring || !todoData.dueDate) {
    console.log('⚠️ Not recurring or no due date, returning original:', todoData.dueDate?.toDate());
    return todoData.dueDate;
  }
  
  const currentDate = todoData.dueDate.toDate();
  const interval = todoData.recurringInterval || 1;
  
  console.log('🧮 Calculating next due date:', {
    currentDate,
    recurringType: todoData.recurringType,
    interval
  });
  
  let nextDate;
  switch (todoData.recurringType) {
    case 'daily':
      nextDate = new Date(currentDate.getTime() + (interval * 24 * 60 * 60 * 1000));
      console.log('📅 Daily recurrence - next date:', nextDate);
      return Timestamp.fromDate(nextDate);
    case 'weekly':
      nextDate = new Date(currentDate.getTime() + (interval * 7 * 24 * 60 * 60 * 1000));
      console.log('📅 Weekly recurrence - next date:', nextDate);
      return Timestamp.fromDate(nextDate);
    case 'monthly':
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + interval);
      console.log('📅 Monthly recurrence - next date:', nextMonth);
      return Timestamp.fromDate(nextMonth);
    default:
      console.log('⚠️ Unknown recurring type, returning original:', todoData.dueDate?.toDate());
      return todoData.dueDate;
  }
};

// Complete a household todo
export const completeHouseholdTodo = async (familyId, todoId, completionData, completedBy) => {
  try {
    console.log('🔄 Starting completion for todo:', todoId);
    
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
    console.log('✅ Todo marked as completed:', todoId);
    
    // If it's a recurring todo, create the next instance
    const todoDocRef = doc(db, 'families', familyId, 'householdTodos', todoId);
    const todoDoc = await getDoc(todoDocRef);
    if (todoDoc.exists()) {
      const todoData = todoDoc.data();
      console.log('📋 Todo data retrieved:', {
        title: todoData.title,
        isRecurring: todoData.isRecurring,
        recurringType: todoData.recurringType,
        dueDate: todoData.dueDate?.toDate(),
        nextDueDate: todoData.nextDueDate?.toDate()
      });
      
      if (todoData.isRecurring) {
        console.log('🔁 Creating next recurring instance...');
        await createNextRecurringTodo(familyId, todoData, todoData.createdBy);
      } else {
        console.log('📝 Todo is not recurring, no next instance needed');
      }
    } else {
      console.warn('⚠️ Todo document not found after completion:', todoId);
    }
  } catch (error) {
    console.error('❌ Error completing household todo:', error);
    throw error;
  }
};

// Create next instance of recurring todo
const createNextRecurringTodo = async (familyId, originalTodo, createdBy) => {
  try {
    console.log('🔁 Creating next recurring todo for:', originalTodo.title);
    
    const baseDueDate = originalTodo.nextDueDate || originalTodo.dueDate;
    console.log('📅 Base due date for calculation:', baseDueDate?.toDate());
    
    const nextDueDate = calculateNextDueDate({
      ...originalTodo,
      dueDate: baseDueDate
    });
    
    console.log('📅 Calculated next due date:', nextDueDate?.toDate());
    
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
    
    console.log('🆕 Creating new todo with data:', {
      title: nextTodoData.title,
      dueDate: nextTodoData.dueDate?.toDate(),
      nextDueDate: nextTodoData.nextDueDate?.toDate(),
      recurringType: nextTodoData.recurringType,
      recurringInterval: nextTodoData.recurringInterval
    });
    
    const newTodoId = await createHouseholdTodo(familyId, nextTodoData, createdBy);
    console.log('✅ Next recurring todo created successfully with ID:', newTodoId);
    
    // Check if the new todo will be visible in today/tomorrow view
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    
    if (nextDueDate.toDate() <= tomorrow) {
      console.log('👀 New todo will be visible in today/tomorrow view');
    } else {
      console.log('📅 New todo is scheduled for later:', nextDueDate.toDate());
    }
    
  } catch (error) {
    console.error('❌ Error creating next recurring todo:', error);
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
      const todoDocRef = doc(db, 'families', familyId, 'householdTodos', todoId);
      const todoDoc = await getDoc(todoDocRef);
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

// Confirm household todo completion (parent action)
export const confirmHouseholdTodo = async (familyId, todoId, confirmedBy) => {
  try {
    console.log('✅ Parent confirming completion for todo:', todoId);
    
    const updateData = {
      status: 'confirmed',
      confirmedBy: confirmedBy,
      confirmedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // If this is the first completion (not just confirmation), also set completion fields
    const todoDocRef = doc(db, 'families', familyId, 'householdTodos', todoId);
    const todoDoc = await getDoc(todoDocRef);
    
    if (todoDoc.exists()) {
      const todoData = todoDoc.data();
      
      // If it's pending (parent doing the work), also mark as completed
      if (todoData.status === 'pending') {
        updateData.completedAt = Timestamp.now();
        updateData.completedBy = confirmedBy;
        updateData.completionNotes = 'Completed by parent';
        console.log('✅ Parent completed and confirmed task directly');
      } else {
        console.log('✅ Parent confirmed au pair\'s completion');
      }

      // Clear help requests when task is confirmed
      updateData.helpRequests = [];
      
      await updateDoc(todoDocRef, updateData);
      console.log('✅ Todo confirmed and will be hidden from view');
      
      // Handle recurring tasks if needed
      if (todoData.isRecurring) {
        console.log('🔁 Creating next recurring instance after confirmation...');
        await createNextRecurringTodo(familyId, todoData, todoData.createdBy);
      }
    }
    
  } catch (error) {
    console.error('❌ Error confirming household todo:', error);
    throw error;
  }
};

// Auto-reset tasks that have been completed for 24 hours without confirmation
export const autoResetCompletedTasks = async (familyId) => {
  try {
    console.log('🔄 Checking for tasks to auto-reset after 24 hours...');
    
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const autoResetQuery = query(
      collection(db, 'families', familyId, 'householdTodos'),
      where('status', '==', 'completed'),
      where('completedAt', '<', Timestamp.fromDate(twentyFourHoursAgo))
    );
    
    const snapshot = await getDocs(autoResetQuery);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((doc) => {
      const todoData = doc.data();
      console.log('🔄 Auto-resetting task:', todoData.title);
      
      batch.update(doc.ref, { 
        status: 'pending',
        completedAt: null,
        completedBy: null,
        completionNotes: '',
        updatedAt: Timestamp.now() 
      });
    });
    
    if (snapshot.docs.length > 0) {
      await batch.commit();
      console.log(`✅ Auto-reset ${snapshot.docs.length} tasks`);
    } else {
      console.log('📝 No tasks to auto-reset');
    }
    
  } catch (error) {
    console.error('❌ Error auto-resetting tasks:', error);
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

// Get household todos for today and tomorrow
export const getTodaysHouseholdTodos = (familyId, callback, userRole = null) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // End of tomorrow
    
    console.log('📋 Setting up todos listener for family:', familyId, 'userRole:', userRole);
    console.log('📅 Fetching todos due until:', tomorrow);
    
    // For au pairs, only show pending tasks. For parents, show pending and completed tasks (but not confirmed)
    const statusFilter = userRole === 'aupair' ? ['pending'] : ['pending', 'completed'];
    
    const todosQuery = query(
      collection(db, 'families', familyId, 'householdTodos'),
      where('dueDate', '<=', Timestamp.fromDate(tomorrow)),
      where('status', 'in', statusFilter),
      orderBy('dueDate', 'asc')
    );
    
    return onSnapshot(todosQuery, (snapshot) => {
      console.log('🔄 Todos snapshot received:', {
        size: snapshot.size,
        empty: snapshot.empty,
        fromCache: snapshot.metadata.fromCache,
        userRole
      });
      
      const todos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📋 Todos loaded:', todos.map(todo => ({
        id: todo.id,
        title: todo.title,
        dueDate: todo.dueDate?.toDate(),
        isRecurring: todo.isRecurring,
        status: todo.status
      })));
      
      callback(snapshot);
    });
  } catch (error) {
    console.error('❌ Error getting household todos for today and tomorrow:', error);
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
    
    const snapshot = await getDocs(overdueQuery);
    const batch = writeBatch(db);
    
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