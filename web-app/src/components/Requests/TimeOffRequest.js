import React, { useState } from 'react';
import { createTimeOffRequest } from '../../utils/requestUtils';

const TimeOffRequest = ({ familyId, currentUser, children, onClose, auPairId }) => {
  console.log('TimeOffRequest props:', { familyId, currentUser: currentUser?.uid, auPairId });
  
  const [formData, setFormData] = useState({
    type: 'babysitting',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '22:00',
    selectedChildren: 'all'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Auto-fill end date when start date is selected
      if (field === 'startDate' && value && !prev.endDate) {
        updated.endDate = value;
      }
      
      return updated;
    });
  };

  const handleChildSelection = (childId) => {
    if (formData.selectedChildren === 'all') {
      setFormData(prev => ({ ...prev, selectedChildren: [childId] }));
    } else {
      const currentSelection = Array.isArray(formData.selectedChildren) 
        ? formData.selectedChildren 
        : [];
      
      if (currentSelection.includes(childId)) {
        const newSelection = currentSelection.filter(id => id !== childId);
        setFormData(prev => ({ 
          ...prev, 
          selectedChildren: newSelection.length === 0 ? 'all' : newSelection 
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          selectedChildren: [...currentSelection, childId] 
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.startTime) return;

    setIsSubmitting(true);
    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = formData.endDate && formData.endTime 
        ? new Date(`${formData.endDate}T${formData.endTime}`)
        : new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000); // Default 4 hours

      const requestData = {
        type: formData.type,
        title: formData.type === 'babysitting' ? 'Babysitting' : 'Holiday Plans',
        description: formData.description,
        startTime: startDateTime,
        endTime: endDateTime,
        children: formData.selectedChildren,
        requestedBy: currentUser.uid
      };
      
      // Only add targetUser if auPairId is provided
      if (auPairId) {
        requestData.targetUser = auPairId;
      }

      await createTimeOffRequest(familyId, requestData);
      onClose();
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {formData.type === 'babysitting' ? 'Request Babysitting' : 'Notify Holiday Plans'}
          </h3>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Request Type */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Request Type</label>
            <div style={styles.typeSelector}>
              <button
                type="button"
                style={{
                  ...styles.typeButton,
                  ...(formData.type === 'babysitting' ? styles.typeButtonActive : {})
                }}
                onClick={() => handleChange('type', 'babysitting')}
              >
                👶 Babysitting Request
              </button>
              <button
                type="button"
                style={{
                  ...styles.typeButton,
                  ...(formData.type === 'holiday' ? styles.typeButtonActive : {})
                }}
                onClick={() => handleChange('type', 'holiday')}
              >
                ✈️ Holiday Plans
              </button>
            </div>
          </div>



          {/* Description */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={formData.type === 'babysitting' 
                ? 'Additional details about the babysitting needs...' 
                : 'Where you\'re going and any special instructions...'
              }
              style={styles.textarea}
              rows={3}
            />
          </div>

          {/* Date and Time */}
          <div style={styles.dateTimeRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Date & Time *</label>
              <div style={styles.dateTimeGroup}>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  style={styles.dateInput}
                  required
                />
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  style={styles.timeInput}
                  required
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>End Date & Time</label>
              <div style={styles.dateTimeGroup}>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  style={styles.dateInput}
                />
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  style={styles.timeInput}
                />
              </div>
            </div>
          </div>

          {/* Children Selection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              {formData.type === 'babysitting' ? 'Children to Care For' : 'Children Involved'}
            </label>
            <div style={styles.childrenSelector}>
              <button
                type="button"
                style={{
                  ...styles.childButton,
                  ...(formData.selectedChildren === 'all' ? styles.childButtonActive : {})
                }}
                onClick={() => handleChange('selectedChildren', 'all')}
              >
                👨‍👩‍👧‍👦 All Children
              </button>
              {children.map(child => (
                <button
                  key={child.id}
                  type="button"
                  style={{
                    ...styles.childButton,
                    ...(Array.isArray(formData.selectedChildren) && 
                        formData.selectedChildren.includes(child.id) 
                        ? styles.childButtonActive : {})
                  }}
                  onClick={() => handleChildSelection(child.id)}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={!formData.startDate || !formData.startTime || isSubmitting}
            >
              {isSubmitting 
                ? 'Sending...' 
                : (formData.type === 'babysitting' ? 'Send Request' : 'Send Notification')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: 'var(--space-4)'
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--border-light)'
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-lg)',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)'
  },
  form: {
    padding: 'var(--space-4)'
  },
  formGroup: {
    marginBottom: 'var(--space-4)'
  },
  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  typeSelector: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-2)'
  },
  typeButton: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  typeButtonActive: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: '1px solid var(--primary-purple)'
  },
  input: {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none'
  },
  textarea: {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none',
    resize: 'vertical'
  },
  dateTimeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-4)'
  },
  dateTimeGroup: {
    display: 'flex',
    gap: 'var(--space-2)'
  },
  dateInput: {
    flex: 1,
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none'
  },
  timeInput: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none'
  },
  childrenSelector: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)'
  },
  childButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  childButtonActive: {
    backgroundColor: '#10b981',
    color: 'var(--white)',
    border: '1px solid #10b981'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
    marginTop: 'var(--space-6)',
    paddingTop: 'var(--space-4)',
    borderTop: '1px solid var(--border-light)'
  },
  cancelButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  },
  submitButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  }
};

export default TimeOffRequest;