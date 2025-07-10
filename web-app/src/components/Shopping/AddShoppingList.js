import React, { useState, useEffect } from 'react';
import SupermarketSelector from './SupermarketSelector';
import './AddShoppingList.css';

const AddShoppingList = ({ onCancel, onCreate, creating, familyId, currentUser, userRole }) => {
  const [name, setName] = useState('');
  const [selectedSupermarket, setSelectedSupermarket] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');

  // Set default date to today
  useEffect(() => {
    const today = new Date();
    setScheduledDate(today.toISOString().split('T')[0]);
  }, []);

  const validateDate = (date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    return selectedDate >= today;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted with name:', name, 'supermarket:', selectedSupermarket, 'scheduledDate:', scheduledDate);
    
    // Role validation - only parents can create shopping lists
    if (userRole !== 'parent') {
      console.error('Unauthorized: Only parents can create shopping lists');
      alert('Only parents can create shopping lists');
      return;
    }
    
    if (!name.trim() || creating) {
      console.log('Form validation failed - name:', name.trim(), 'creating:', creating);
      return;
    }

    // Validate date is not in the past
    if (!validateDate(scheduledDate)) {
      alert('Please select today or a future date for shopping');
      return;
    }

    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(10, 0, 0, 0); // Set default time to 10:00 AM
    const listData = {
      name: name.trim(),
      scheduledFor: scheduledDateTime,
      priority: 'normal',
      supermarket: selectedSupermarket
    };

    console.log('AddShoppingList - Creating list with data:', {
      name: listData.name,
      scheduledFor: listData.scheduledFor,
      scheduledForType: typeof listData.scheduledFor,
      scheduledForValue: listData.scheduledFor?.toString(),
      priority: listData.priority,
      supermarket: listData.supermarket,
      familyId: familyId,
      currentUser: currentUser?.uid,
      userRole: userRole
    });
    
    onCreate(listData);
  };

  return (
    <div className="add-list-overlay">
      <div className="add-list-modal">
        <div className="modal-header">
          <h2>Create Shopping List</h2>
          <button className="btn-close" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="listName">List Name</label>
            <input
              id="listName"
              type="text"
              placeholder="e.g., Weekly Groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={creating}
              required
            />
          </div>
          
          <div className="form-field">
            <label>Store</label>
            <SupermarketSelector
              selectedSupermarket={selectedSupermarket}
              onSelect={setSelectedSupermarket}
              familyId={familyId}
              currentUser={currentUser}
              showTitle={false}
              disabled={creating}
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="scheduledDate">Scheduled Date</label>
            <input
              type="date"
              id="scheduledDate"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={creating}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={onCancel}
              disabled={creating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={!name.trim() || !scheduledDate || creating}
            >
              {creating ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddShoppingList;