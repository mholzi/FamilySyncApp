import React, { useState, useEffect } from 'react';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { getUserName } from '../../utils/userUtils';
import PaymentTracker from './PaymentTracker';
import './ApprovalInterface.css';

const ApprovalInterface = ({ list, familyId, currentUser, onClose }) => {
  const [approving, setApproving] = useState(false);
  const [showPaymentTracker, setShowPaymentTracker] = useState(false);
  const [uploaderName, setUploaderName] = useState('...');

  useEffect(() => {
    const fetchUploaderName = async () => {
      if (list.receiptUploadedBy) {
        const name = await getUserName(list.receiptUploadedBy);
        setUploaderName(name);
      }
    };

    fetchUploaderName();
  }, [list.receiptUploadedBy]);

  const handleApprove = async () => {
    if (approving) return;

    setApproving(true);
    try {
      const listRef = doc(db, 'families', familyId, 'shopping', list.id);
      
      await updateDoc(listRef, {
        status: 'approved',
        paymentStatus: 'approved',
        approvedBy: currentUser.uid,
        approvedAt: Timestamp.now()
      });

      setShowPaymentTracker(true);
    } catch (error) {
      console.error('Error approving shopping:', error);
      alert('Failed to approve. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      const listRef = doc(db, 'families', familyId, 'shopping', list.id);
      
      await updateDoc(listRef, {
        status: 'paid-out',
        paymentStatus: 'paid-out',
        paidOutBy: currentUser.uid,
        paidOutAt: Timestamp.now()
      });

      onClose();
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Failed to mark as paid. Please try again.');
    }
  };

  if (showPaymentTracker) {
    return (
      <PaymentTracker
        list={list}
        onMarkPaid={handleMarkPaid}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="approval-overlay">
      <div className="approval-modal">
        <h4>{uploaderName}'s Shopping - ${list.actualTotal?.toFixed(2) || '0.00'}</h4>
        
        <div className="receipt-section">
          {list.receiptPhotoUrl ? (
            <div className="receipt-photo">
              <img 
                src={list.receiptPhotoUrl} 
                alt="Receipt" 
                className="receipt-image"
                onClick={() => window.open(list.receiptPhotoUrl, '_blank')}
              />
              <div className="photo-info">
                📸 Click to view full size
              </div>
            </div>
          ) : list.receiptPhotoName ? (
            <div className="receipt-photo">
              📸 Receipt Photo: {list.receiptPhotoName}
            </div>
          ) : (
            <div className="no-photo">
              📄 Receipt uploaded
            </div>
          )}
        </div>
        
        {list.receiptNotes && (
          <div className="notes-section">
            <p>"{list.receiptNotes}"</p>
          </div>
        )}
        
        <div className="approval-actions">
          <button 
            className="approve-btn"
            onClick={handleApprove}
            disabled={approving}
          >
            {approving ? 'Approving...' : '✅ Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalInterface;