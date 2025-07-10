import React, { useState, useEffect } from 'react';
import SupermarketSelector from './SupermarketSelector';
import './AddShoppingList.css';

const AddShoppingList = ({ onCancel, onCreate, creating, familyId, currentUser, userRole }) => {
  const [name, setName] = useState('');
  const [selectedSupermarket, setSelectedSupermarket] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');

  // Set default date to today
  useEffect(() => {
    const today = new Date();
    setScheduledDate(today.toISOString().split('T')[0]);
  }, []);

  const validateDateTime = (date, time) => {
    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    return selectedDateTime > now;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted with name:', name, 'supermarket:', selectedSupermarket, 'scheduledDate:', scheduledDate, 'scheduledTime:', scheduledTime);
    
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

    // Validate date/time is not in the past
    if (!validateDateTime(scheduledDate, scheduledTime)) {
      alert('Please select a future date and time for shopping');
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const listData = {
      name: name.trim(),
      scheduledFor: scheduledDateTime,
      scheduledTime: scheduledTime,
      priority: 'normal',
      supermarket: selectedSupermarket
    };

    console.log('Calling onCreate with:', listData);
    onCreate(listData);
  };

  return (
    <div className="add-list-overlay">
      <div className="add-list-modal">
        <h3>Create Shopping List</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <input
              type="text"
              placeholder="List name (e.g., Weekly Groceries)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={creating}
            />
          </div>
          
          <div className="form-field">
            <SupermarketSelector
              selectedSupermarket={selectedSupermarket}
              onSelect={setSelectedSupermarket}
              familyId={familyId}
              currentUser={currentUser}
              showTitle={true}
              disabled={creating}
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="scheduledDate">Scheduled Date:</label>
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
          
          <div className="form-field">
            <label htmlFor="scheduledTime">Scheduled Time:</label>
            <input
              type="time"
              id="scheduledTime"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              disabled={creating}
              required
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={onCancel}
              disabled={creating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="create-btn"
              disabled={!name.trim() || !scheduledDate || !scheduledTime || creating}
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