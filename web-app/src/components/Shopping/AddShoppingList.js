import React, { useState } from 'react';
import SupermarketSelector from './SupermarketSelector';
import './AddShoppingList.css';

const AddShoppingList = ({ onCancel, onCreate, creating, familyId, currentUser }) => {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedSupermarket, setSelectedSupermarket] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted with name:', name, 'budget:', budget, 'supermarket:', selectedSupermarket);
    
    if (!name.trim() || creating) {
      console.log('Form validation failed - name:', name.trim(), 'creating:', creating);
      return;
    }

    const listData = {
      name: name.trim(),
      budget: budget ? parseFloat(budget) : null,
      scheduledFor: null,
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