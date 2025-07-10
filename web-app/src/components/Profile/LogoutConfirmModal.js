import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { blurOverlayStyle } from '../../styles/modalStyles';

const LogoutConfirmModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await signOut(auth);
      onConfirm();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.content}>
          <div style={styles.icon}>🔓</div>
          <h3 style={styles.title}>Sign Out</h3>
          <p style={styles.message}>
            Are you sure you want to sign out of FamilySync?
          </p>
          
          <div style={styles.actions}>
            <button 
              style={styles.cancelButton} 
              onClick={onCancel}
              autoFocus
            >
              Cancel
            </button>
            <button 
              style={styles.confirmButton} 
              onClick={handleConfirm}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    ...blurOverlayStyle,
    zIndex: 2000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '320px',
    width: '90%',
    margin: '20px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    animation: 'scaleIn 0.2s ease'
  },
  content: {
    padding: '24px',
    textAlign: 'center'
  },
  icon: {
    fontSize: '32px',
    marginBottom: '16px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.4',
    margin: '0 0 24px 0'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    minWidth: '80px'
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    minWidth: '80px'
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .logout-cancel-button:hover {
    background-color: #E5E5EA !important;
  }
  
  .logout-confirm-button:hover {
    background-color: #D70015 !important;
  }
  
  .logout-cancel-button:focus,
  .logout-confirm-button:focus {
    outline: 2px solid #007AFF;
    outline-offset: 2px;
  }
`;
document.head.appendChild(styleSheet);

export default LogoutConfirmModal;