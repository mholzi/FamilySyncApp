import React, { useState, useEffect } from 'react';
import { searchFamilyItems } from '../../utils/familyItemsUtils';
import './AddItemForm.css';

const AddItemForm = ({ familyItems, onAddItem, onCancel, onShowDetails }) => {
  const [itemName, setItemName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (itemName.trim().length > 1) {
      const searchTerm = itemName.toLowerCase();
      const matches = Object.entries(familyItems)
        .filter(([key, item]) => 
          item.name.toLowerCase().includes(searchTerm) ||
          key.includes(searchTerm)
        )
        .slice(0, 5);
      
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [itemName, familyItems]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    
    onAddItem(itemName.trim());
  };

  const handleSuggestionClick = (suggestion) => {
    setItemName(suggestion[1].name);
    setSelectedItem(suggestion[1]);
    setSuggestions([]);
  };

  const hasExistingItem = () => {
    const key = itemName.toLowerCase().replace(/\s+/g, '_');
    return familyItems[key];
  };

  const existingItem = hasExistingItem();

  return (
    <div className="add-item-overlay">
      <div className="add-item-form">
        <h4>Add Item to Shopping List</h4>
        
        <form onSubmit={handleSubmit}>
          <div className="item-input-container">
            <input
              type="text"
              placeholder="Item name (e.g., Milk)"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              autoFocus
            />
            
            {existingItem && (
              <button
                type="button"
                className="settings-btn"
                onClick={() => onShowDetails(itemName)}
                title="Edit item details"
              >
                ⚙️
              </button>
            )}
            
            {!existingItem && itemName.trim() && (
              <button
                type="button"
                className="settings-btn gray"
                onClick={() => onShowDetails(itemName)}
                title="Add item details"
              >
                ⚙️
              </button>
            )}
          </div>
          
          {suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className="suggestion"
                  onClick={() => handleSuggestionClick([key, item])}
                >
                  {item.name}
                  {item.referencePhotoUrl && ' 📸'}
                  {item.guidanceNotes && ' 💡'}
                </button>
              ))}
            </div>
          )}
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="add-btn"
              disabled={!itemName.trim()}
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemForm;