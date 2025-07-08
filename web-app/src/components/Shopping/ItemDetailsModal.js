import React, { useState } from 'react';
import { uploadProductPhoto, validateImageFile } from '../../utils/shoppingPhotoUpload';
import './ItemDetailsModal.css';

const ItemDetailsModal = ({ itemName, familyItem, onSave, onClose, familyId, currentUser, userRole }) => {
  const [photoUrl, setPhotoUrl] = useState(familyItem?.referencePhotoUrl || '');
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
      let finalPhotoUrl = photoUrl.trim() || null;

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
      <div className="item-details-overlay">
        <div className="item-details-modal">
          <h4>Item Details: {itemName}</h4>
          
          {familyItem?.referencePhotoUrl && (
            <div className="form-field">
              <label>📸 Product Photo</label>
              <div className="photo-preview">
                <img 
                  src={familyItem.referencePhotoUrl} 
                  alt={itemName} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }} 
                />
              </div>
            </div>
          )}
          
          {familyItem?.guidanceNotes && (
            <div className="form-field">
              <label>📝 Details</label>
              <div className="notes-display">
                {familyItem.guidanceNotes}
              </div>
            </div>
          )}
          
          {!familyItem?.referencePhotoUrl && !familyItem?.guidanceNotes && (
            <div className="no-details">
              <p>No additional details available for this item.</p>
            </div>
          )}
          
          <div className="form-actions">
            <button className="close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For parents, show full editing interface
  return (
    <div className="item-details-overlay">
      <div className="item-details-modal">
        <h4>Item Details: {itemName}</h4>
        
        <div className="form-field">
          <label>📸 Product Photo</label>
          
          <div className="photo-options">
            <label htmlFor="photo-upload" className="photo-upload-btn">
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
            
            <span className="or-text">or</span>
            
            <input
              type="url"
              placeholder="Enter photo URL"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              disabled={uploading}
            />
          </div>
          
          {photoFile && (
            <div className="photo-info">
              ✅ New photo selected: {photoFile.name}
              <div className="photo-size">
                {(photoFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          )}
          
          {uploadProgress && (
            <div className="upload-progress">
              {uploadProgress}
            </div>
          )}
          
          {(photoUrl || photoFile) && (
            <div className="photo-preview">
              <img 
                src={photoFile ? URL.createObjectURL(photoFile) : photoUrl} 
                alt={itemName} 
                onError={(e) => {
                  e.target.style.display = 'none';
                }} 
              />
            </div>
          )}
        </div>
        
        <div className="form-field">
          <label>📝 Details</label>
          <textarea
            placeholder="Look for ORGANIC label. If not available: regular is fine. Ask store staff for help."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>
        
        <div className="form-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="save-btn" 
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

export default ItemDetailsModal;