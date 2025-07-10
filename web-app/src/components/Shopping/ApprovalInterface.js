import React, { useState, useEffect } from 'react';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { getUserName } from '../../utils/userUtils';
import { blurOverlayStyle, modalContainerStyle } from '../../styles/modalStyles';

const ApprovalInterface = ({ list, familyId, currentUser, family, onClose }) => {
  const [approving, setApproving] = useState(false);
  const [uploaderName, setUploaderName] = useState('...');

  // Determine user role
  const userRole = family?.parentUids?.includes(currentUser?.uid) ? 'parent' : 'aupair';
  const isAuPair = userRole === 'aupair';
  const isPaidOut = list.paymentStatus === 'paid-out';

  useEffect(() => {
    const fetchUploaderName = async () => {
      if (list.receiptUploadedBy) {
        const name = await getUserName(list.receiptUploadedBy);
        setUploaderName(name);
      }
    };

    fetchUploaderName();
  }, [list.receiptUploadedBy]);

  const handleAction = async () => {
    if (approving) return;

    setApproving(true);
    try {
      const listRef = doc(db, 'families', familyId, 'shopping', list.id);
      
      if (isAuPair && isPaidOut) {
        // Au Pair confirming payment receipt
        await updateDoc(listRef, {
          paymentConfirmedBy: currentUser.uid,
          paymentConfirmedAt: Timestamp.now(),
          paymentStatus: 'confirmed'
        });
      } else if (!isAuPair) {
        // Parent marking as paid
        await updateDoc(listRef, {
          status: 'paid-out',
          paymentStatus: 'paid-out',
          paidOutBy: currentUser.uid,
          paidOutAt: Timestamp.now()
        });
      }

      onClose();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status. Please try again.');
    } finally {
      setApproving(false);
    }
  };



  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{isAuPair && isPaidOut ? 'Confirm Payment Receipt' : 'Payment Approval'}</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.content}>
          <div style={styles.amountSection}>
            <div style={styles.uploaderInfo}>
              <span style={styles.uploaderName}>{uploaderName}'s Shopping</span>
              <span style={styles.listName}>{list.name}</span>
            </div>
            <div style={styles.amount}>
              €{list.actualTotal?.toFixed(2) || list.totalAmount?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div style={styles.receiptSection}>
            {list.receiptPhotoUrl ? (
              <div style={styles.receiptContainer}>
                <img 
                  src={list.receiptPhotoUrl} 
                  alt="Receipt" 
                  style={styles.receiptImage}
                  onClick={() => window.open(list.receiptPhotoUrl, '_blank')}
                />
                <div style={styles.photoInfo}>
                  Click to view full size
                </div>
              </div>
            ) : list.receiptPhotoName ? (
              <div style={styles.receiptPlaceholder}>
                <span style={styles.receiptIcon}>📸</span>
                <span style={styles.receiptText}>Receipt Photo: {list.receiptPhotoName}</span>
              </div>
            ) : (
              <div style={styles.receiptPlaceholder}>
                <span style={styles.receiptIcon}>📄</span>
                <span style={styles.receiptText}>Receipt uploaded</span>
              </div>
            )}
          </div>
          
          {list.receiptNotes && (
            <div style={styles.notesSection}>
              <div style={styles.notesLabel}>Notes from {uploaderName}:</div>
              <div style={styles.notesText}>{list.receiptNotes}</div>
            </div>
          )}
        </div>
        
        <div style={styles.actions}>
          <button 
            style={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            style={{
              ...styles.confirmButton,
              ...(approving ? styles.confirmButtonDisabled : {})
            }}
            onClick={handleAction}
            disabled={approving}
          >
            {approving ? 'Processing...' : (isAuPair && isPaidOut ? 'Confirm Payment Received' : 'Mark as Paid')}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: blurOverlayStyle,
  modal: modalContainerStyle,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 16px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '400',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-headline-small-font-family-name)'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: 'var(--md-sys-color-on-surface-variant)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto'
  },
  amountSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  uploaderInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  uploaderName: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)'
  },
  listName: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  amount: {
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--md-sys-color-primary)',
    fontFamily: 'var(--md-sys-typescale-display-small-font-family-name)'
  },
  receiptSection: {
    marginBottom: '24px'
  },
  receiptContainer: {
    position: 'relative',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  receiptImage: {
    width: '100%',
    maxHeight: '300px',
    objectFit: 'contain',
    display: 'block'
  },
  photoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: '12px',
    textAlign: 'center'
  },
  receiptPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '32px',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  receiptIcon: {
    fontSize: '32px'
  },
  receiptText: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  notesSection: {
    padding: '16px',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    marginBottom: '24px'
  },
  notesLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-primary-container)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  notesText: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-primary-container)',
    fontStyle: 'italic',
    lineHeight: '1.5'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px 24px',
    borderTop: '1px solid var(--md-sys-color-outline-variant)',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    backgroundColor: 'transparent',
    color: 'var(--md-sys-color-primary)',
    border: '1px solid var(--md-sys-color-outline)',
    padding: '10px 24px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)'
  },
  confirmButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    padding: '10px 24px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    minWidth: '120px'
  },
  confirmButtonDisabled: {
    backgroundColor: 'var(--md-sys-color-on-surface)',
    opacity: 0.38,
    cursor: 'not-allowed'
  }
};

export default ApprovalInterface;