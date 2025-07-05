import React, { useState, useEffect } from 'react';
import TodoCard from './TodoCard';
import { 
  getTodaysHouseholdTodos, 
  getHouseholdTodos,
  completeHouseholdTodo,
  deleteHouseholdTodo,
  markOverdueTodos 
} from '../../utils/householdTodosUtils';
import './TodoList.css';

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
  const [filter, setFilter] = useState('all'); // all, high, medium, low
  
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
    const currentVisibleTodos = filteredTodos.filter(todo => todo.status === 'pending');
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

  const filteredTodos = todos.filter(todo => {
    if (filter === 'all') return true;
    return todo.priority === filter;
  });

  const groupedTodos = {
    overdue: filteredTodos.filter(todo => 
      todo.status === 'overdue' || 
      (todo.dueDate && todo.dueDate.toDate() < new Date() && todo.status === 'pending')
    ),
    today: filteredTodos.filter(todo => {
      if (todo.status !== 'pending') return false;
      if (!todo.dueDate) return false;
      const dueDate = todo.dueDate.toDate();
      const today = new Date();
      return dueDate.toDateString() === today.toDateString();
    }),
    upcoming: filteredTodos.filter(todo => {
      if (todo.status !== 'pending') return false;
      if (!todo.dueDate) return false;
      const dueDate = todo.dueDate.toDate();
      const today = new Date();
      return dueDate > today;
    }),
    completed: filteredTodos.filter(todo => todo.status === 'completed')
  };

  return (
    <div className="todo-list-container">
      <div className="todo-list-header">
        <div className="view-info">
          <h2>
            {viewType === 'today' && 'Today\'s Tasks'}
            {viewType === 'all' && 'All Tasks'}
            {viewType === 'completed' && 'Completed Tasks'}
          </h2>
          <span className="todo-count">
            {loading ? '...' : `${filteredTodos.length} ${filteredTodos.length === 1 ? 'task' : 'tasks'}`}
          </span>
        </div>

        <div className="todo-controls">
          {!selectionMode ? (
            <>
              {/* Priority Filter */}
              <div className="filter-group">
                <label>Priority:</label>
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Bulk Selection Toggle */}
              {filteredTodos.filter(todo => todo.status === 'pending').length > 1 && (
                <button 
                  className="btn-select-mode" 
                  onClick={handleSelectionToggle}
                >
                  Select
                </button>
              )}

              {/* Add Todo Button (Parent Only) */}
              {showAddButton && userRole === 'parent' && (
                <button className="btn-add-todo" onClick={onAddTodo}>
                  + Add Task
                </button>
              )}
            </>
          ) : (
            <>
              {/* Selection Info */}
              <div className="selection-info">
                <span>{selectedTodos.size} selected</span>
                <button onClick={handleSelectAll} className="btn-select-all">
                  {filteredTodos.filter(todo => todo.status === 'pending').every(todo => selectedTodos.has(todo.id)) 
                    ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Bulk Actions */}
              <div className="bulk-actions">
                {userRole === 'aupair' && selectedTodos.size > 0 && (
                  <button 
                    onClick={handleBulkComplete}
                    disabled={bulkActionInProgress}
                    className="btn-bulk-complete"
                  >
                    Complete ({selectedTodos.size})
                  </button>
                )}
                
                {userRole === 'parent' && selectedTodos.size > 0 && (
                  <>
                    <div className="priority-group">
                      <label>Priority:</label>
                      <select onChange={(e) => handleBulkPriorityChange(e.target.value)} className="filter-select">
                        <option value="">Change...</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    
                    <button 
                      onClick={handleBulkDelete}
                      disabled={bulkActionInProgress}
                      className="btn-bulk-delete"
                    >
                      Delete ({selectedTodos.size})
                    </button>
                  </>
                )}
                
                <button 
                  onClick={handleSelectionToggle}
                  className="btn-cancel-selection"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="btn-dismiss">×</button>
        </div>
      )}

      <div className="todo-list-content">
        {/* Show immediate empty state if no todos and not loading, or if loading is done */}
        {!loading && filteredTodos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>{userRole === 'parent' ? 'All tasks cleared!' : 'No tasks assigned'}</h3>
            <p>
              {userRole === 'parent' 
                ? 'No household tasks created yet. Ready to create your first task for your au pair?'
                : 'No tasks assigned to you yet.'
              }
            </p>
            {userRole === 'parent' && (
              <button className="btn-add-todo-empty" onClick={onAddTodo}>
                Create first task
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading todos...</p>
          </div>
        ) : (
          <>
            {viewType === 'today' && (
              <>
                {/* Overdue Section */}
            {groupedTodos.overdue.length > 0 && (
              <div className="todo-section overdue">
                <h3 className="section-title">
                  ⚠️ Overdue ({groupedTodos.overdue.length})
                </h3>
                <div className="todo-grid">
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
              <div className="todo-section today">
                <h3 className="section-title">
                  📅 Due Today ({groupedTodos.today.length})
                </h3>
                <div className="todo-grid">
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
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h3>All caught up!</h3>
                <p>No tasks due today. Great work!</p>
              </div>
            )}
          </>
        )}

        {viewType === 'all' && (
          <>
            {/* Pending Tasks */}
            <div className="todo-section all-pending">
              <h3 className="section-title">
                📋 Pending Tasks ({groupedTodos.overdue.length + groupedTodos.today.length + groupedTodos.upcoming.length})
              </h3>
              <div className="todo-grid">
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
              <div className="todo-section completed">
                <h3 className="section-title">
                  ✅ Recently Completed ({groupedTodos.completed.length})
                </h3>
                <div className="todo-grid">
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
          <div className="todo-section completed">
            <div className="todo-grid">
              {filteredTodos.map(todo => (
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