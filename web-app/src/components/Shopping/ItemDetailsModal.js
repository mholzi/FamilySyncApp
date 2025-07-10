import React, { useState } from 'react';
import { uploadProductPhoto, validateImageFile } from '../../utils/shoppingPhotoUpload';
import { blurOverlayStyle } from '../../styles/modalStyles';

const ItemDetailsModal = ({ itemName, familyItem, onSave, onClose, familyId, currentUser, userRole }) => {
  const [notes, setNotes] = useState(familyItem?.guidanceNotes || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

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

  const handleSave = async () => {
    if (uploading) return;

    setUploading(true);
    try {
      let finalPhotoUrl = familyItem?.referencePhotoUrl || null;

      // Upload new photo if one was selected
      if (photoFile && familyId) {
        setUploadProgress('Uploading photo...');
        const itemKey = itemName.toLowerCase().replace(/\s+/g, '_');
        const photoData = await uploadProductPhoto(photoFile, familyId, itemKey);
        finalPhotoUrl = photoData.url;
        setUploadProgress('Saving...');
      }

      const itemData = {
        name: itemName,
        referencePhotoUrl: finalPhotoUrl,
        guidanceNotes: notes.trim()
      };
      
      setUploadProgress('Complete!');
      onSave(itemData);
    } catch (error) {
      console.error('Error saving item details:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // For au pairs, show read-only view
  if (userRole === 'aupair') {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h3 style={styles.title}>Item Details: {itemName}</h3>
            <button style={styles.closeButton} onClick={onClose}>×</button>
          </div>
          
          <div style={styles.content}>
            {familyItem?.referencePhotoUrl && (
              <div style={styles.formField}>
                <label style={styles.label}>Product Photo</label>
                <div style={styles.photoPreview}>
                  <img 
                    src={familyItem.referencePhotoUrl} 
                    alt={itemName} 
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                    style={styles.previewImage}
                  />
                </div>
              </div>
            )}
            
            {familyItem?.guidanceNotes && (
              <div style={styles.formField}>
                <label style={styles.label}>Notes & Instructions</label>
                <div style={styles.notesDisplay}>
                  {familyItem.guidanceNotes}
                </div>
              </div>
            )}
            
            {!familyItem?.referencePhotoUrl && !familyItem?.guidanceNotes && (
              <div style={styles.noDetails}>
                <p>No additional details available for this item.</p>
              </div>
            )}
          </div>
          
          <div style={styles.footer}>
            <button style={styles.closeBtn} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For parents, show full editing interface
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Item Details: {itemName}</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.content}>
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
            
            {/* Show existing photo if available and no new photo selected */}
            {!photoFile && familyItem?.referencePhotoUrl && (
              <div style={styles.photoPreview}>
                <img 
                  src={familyItem.referencePhotoUrl} 
                  alt={itemName} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                  style={styles.previewImage}
                />
              </div>
            )}
            
            {/* Show new photo preview */}
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
              rows={4}
              style={styles.textarea}
              disabled={uploading}
            />
          </div>
        </div>
        
        <div style={styles.footer}>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button 
            style={{
              ...styles.saveButton,
              ...(uploading ? styles.saveButtonDisabled : {})
            }}
            onClick={handleSave}
            disabled={uploading}
          >
            {uploading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Material Design 3 styles matching AddItemForm
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
    minHeight: '100px',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'inherit'
  },
  notesDisplay: {
    padding: '12px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    color: 'var(--md-sys-color-on-surface)'
  },
  noDetails: {
    textAlign: 'center',
    padding: '24px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontStyle: 'italic'
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
  saveButton: {
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
  saveButtonDisabled: {
    backgroundColor: 'var(--md-sys-color-on-surface)',
    opacity: 0.38,
    cursor: 'not-allowed'
  },
  closeBtn: {
    width: '100%',
    padding: '12px 24px',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level2)'
  }
};

export default ItemDetailsModal;