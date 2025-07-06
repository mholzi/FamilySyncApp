import React, { useState, useEffect } from 'react';
import TodoCard from './TodoCard';
import { 
  getTodaysHouseholdTodos, 
  getHouseholdTodos,
  completeHouseholdTodo,
  deleteHouseholdTodo,
  markOverdueTodos 
} from '../../utils/householdTodosUtils';

const TodoList = ({ 
  familyId, 
  userRole, 
  userId,
  viewType = 'today', // today, all, completed
  onEditTodo,
  showAddButton = false,
  onAddTodo 
}) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, high, medium, low - keeping for bulk operations
  
  // Bulk operations state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTodos, setSelectedTodos] = useState(new Set());
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);

  useEffect(() => {
    if (!familyId) return;

    // Mark overdue todos first
    markOverdueTodos(familyId).catch(console.error);

    let unsubscribe;
    
    if (viewType === 'today') {
      unsubscribe = getTodaysHouseholdTodos(familyId, (snapshot) => {
        const todosData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTodos(todosData);
        setLoading(false);
      });
    } else {
      const statusFilter = viewType === 'completed' ? 'completed' : null;
      unsubscribe = getHouseholdTodos(familyId, statusFilter, (snapshot) => {
        const todosData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTodos(todosData);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [familyId, viewType]);

  const handleCompleteTodo = async (todoId, completionData) => {
    try {
      await completeHouseholdTodo(familyId, todoId, completionData, userId);
    } catch (error) {
      setError('Failed to complete todo');
      console.error('Error completing todo:', error);
    }
  };

  const handleDeleteTodo = async (todoId) => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      try {
        await deleteHouseholdTodo(familyId, todoId);
      } catch (error) {
        setError('Failed to delete todo');
        console.error('Error deleting todo:', error);
      }
    }
  };

  // Bulk operations handlers
  const handleSelectionToggle = () => {
    setSelectionMode(!selectionMode);
    setSelectedTodos(new Set());
  };

  const handleTodoSelect = (todoId, isSelected) => {
    const newSelection = new Set(selectedTodos);
    if (isSelected) {
      newSelection.add(todoId);
    } else {
      newSelection.delete(todoId);
    }
    setSelectedTodos(newSelection);
  };

  const handleSelectAll = () => {
    const currentVisibleTodos = todos.filter(todo => todo.status === 'pending');
    const allSelected = currentVisibleTodos.every(todo => selectedTodos.has(todo.id));
    
    if (allSelected) {
      setSelectedTodos(new Set());
    } else {
      setSelectedTodos(new Set(currentVisibleTodos.map(todo => todo.id)));
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTodos.size === 0) return;
    
    setBulkActionInProgress(true);
    const promises = Array.from(selectedTodos).map(todoId => 
      completeHouseholdTodo(familyId, todoId, { notes: 'Bulk completed' }, userId)
    );
    
    try {
      await Promise.all(promises);
      setSelectedTodos(new Set());
      setSelectionMode(false);
    } catch (error) {
      setError('Failed to complete some todos');
      console.error('Error completing todos:', error);
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTodos.size === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedTodos.size} todo(s)?`)) {
      setBulkActionInProgress(true);
      const promises = Array.from(selectedTodos).map(todoId => 
        deleteHouseholdTodo(familyId, todoId)
      );
      
      try {
        await Promise.all(promises);
        setSelectedTodos(new Set());
        setSelectionMode(false);
      } catch (error) {
        setError('Failed to delete some todos');
        console.error('Error deleting todos:', error);
      } finally {
        setBulkActionInProgress(false);
      }
    }
  };

  const handleBulkPriorityChange = async (newPriority) => {
    if (selectedTodos.size === 0) return;
    
    setBulkActionInProgress(true);
    const { updateHouseholdTodo } = await import('../../utils/householdTodosUtils');
    const promises = Array.from(selectedTodos).map(todoId => 
      updateHouseholdTodo(familyId, todoId, { priority: newPriority })
    );
    
    try {
      await Promise.all(promises);
      setSelectedTodos(new Set());
    } catch (error) {
      setError('Failed to update priority for some todos');
      console.error('Error updating priorities:', error);
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const filteredTodos = todos; // Show all todos - priority is now visual only

  const groupedTodos = {
    overdue: todos.filter(todo => 
      todo.status === 'overdue' || 
      (todo.dueDate && todo.dueDate.toDate() < new Date() && todo.status === 'pending')
    ),
    today: todos.filter(todo => {
      if (todo.status !== 'pending') return false;
      if (!todo.dueDate) return false;
      const dueDate = todo.dueDate.toDate();
      const today = new Date();
      return dueDate.toDateString() === today.toDateString();
    }),
    upcoming: todos.filter(todo => {
      if (todo.status !== 'pending') return false;
      if (!todo.dueDate) return false;
      const dueDate = todo.dueDate.toDate();
      const today = new Date();
      return dueDate > today;
    }),
    completed: todos.filter(todo => todo.status === 'completed')
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-primary">
              {viewType === 'today' && 'Today\'s Tasks'}
              {viewType === 'all' && 'All Tasks'}
              {viewType === 'completed' && 'Completed Tasks'}
            </h2>
            <span className="text-secondary text-sm">
              {loading ? '...' : `${todos.length} ${todos.length === 1 ? 'task' : 'tasks'}`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!selectionMode ? (
              <>
                {/* Bulk Selection Toggle */}
                {todos.filter(todo => todo.status === 'pending').length > 1 && (
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleSelectionToggle}
                  >
                    Select
                  </button>
                )}

                {/* Add Todo Button (Parent Only) */}
                {showAddButton && userRole === 'parent' && (
                  <button className="btn btn-primary btn-sm" onClick={onAddTodo}>
                    + Add Task
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Selection Info */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-secondary">{selectedTodos.size} selected</span>
                  <button onClick={handleSelectAll} className="text-primary text-sm font-medium hover:underline">
                    {todos.filter(todo => todo.status === 'pending').every(todo => selectedTodos.has(todo.id)) 
                      ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center gap-2">
                  {userRole === 'aupair' && selectedTodos.size > 0 && (
                    <button 
                      onClick={handleBulkComplete}
                      disabled={bulkActionInProgress}
                      className="btn btn-primary btn-sm"
                    >
                      Complete ({selectedTodos.size})
                    </button>
                  )}
                  
                  {userRole === 'parent' && selectedTodos.size > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-secondary">Priority:</label>
                        <select onChange={(e) => handleBulkPriorityChange(e.target.value)} className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                          <option value="">Change...</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      
                      <button 
                        onClick={handleBulkDelete}
                        disabled={bulkActionInProgress}
                        className="btn btn-secondary btn-sm text-red-600 hover:bg-red-50"
                      >
                        Delete ({selectedTodos.size})
                      </button>
                    </>
                  )}
                  
                  <button 
                    onClick={handleSelectionToggle}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 text-lg font-bold">×</button>
          </div>
        )}
      </div>

      <div>
        {/* Show immediate empty state if no todos and not loading, or if loading is done */}
        {!loading && todos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              {userRole === 'parent' ? 'All tasks cleared!' : 'No tasks assigned'}
            </h3>
            <p className="text-secondary mb-6">
              {userRole === 'parent' 
                ? 'No household tasks created yet. Ready to create your first task for your au pair?'
                : 'No tasks assigned to you yet.'
              }
            </p>
            {userRole === 'parent' && (
              <button className="btn btn-primary" onClick={onAddTodo}>
                Create first task
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-secondary">Loading todos...</p>
          </div>
        ) : (
          <>
            {viewType === 'today' && (
              <>
                {/* Overdue Section */}
                {groupedTodos.overdue.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                      <span className="text-red-500">⚠️</span>
                      Overdue
                      <span className="badge badge-red">{groupedTodos.overdue.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedTodos.overdue.map(todo => (
                        <TodoCard
                          key={todo.id}
                          todo={todo}
                          userRole={userRole}
                          familyId={familyId}
                          onComplete={handleCompleteTodo}
                          onEdit={onEditTodo}
                          onDelete={handleDeleteTodo}
                          showSelection={selectionMode}
                          isSelected={selectedTodos.has(todo.id)}
                          onSelect={handleTodoSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Today Section */}
                {groupedTodos.today.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                      📅 Due Today
                      <span className="badge badge-blue">{groupedTodos.today.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedTodos.today.map(todo => (
                        <TodoCard
                          key={todo.id}
                          todo={todo}
                          userRole={userRole}
                          familyId={familyId}
                          onComplete={handleCompleteTodo}
                          onEdit={onEditTodo}
                          onDelete={handleDeleteTodo}
                          showSelection={selectionMode}
                          isSelected={selectedTodos.has(todo.id)}
                          onSelect={handleTodoSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No tasks for today */}
                {groupedTodos.overdue.length === 0 && groupedTodos.today.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-xl font-semibold text-primary mb-2">All caught up!</h3>
                    <p className="text-secondary">No tasks due today. Great work!</p>
                  </div>
                )}
              </>
            )}

            {viewType === 'all' && (
              <>
                {/* Pending Tasks */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                    📋 Pending Tasks
                    <span className="badge badge-purple">
                      {groupedTodos.overdue.length + groupedTodos.today.length + groupedTodos.upcoming.length}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Show overdue first */}
                    {groupedTodos.overdue.map(todo => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        userRole={userRole}
                        familyId={familyId}
                        onComplete={handleCompleteTodo}
                        onEdit={onEditTodo}
                        onDelete={handleDeleteTodo}
                        showSelection={selectionMode}
                        isSelected={selectedTodos.has(todo.id)}
                        onSelect={handleTodoSelect}
                      />
                    ))}
                    {/* Then today */}
                    {groupedTodos.today.map(todo => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        userRole={userRole}
                        familyId={familyId}
                        onComplete={handleCompleteTodo}
                        onEdit={onEditTodo}
                        onDelete={handleDeleteTodo}
                        showSelection={selectionMode}
                        isSelected={selectedTodos.has(todo.id)}
                        onSelect={handleTodoSelect}
                      />
                    ))}
                    {/* Then upcoming */}
                    {groupedTodos.upcoming.map(todo => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        userRole={userRole}
                        familyId={familyId}
                        onComplete={handleCompleteTodo}
                        onEdit={onEditTodo}
                        onDelete={handleDeleteTodo}
                        showSelection={selectionMode}
                        isSelected={selectedTodos.has(todo.id)}
                        onSelect={handleTodoSelect}
                      />
                    ))}
                  </div>
                </div>

                {/* Completed Tasks */}
                {groupedTodos.completed.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                      ✅ Recently Completed
                      <span className="badge badge-green">{groupedTodos.completed.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedTodos.completed.slice(0, 5).map(todo => (
                        <TodoCard
                          key={todo.id}
                          todo={todo}
                          userRole={userRole}
                          familyId={familyId}
                          onComplete={handleCompleteTodo}
                          onEdit={onEditTodo}
                          onDelete={handleDeleteTodo}
                          showActions={false}
                          showSelection={false}
                          isSelected={false}
                          onSelect={handleTodoSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {viewType === 'completed' && (
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todos.map(todo => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      userRole={userRole}
                      familyId={familyId}
                      onComplete={handleCompleteTodo}
                      onEdit={onEditTodo}
                      onDelete={handleDeleteTodo}
                      showActions={false}
                      showSelection={false}
                      isSelected={false}
                      onSelect={handleTodoSelect}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TodoList;