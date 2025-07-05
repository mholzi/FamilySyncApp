import React, { useState, useEffect } from 'react';
import { getUserName } from '../../utils/userUtils';
import './PaymentTracker.css';

const PaymentTracker = ({ list, onMarkPaid, onClose }) => {
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

  return (
    <div className="payment-overlay">
      <div className="payment-modal">
        <h4>Owe {uploaderName}</h4>
        
        <div className="payment-item">
          <div className="item-info">
            <span className="item-name">{list.name} - ${list.actualTotal?.toFixed(2)} ✅</span>
          </div>
          <button 
            className="mark-paid-btn"
            onClick={onMarkPaid}
          >
            Mark as Paid
          </button>
        </div>
        
        <div className="total-section">
          <strong>Total: ${list.actualTotal?.toFixed(2) || '0.00'}</strong>
        </div>
        
        <div className="payment-actions">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentTracker;