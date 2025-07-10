import React, { useState, useEffect } from 'react';
import { formatDate } from '../../utils/validation';

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

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onCancel} />
      
      {/* Modal */}
      <div style={styles.modal}>
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
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
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
  form: {
    padding: '20px'
  },
  formGroup: {
    marginBottom: '20px',
    position: 'relative'
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
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #E5E5EA',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  errorText: {
    display: 'block',
    color: '#FF3B30',
    fontSize: '12px',
    marginTop: '4px'
  },
  charCount: {
    position: 'absolute',
    right: '0',
    bottom: '-18px',
    fontSize: '12px',
    color: '#8E8E93'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #E5E5EA'
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
  saveButton: {
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

export default EditChildModal;