import React, { useState, useEffect } from 'react';
import { searchFamilyItems, createOrUpdateFamilyItem } from '../../utils/familyItemsUtils';
import { uploadProductPhoto, validateImageFile } from '../../utils/shoppingPhotoUpload';
import { blurOverlayStyle } from '../../styles/modalStyles';

const AddItemForm = ({ familyItems, onAddItem, onCancel, onShowDetails, familyId, currentUser, userRole }) => {
  const [itemName, setItemName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

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

  // Load existing item details when cog is clicked
  useEffect(() => {
    if (showDetails && itemName.trim()) {
      const key = itemName.toLowerCase().replace(/\s+/g, '_');
      const existingItem = familyItems[key];
      if (existingItem) {
        setNotes(existingItem.guidanceNotes || '');
      }
    }
  }, [showDetails, itemName, familyItems]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateImageFile(file);
        setPhotoFile(file);
        setUploadProgress('');
      } catch (error) {
        alert(error.message);
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    
    // If details are shown and there are details to save, save them first
    if (showDetails && (photoFile || notes.trim()) && familyId && userRole === 'parent') {
      setUploading(true);
      try {
        let finalPhotoUrl = null;

        // Upload new photo if one was selected
        if (photoFile) {
          setUploadProgress('Uploading photo...');
          const itemKey = itemName.toLowerCase().replace(/\s+/g, '_');
          const photoData = await uploadProductPhoto(photoFile, familyId, itemKey);
          finalPhotoUrl = photoData.url;
        }

        const itemData = {
          name: itemName.trim(),
          referencePhotoUrl: finalPhotoUrl,
          guidanceNotes: notes.trim()
        };
        
        setUploadProgress('Saving details...');
        await createOrUpdateFamilyItem(familyId, itemName.trim(), itemData, currentUser.uid);
        setUploadProgress('Complete!');
      } catch (error) {
        console.error('Error saving item details:', error);
        alert(`Failed to save details: ${error.message}`);
        setUploading(false);
        return;
      }
    }
    
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
              
              {itemName.trim() && userRole === 'parent' && (
                <button
                  type="button"
                  style={{
                    ...styles.settingsBtn,
                    ...(existingItem ? {} : styles.settingsBtnGray),
                    ...(showDetails ? styles.settingsBtnActive : {})
                  }}
                  onClick={() => setShowDetails(!showDetails)}
                  title={existingItem ? "Edit item details" : "Add item details"}
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
                    {item.referencePhotoUrl && ' (has photo)'}
                    {item.guidanceNotes && ' (has notes)'}
                  </button>
                ))}
              </div>
            )}

            {showDetails && userRole === 'parent' && (
              <div style={styles.detailsSection}>
                <div style={styles.detailsHeader}>
                  <h4 style={styles.detailsTitle}>Item Details</h4>
                </div>
                
                <div style={styles.formField}>
                  <label style={styles.label}>Product Photo</label>
                  
                  <div style={styles.photoOptions}>
                    <label htmlFor="photo-upload" style={styles.photoUploadBtn}>
                      📸 Upload Photo
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                  </div>
                  
                  {photoFile && (
                    <div style={styles.photoInfo}>
                      New photo selected: {photoFile.name}
                      <div style={styles.photoSize}>
                        {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  )}
                  
                  {uploadProgress && (
                    <div style={styles.uploadProgress}>
                      {uploadProgress}
                    </div>
                  )}
                  
                  {photoFile && (
                    <div style={styles.photoPreview}>
                      <img 
                        src={URL.createObjectURL(photoFile)} 
                        alt={itemName} 
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }} 
                        style={styles.previewImage}
                      />
                    </div>
                  )}
                </div>
                
                <div style={styles.formField}>
                  <label style={styles.label}>Notes & Instructions</label>
                  <textarea
                    placeholder="Look for ORGANIC label. If not available: regular is fine. Ask store staff for help."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    style={styles.textarea}
                    disabled={uploading}
                  />
                </div>
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
    ...blurOverlayStyle,
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
  settingsBtnActive: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    borderColor: 'var(--md-sys-color-primary)'
  },
  detailsSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  detailsHeader: {
    marginBottom: '16px'
  },
  detailsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0
  },
  formField: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '8px'
  },
  photoOptions: {
    marginBottom: '12px'
  },
  photoUploadBtn: {
    padding: '12px 20px',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    display: 'inline-block',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  photoInfo: {
    padding: '8px 12px',
    backgroundColor: 'var(--md-sys-color-tertiary-container)',
    color: 'var(--md-sys-color-on-tertiary-container)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '14px',
    marginBottom: '8px'
  },
  photoSize: {
    fontSize: '12px',
    opacity: 0.8,
    marginTop: '4px'
  },
  uploadProgress: {
    padding: '8px 12px',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '14px',
    marginBottom: '8px',
    textAlign: 'center'
  },
  photoPreview: {
    marginTop: '12px',
    textAlign: 'center'
  },
  previewImage: {
    maxWidth: '200px',
    maxHeight: '200px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    boxShadow: 'var(--md-sys-elevation-level2)'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '14px',
    resize: 'vertical',
    minHeight: '80px',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'inherit'
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