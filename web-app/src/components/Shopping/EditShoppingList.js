import React, { useState, useEffect } from 'react';
import SupermarketSelector from './SupermarketSelector';
import './AddShoppingList.css';

const EditShoppingList = ({ list, onCancel, onUpdate, updating, familyId, currentUser, userRole }) => {
  const [name, setName] = useState('');
  const [selectedSupermarket, setSelectedSupermarket] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');

  // Initialize form with existing list data
  useEffect(() => {
    if (list) {
      setName(list.name || '');
      setSelectedSupermarket(list.supermarket || null);
      
      // Convert scheduledFor to date string
      if (list.scheduledFor) {
        const date = list.scheduledFor.toDate ? list.scheduledFor.toDate() : new Date(list.scheduledFor);
        setScheduledDate(date.toISOString().split('T')[0]);
      } else {
        const today = new Date();
        setScheduledDate(today.toISOString().split('T')[0]);
      }
    }
  }, [list]);

  const validateDate = (date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    return selectedDate >= today;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Edit form submitted with name:', name, 'supermarket:', selectedSupermarket, 'scheduledDate:', scheduledDate);
    
    // Role validation - only parents can edit shopping lists
    if (userRole !== 'parent') {
      console.error('Unauthorized: Only parents can edit shopping lists');
      alert('Only parents can edit shopping lists');
      return;
    }
    
    if (!name.trim() || updating) {
      console.log('Form validation failed - name:', name.trim(), 'updating:', updating);
      return;
    }

    // Validate date is not in the past
    if (!validateDate(scheduledDate)) {
      alert('Please select today or a future date for shopping');
      return;
    }

    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(10, 0, 0, 0); // Set default time to 10:00
    const updateData = {
      name: name.trim(),
      scheduledFor: scheduledDateTime,
      supermarket: selectedSupermarket
    };

    console.log('EditShoppingList - Updating list with data:', {
      name: updateData.name,
      scheduledFor: updateData.scheduledFor,
      scheduledForType: typeof updateData.scheduledFor,
      scheduledForValue: updateData.scheduledFor?.toString(),
      supermarket: updateData.supermarket,
      familyId: familyId,
      listId: list.id,
      currentUser: currentUser?.uid,
      userRole: userRole
    });
    
    onUpdate(updateData);
  };

  return (
    <div className="add-list-overlay">
      <div className="add-list-modal">
        <div className="modal-header">
          <h2>Edit Shopping List</h2>
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
              disabled={updating}
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
              disabled={updating}
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="scheduledDate">Scheduled Date</label>
            <input
              type="date"
              id="scheduledDate"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={updating}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={onCancel}
              disabled={updating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={!name.trim() || !scheduledDate || updating}
            >
              {updating ? 'Updating...' : 'Update List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditShoppingList;