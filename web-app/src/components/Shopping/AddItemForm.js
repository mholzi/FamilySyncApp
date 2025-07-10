import React, { useState, useEffect } from 'react';
import { searchFamilyItems } from '../../utils/familyItemsUtils';

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
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Add Item to Shopping List</h3>
          <button style={styles.closeButton} onClick={onCancel}>×</button>
        </div>
        
        <div style={styles.content}>
          <form onSubmit={handleSubmit}>
            <div style={styles.inputContainer}>
              <input
                type="text"
                placeholder="Item name (e.g., Milk)"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                style={styles.input}
                autoFocus
              />
              
              {existingItem && (
                <button
                  type="button"
                  style={styles.settingsBtn}
                  onClick={() => onShowDetails(itemName)}
                  title="Edit item details"
                >
                  ⚙️
                </button>
              )}
              
              {!existingItem && itemName.trim() && (
                <button
                  type="button"
                  style={{
                    ...styles.settingsBtn,
                    ...styles.settingsBtnGray
                  }}
                  onClick={() => onShowDetails(itemName)}
                  title="Add item details"
                >
                  ⚙️
                </button>
              )}
            </div>
            
            {suggestions.length > 0 && (
              <div style={styles.suggestions}>
                {suggestions.map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    style={styles.suggestion}
                    onClick={() => handleSuggestionClick([key, item])}
                  >
                    {item.name}
                    {item.referencePhotoUrl && ' 📸'}
                    {item.guidanceNotes && ' 💡'}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
        
        <div style={styles.footer}>
          <button 
            type="button" 
            style={styles.cancelButton} 
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            style={{
              ...styles.addButton,
              ...(itemName.trim() ? {} : styles.addButtonDisabled)
            }}
            disabled={!itemName.trim()}
            onClick={handleSubmit}
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
};

// Material Design 3 styles matching EditEventModal template
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '16px'
  },
  modal: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    boxShadow: 'var(--md-sys-elevation-level5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px',
    color: 'var(--md-sys-color-on-surface-variant)',
    borderRadius: 'var(--md-sys-shape-corner-small)'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px'
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  input: {
    flex: 1,
    padding: '12px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '16px',
    outline: 'none',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface)'
  },
  settingsBtn: {
    background: 'var(--md-sys-color-surface-container-highest)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--md-sys-color-on-surface)'
  },
  settingsBtnGray: {
    opacity: 0.5
  },
  suggestions: {
    marginBottom: '16px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    overflow: 'hidden',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)'
  },
  suggestion: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    fontSize: '16px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    color: 'var(--md-sys-color-on-surface)'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderTop: '1px solid var(--md-sys-color-outline-variant)'
  },
  cancelButton: {
    padding: '12px 24px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '120px'
  },
  addButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level2)',
    minWidth: '120px'
  },
  addButtonDisabled: {
    backgroundColor: 'var(--md-sys-color-on-surface)',
    opacity: 0.38,
    cursor: 'not-allowed'
  }
};

// Add hover effects for suggestions
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .suggestion:hover {
      background-color: var(--md-sys-color-surface-container) !important;
    }
    .suggestion:last-child {
      border-bottom: none !important;
    }
  `;
  if (!document.head.querySelector('[data-add-item-styles]')) {
    styleElement.setAttribute('data-add-item-styles', 'true');
    document.head.appendChild(styleElement);
  }
}

export default AddItemForm;