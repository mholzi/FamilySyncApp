import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const EditChildModal = ({ child, onSave, onCancel, errors = {} }) => {
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    profilePicture: '',
    allergies: '',
    medicalInfo: '',
    emergencyContact: '',
    notes: ''
  });

  useEffect(() => {
    if (child) {
      // Convert date to input format (YYYY-MM-DD)
      let dateValue = '';
      if (child.dateOfBirth) {
        const date = child.dateOfBirth.toDate ? child.dateOfBirth.toDate() : new Date(child.dateOfBirth);
        dateValue = date.toISOString().split('T')[0];
      }

      setFormData({
        id: child.id || '',
        name: child.name || '',
        dateOfBirth: dateValue,
        profilePicture: child.profilePicture || '',
        allergies: child.allergies || '',
        medicalInfo: child.medicalInfo || '',
        emergencyContact: child.emergencyContact || '',
        notes: child.notes || ''
      });
    }
  }, [child]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert date string to Date object
    const submitData = {
      ...formData,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null
    };
    
    onSave(submitData);
  };

  // Calculate max date (today) and min date (18 years ago)
  const today = new Date().toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 18);
  const minDateStr = minDate.toISOString().split('T')[0];


  // Create or get modal root
  let modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    modalRoot.style.position = 'fixed';
    modalRoot.style.top = '0';
    modalRoot.style.left = '0';
    modalRoot.style.right = '0';
    modalRoot.style.bottom = '0';
    modalRoot.style.zIndex = '10000';
    modalRoot.style.pointerEvents = 'none';
    document.body.appendChild(modalRoot);
  }

  return createPortal(
    <div style={{...styles.backdrop, pointerEvents: 'auto'}} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {formData.id ? 'Edit Child' : 'Add Child'}
          </h2>
          <button style={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          {/* Name */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              style={{...styles.input, ...(errors.name ? styles.inputError : {})}}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter child's name"
              maxLength={50}
            />
            {errors.name && (
              <span style={styles.errorText}>{errors.name}</span>
            )}
          </div>

          {/* Date of Birth */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Date of Birth <span style={styles.required}>*</span>
            </label>
            <input
              type="date"
              style={{...styles.input, ...(errors.dateOfBirth ? styles.inputError : {})}}
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              max={today}
              min={minDateStr}
            />
            {errors.dateOfBirth && (
              <span style={styles.errorText}>{errors.dateOfBirth}</span>
            )}
          </div>

          {/* Allergies */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Allergies</label>
            <textarea
              style={{...styles.textarea, ...(errors.allergies ? styles.inputError : {})}}
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              placeholder="List any allergies (optional)"
              rows={3}
              maxLength={500}
            />
            {errors.allergies && (
              <span style={styles.errorText}>{errors.allergies}</span>
            )}
            <span style={styles.charCount}>
              {formData.allergies.length}/500
            </span>
          </div>

          {/* Medical Information */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Medical Information</label>
            <textarea
              style={{...styles.textarea, ...(errors.medicalInfo ? styles.inputError : {})}}
              value={formData.medicalInfo}
              onChange={(e) => handleInputChange('medicalInfo', e.target.value)}
              placeholder="Any medical conditions or medications (optional)"
              rows={3}
              maxLength={500}
            />
            {errors.medicalInfo && (
              <span style={styles.errorText}>{errors.medicalInfo}</span>
            )}
            <span style={styles.charCount}>
              {formData.medicalInfo.length}/500
            </span>
          </div>

          {/* Emergency Contact */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Emergency Contact</label>
            <input
              type="text"
              style={{...styles.input, ...(errors.emergencyContact ? styles.inputError : {})}}
              value={formData.emergencyContact}
              onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
              placeholder="Name and phone number (optional)"
              maxLength={200}
            />
            {errors.emergencyContact && (
              <span style={styles.errorText}>{errors.emergencyContact}</span>
            )}
          </div>

          {/* Notes */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Additional Notes</label>
            <textarea
              style={{...styles.textarea, ...(errors.notes ? styles.inputError : {})}}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any other important information (optional)"
              rows={3}
              maxLength={500}
            />
            {errors.notes && (
              <span style={styles.errorText}>{errors.notes}</span>
            )}
            <span style={styles.charCount}>
              {formData.notes.length}/500
            </span>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button type="button" style={styles.cancelButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" style={styles.saveButton}>
              {formData.id ? 'Save Changes' : 'Add Child'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    modalRoot
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    boxShadow: 'var(--md-sys-elevation-level3)',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    margin: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '400',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    fontFamily: 'var(--md-sys-typescale-headline-small-font-family-name)'
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: 'var(--md-sys-color-on-surface-variant)',
    cursor: 'pointer',
    padding: '8px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  form: {
    padding: '24px'
  },
  formGroup: {
    marginBottom: '20px',
    position: 'relative'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginBottom: '8px',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)'
  },
  required: {
    color: '#FF3B30'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    backgroundColor: 'var(--md-sys-color-surface)',
    boxSizing: 'border-box',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    transition: 'border-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    outline: 'none'
  },
  inputError: {
    borderColor: 'var(--md-sys-color-error)'
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    backgroundColor: 'var(--md-sys-color-surface)',
    boxSizing: 'border-box',
    color: 'var(--md-sys-color-on-surface)',
    resize: 'vertical',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    transition: 'border-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    outline: 'none'
  },
  errorText: {
    display: 'block',
    color: 'var(--md-sys-color-error)',
    fontSize: '12px',
    marginTop: '4px',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  charCount: {
    position: 'absolute',
    right: '0',
    bottom: '-18px',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid var(--md-sys-color-outline-variant)'
  },
  cancelButton: {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  saveButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  }
};

export default EditChildModal;