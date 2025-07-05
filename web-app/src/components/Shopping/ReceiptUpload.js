import React, { useState } from 'react';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadReceiptPhoto, validateImageFile } from '../../utils/shoppingPhotoUpload';
import './ReceiptUpload.css';

const ReceiptUpload = ({ list, familyId, currentUser, onClose }) => {
  const [total, setTotal] = useState('');
  const [note, setNote] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateImageFile(file);
        setReceiptPhoto(file);
        setUploadProgress('');
      } catch (error) {
        alert(error.message);
        e.target.value = ''; // Clear the input
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!total.trim() || uploading) return;

    setUploading(true);
    try {
      const listRef = doc(db, 'families', familyId, 'shopping', list.id);
      
      const receiptData = {
        actualTotal: parseFloat(total),
        receiptNotes: note.trim(),
        receiptUploadedAt: Timestamp.now(),
        receiptUploadedBy: currentUser.uid,
        status: 'needs-approval',
        receiptStatus: 'complete',
        needsReimbursement: true
      };

      // Upload photo to Firebase Storage if provided
      if (receiptPhoto) {
        setUploadProgress('Uploading photo...');
        
        const photoData = await uploadReceiptPhoto(receiptPhoto, familyId, list.id);
        
        receiptData.receiptPhotoUrl = photoData.url;
        receiptData.receiptPhotoPath = photoData.path;
        receiptData.receiptPhotoName = photoData.filename;
        receiptData.receiptPhotoSize = photoData.size;
        
        setUploadProgress('Saving to database...');
      }

      await updateDoc(listRef, receiptData);
      
      setUploadProgress('Complete!');
      onClose();
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert(`Failed to upload receipt: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="receipt-overlay">
      <div className="receipt-modal">
        <h4>Upload Receipt</h4>
        
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="photo-input" className="photo-upload-btn">
              📸 Take Photo
            </label>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
            {receiptPhoto && (
              <div className="photo-info">
                ✅ Photo selected: {receiptPhoto.name}
                <div className="photo-size">
                  {(receiptPhoto.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            )}
            {uploadProgress && (
              <div className="upload-progress">
                {uploadProgress}
              </div>
            )}
          </div>
          
          <div className="form-field">
            <label>Total: $</label>
            <input
              type="number"
              placeholder="47.83"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              step="0.01"
              min="0"
              required
              autoFocus
            />
          </div>
          
          <div className="form-field">
            <label>Note:</label>
            <textarea
              placeholder="Got everything except organic milk - got regular"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={!total.trim() || uploading}
            >
              {uploading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiptUpload;