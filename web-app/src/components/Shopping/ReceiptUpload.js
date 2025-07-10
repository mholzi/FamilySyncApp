import React, { useState, useEffect } from 'react';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadReceiptPhoto, validateImageFile } from '../../utils/shoppingPhotoUpload';

const ReceiptUpload = ({ list, familyId, currentUser, onClose }) => {
  const [receipts, setReceipts] = useState([]);
  const [isAddingReceipt, setIsAddingReceipt] = useState(true); // Start in adding mode
  const [newReceipt, setNewReceipt] = useState({
    amount: '',
    note: '',
    photo: null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Load existing receipts from the list
  useEffect(() => {
    if (list.receipts && Array.isArray(list.receipts)) {
      setReceipts(list.receipts);
    }
  }, [list.receipts]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateImageFile(file);
        setNewReceipt(prev => ({ ...prev, photo: file }));
        setUploadProgress('');
      } catch (error) {
        alert(error.message);
        e.target.value = ''; // Clear the input
      }
    }
  };

  const handleAddReceipt = async () => {
    if (!newReceipt.amount.trim()) return;

    setUploading(true);
    try {
      const receiptData = {
        id: Date.now().toString(),
        amount: parseFloat(newReceipt.amount),
        note: newReceipt.note.trim(),
        uploadedAt: Timestamp.now(),
        uploadedBy: currentUser.uid
      };

      // Upload photo to Firebase Storage if provided
      if (newReceipt.photo) {
        setUploadProgress('Uploading photo...');
        
        const photoData = await uploadReceiptPhoto(newReceipt.photo, familyId, list.id, receiptData.id);
        
        receiptData.photoUrl = photoData.url;
        receiptData.photoPath = photoData.path;
        receiptData.photoName = photoData.filename;
        receiptData.photoSize = photoData.size;
      }

      const updatedReceipts = [...receipts, receiptData];
      setReceipts(updatedReceipts);

      // Auto-mark shopping as completed and send for approval when first receipt is uploaded
      const listRef = doc(db, 'families', familyId, 'shopping', list.id);
      const updateData = {
        receipts: updatedReceipts,
        totalAmount: updatedReceipts.reduce((sum, r) => sum + r.amount, 0),
        status: 'needs-approval',
        receiptStatus: 'sent-for-approval',
        paymentStatus: 'pending',
        sentForApprovalAt: Timestamp.now(),
        completedAt: list.status !== 'completed' ? Timestamp.now() : list.completedAt,
        receiptUploadedBy: currentUser.uid,
        lastUpdated: Timestamp.now()
      };

      await updateDoc(listRef, updateData);
      
      // Reset form
      setNewReceipt({ amount: '', note: '', photo: null });
      setIsAddingReceipt(false);
      setUploadProgress('Receipt added and sent for approval!');
      
      setTimeout(() => setUploadProgress(''), 2000);
    } catch (error) {
      console.error('Error adding receipt:', error);
      alert(`Failed to add receipt: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm('Are you sure you want to delete this receipt?')) return;

    try {
      const updatedReceipts = receipts.filter(r => r.id !== receiptId);
      setReceipts(updatedReceipts);

      const listRef = doc(db, 'families', familyId, 'shopping', list.id);
      await updateDoc(listRef, {
        receipts: updatedReceipts,
        totalAmount: updatedReceipts.reduce((sum, r) => sum + r.amount, 0),
        lastUpdated: Timestamp.now()
      });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt');
    }
  };

  // Removed handleSendForApproval - receipts are now automatically sent for approval

  const canEdit = list.receiptStatus === 'uploaded' || list.receiptStatus === 'pending';
  const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Receipt Management</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.content}>
        
          {/* Existing Receipts */}
          {receipts.length > 0 && (
            <div style={styles.existingReceipts}>
              <h4 style={styles.sectionTitle}>Uploaded Receipts</h4>
              {receipts.map(receipt => (
                <div key={receipt.id} style={styles.receiptItem}>
                  <div style={styles.receiptInfo}>
                    <span style={styles.receiptAmount}>€{receipt.amount.toFixed(2)}</span>
                    {receipt.note && <span style={styles.receiptNote}>{receipt.note}</span>}
                    {receipt.photoUrl && (
                      <span style={styles.receiptPhoto}>📸 Photo attached</span>
                    )}
                  </div>
                  {canEdit && (
                    <button 
                      style={styles.deleteReceiptBtn}
                      onClick={() => handleDeleteReceipt(receipt.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
              <div style={styles.totalAmount}>
                <strong>Total to Claim: €{totalAmount.toFixed(2)}</strong>
              </div>
            </div>
          )}

          {/* Add New Receipt Form */}
          {canEdit && (
            <div style={styles.addReceiptSection}>
              {receipts.length > 0 && !isAddingReceipt ? (
                <div style={styles.addReceiptContainer}>
                  <button 
                    style={styles.closeButtonInline}
                    onClick={onClose}
                  >
                    Close
                  </button>
                  <button 
                    style={styles.addReceiptBtn}
                    onClick={() => setIsAddingReceipt(true)}
                  >
                    + Add Another Receipt
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleAddReceipt(); }}>
                  <div style={styles.formField}>
                    <label style={styles.label}>Amount to Claim (€)</label>
                    <input
                      type="number"
                      placeholder="47.83"
                      value={newReceipt.amount}
                      onChange={(e) => setNewReceipt(prev => ({ ...prev, amount: e.target.value }))}
                      style={styles.input}
                      step="0.01"
                      min="0"
                      required
                      autoFocus
                    />
                  </div>
                  
                  <div style={styles.formField}>
                    <label style={styles.label}>Receipt Photo</label>
                    <label htmlFor="photo-input" style={styles.photoUploadBtn}>
                      📸 {newReceipt.photo ? 'Change Photo' : 'Take Photo'}
                    </label>
                    <input
                      id="photo-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                    {newReceipt.photo && (
                      <div style={styles.photoInfo}>
                        ✅ {newReceipt.photo.name}
                        <div style={styles.photoSize}>
                          {(newReceipt.photo.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div style={styles.formField}>
                    <label style={styles.label}>Note (optional)</label>
                    <textarea
                      placeholder="Store name, special notes..."
                      value={newReceipt.note}
                      onChange={(e) => setNewReceipt(prev => ({ ...prev, note: e.target.value }))}
                      style={styles.textarea}
                      rows={2}
                    />
                  </div>
                  
                  <div style={styles.formActions}>
                    {receipts.length > 0 && (
                      <button 
                        type="button" 
                        style={styles.cancelButton}
                        onClick={() => {
                          setIsAddingReceipt(false);
                          setNewReceipt({ amount: '', note: '', photo: null });
                        }}
                        disabled={uploading}
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit" 
                      style={{
                        ...styles.submitButton,
                        ...((!newReceipt.amount.trim() || uploading) ? styles.submitButtonDisabled : {})
                      }}
                      disabled={!newReceipt.amount.trim() || uploading}
                    >
                      {uploading ? 'Adding...' : 'Add Receipt'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {uploadProgress && (
            <div style={styles.uploadProgress}>
              {uploadProgress}
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div style={styles.footer}>
          {/* Only show Close button if no receipts or currently adding */}
          {(receipts.length === 0 || isAddingReceipt) && (
            <button 
              style={styles.closeButton2}
              onClick={onClose}
            >
              Close
            </button>
          )}
          
          {/* Send for Approval removed - happens automatically */}
        </div>
      </div>
    </div>
  );
};

// Material Design 3 styles matching the modal template
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
    maxWidth: '600px',
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
  existingReceipts: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '12px',
    margin: 0
  },
  receiptItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    marginBottom: '8px'
  },
  receiptInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  receiptAmount: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-primary)'
  },
  receiptNote: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  receiptPhoto: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  deleteReceiptBtn: {
    backgroundColor: 'var(--md-sys-color-error-container)',
    color: 'var(--md-sys-color-on-error-container)',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  totalAmount: {
    padding: '12px',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    textAlign: 'center',
    fontSize: '16px',
    marginTop: '8px'
  },
  addReceiptSection: {
    marginBottom: '24px'
  },
  addReceiptContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  addReceiptBtn: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    padding: '12px 20px',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  closeButtonInline: {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    padding: '12px 20px',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)'
  },
  input: {
    padding: '12px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '16px',
    outline: 'none',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface)'
  },
  textarea: {
    padding: '12px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '16px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface)'
  },
  photoUploadBtn: {
    display: 'inline-block',
    backgroundColor: 'var(--md-sys-color-secondary-container)',
    color: 'var(--md-sys-color-on-secondary-container)',
    border: 'none',
    padding: '12px 16px',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    textAlign: 'center'
  },
  photoInfo: {
    padding: '8px 12px',
    backgroundColor: 'var(--md-sys-color-tertiary-container)',
    color: 'var(--md-sys-color-on-tertiary-container)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '12px',
    marginTop: '8px'
  },
  photoSize: {
    fontSize: '11px',
    opacity: 0.7,
    marginTop: '2px'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px'
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
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: 'var(--md-sys-color-on-surface)',
    opacity: 0.38,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  uploadProgress: {
    padding: '12px',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    textAlign: 'center',
    fontSize: '14px',
    marginTop: '16px'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderTop: '1px solid var(--md-sys-color-outline-variant)'
  },
  closeButton2: {
    padding: '8px 16px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  sendApprovalBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  }
};

export default ReceiptUpload;