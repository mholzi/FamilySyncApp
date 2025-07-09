import React, { useState } from 'react';
import SupermarketSelector from './SupermarketSelector';
import './AddShoppingList.css';

const AddShoppingList = ({ onCancel, onCreate, creating, familyId, currentUser }) => {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedSupermarket, setSelectedSupermarket] = useState(null);
  const [scheduledFor, setScheduledFor] = useState('today');

  const getScheduledDate = (option) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    
    switch(option) {
      case 'today':
        return today;
      case 'tomorrow':
        return tomorrow;
      case 'day-after':
        return dayAfter;
      case 'this-week':
        return null; // No specific date, just this week
      default:
        return today;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted with name:', name, 'budget:', budget, 'supermarket:', selectedSupermarket, 'scheduledFor:', scheduledFor);
    
    if (!name.trim() || creating) {
      console.log('Form validation failed - name:', name.trim(), 'creating:', creating);
      return;
    }

    const scheduledDate = getScheduledDate(scheduledFor);
    const listData = {
      name: name.trim(),
      budget: budget ? parseFloat(budget) : null,
      scheduledFor: scheduledDate,
      scheduledOption: scheduledFor,
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
            <input
              type="number"
              placeholder="Budget (optional)"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              step="0.01"
              min="0"
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
            <label htmlFor="scheduledFor">Schedule for:</label>
            <select
              id="scheduledFor"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={creating}
            >
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="day-after">Day after tomorrow</option>
              <option value="this-week">This week</option>
            </select>
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
              disabled={!name.trim() || creating}
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