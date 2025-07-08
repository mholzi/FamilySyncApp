import React, { useState } from 'react';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import './PaymentStatusCard.css';

const PaymentStatusCard = ({ list, familyId, currentUser, onUpdate }) => {
  const [confirming, setConfirming] = useState(false);

  const handleConfirmPayment = async () => {
    if (confirming) return;

    setConfirming(true);
    try {
      const listRef = doc(db, 'families', familyId, 'shopping', list.id);
      
      await updateDoc(listRef, {
        paymentConfirmedBy: currentUser.uid,
        paymentConfirmedAt: Timestamp.now(),
        paymentStatus: 'confirmed'
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const getStatusInfo = () => {
    switch (list.paymentStatus) {
      case 'pending':
        return {
          status: 'Waiting for approval',
          className: 'status-pending'
        };
      case 'approved':
        return {
          status: 'Payment approved - awaiting transfer',
          className: 'status-approved'
        };
      case 'paid-out':
        return {
          status: 'Payment sent',
          className: 'status-paid'
        };
      case 'confirmed':
        return {
          status: 'Payment received',
          className: 'status-confirmed'
        };
      default:
        return {
          status: 'Unknown status',
          className: 'status-unknown'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const showConfirmButton = list.paymentStatus === 'paid-out' && !list.paymentConfirmedBy;

  return (
    <div className={`payment-status-card ${statusInfo.className}`}>
      <div className="payment-header">
        <h4>{list.name}</h4>
        <div className="top-right-actions">
          {showConfirmButton ? (
            <button 
              className="confirm-payment-btn"
              onClick={handleConfirmPayment}
              disabled={confirming}
            >
              {confirming ? 'Confirming...' : 'Payment Received'}
            </button>
          ) : (
            <div className="status-badge">
              <span className="status-text">{statusInfo.status}</span>
            </div>
          )}
        </div>
      </div>
      <div className="payment-amount">
        <span className="amount">${list.actualTotal?.toFixed(2) || '0.00'}</span>
      </div>
    </div>
  );
};

export default PaymentStatusCard;