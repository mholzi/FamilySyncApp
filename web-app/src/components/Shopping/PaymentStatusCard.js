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
          icon: '⏳',
          className: 'status-pending'
        };
      case 'approved':
        return {
          status: 'Payment approved - awaiting transfer',
          icon: '✅',
          className: 'status-approved'
        };
      case 'paid-out':
        return {
          status: 'Payment sent',
          icon: '💰',
          className: 'status-paid'
        };
      case 'confirmed':
        return {
          status: 'Payment received',
          icon: '🎉',
          className: 'status-confirmed'
        };
      default:
        return {
          status: 'Unknown status',
          icon: '❓',
          className: 'status-unknown'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const showConfirmButton = list.paymentStatus === 'paid-out' && !list.paymentConfirmedBy;

  return (
    <div className={`payment-status-card ${statusInfo.className}`}>
      <div className="payment-header">
        <div className="payment-info">
          <h4>{list.name}</h4>
          <span className="amount">${list.actualTotal?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="status-badge">
          <span className="status-icon">{statusInfo.icon}</span>
          <span className="status-text">{statusInfo.status}</span>
        </div>
      </div>

      {list.receiptUploadedAt && (
        <div className="receipt-info">
          <span className="receipt-date">
            Receipt uploaded: {new Date(list.receiptUploadedAt.toDate()).toLocaleDateString()}
          </span>
        </div>
      )}

      {list.approvedAt && (
        <div className="approval-info">
          <span className="approval-date">
            Approved: {new Date(list.approvedAt.toDate()).toLocaleDateString()}
          </span>
        </div>
      )}

      {list.paidOutAt && (
        <div className="payout-info">
          <span className="payout-date">
            Paid out: {new Date(list.paidOutAt.toDate()).toLocaleDateString()}
          </span>
        </div>
      )}

      {showConfirmButton && (
        <div className="confirm-section">
          <p className="confirm-prompt">Have you received the payment?</p>
          <button 
            className="confirm-payment-btn"
            onClick={handleConfirmPayment}
            disabled={confirming}
          >
            {confirming ? 'Confirming...' : '✓ Confirm Payment Received'}
          </button>
        </div>
      )}

      {list.paymentConfirmedAt && (
        <div className="confirmation-info">
          <span className="confirmation-date">
            Payment confirmed: {new Date(list.paymentConfirmedAt.toDate()).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
};

export default PaymentStatusCard;