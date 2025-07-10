import React, { useState } from 'react';
import { validateEmail } from '../../utils/validation';

const InviteModal = ({ type, onSend, onCancel, sending }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError('');
    onSend(email.trim());
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    if (error) {
      setError('');
    }
  };

  const getModalTitle = () => {
    return type === 'parent' ? 'Invite Parent' : 'Invite Au Pair';
  };

  const getModalDescription = () => {
    if (type === 'parent') {
      return 'Send an invitation to another parent to join your family. They will have full access to manage family activities.';
    }
    return 'Send an invitation to an au pair to join your family. They will be able to view schedules and complete assigned tasks.';
  };

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onCancel} />
      
      {/* Modal */}
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{getModalTitle()}</h2>
          <button style={styles.closeButton} onClick={onCancel} disabled={sending}>
            ×
          </button>
        </div>

        <div style={styles.modalContent}>
          <p style={styles.description}>
            {getModalDescription()}
          </p>

          <form style={styles.form} onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Email Address <span style={styles.required}>*</span>
              </label>
              <input
                type="email"
                style={{...styles.input, ...(error ? styles.inputError : {})}}
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="Enter email address"
                disabled={sending}
                autoFocus
              />
              {error && (
                <span style={styles.errorText}>{error}</span>
              )}
            </div>

            <div style={styles.info}>
              <p style={styles.infoText}>
                ℹ️ The invited {type === 'parent' ? 'parent' : 'au pair'} will receive an email with instructions to join your family.
              </p>
              <p style={styles.infoText}>
                The invitation will expire in 14 days if not accepted.
              </p>
            </div>

            <div style={styles.actions}>
              <button 
                type="button" 
                style={styles.cancelButton} 
                onClick={onCancel}
                disabled={sending}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={styles.sendButton}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    width: '90%',
    maxWidth: '450px',
    zIndex: 1001
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #E5E5EA'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: 0
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '28px',
    color: '#8E8E93',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalContent: {
    padding: '20px'
  },
  description: {
    fontSize: '15px',
    color: '#666',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  form: {
    display: 'flex',
    flexDirection: 'column'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '6px'
  },
  required: {
    color: '#FF3B30'
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #E5E5EA',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  inputError: {
    borderColor: '#FF3B30'
  },
  errorText: {
    display: 'block',
    color: '#FF3B30',
    fontSize: '12px',
    marginTop: '4px'
  },
  info: {
    backgroundColor: '#F2F7FF',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px'
  },
  infoText: {
    fontSize: '13px',
    color: '#0066CC',
    margin: '4px 0',
    lineHeight: '1.4'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  sendButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

export default InviteModal;