import React, { useState, useEffect } from 'react';
import { createEventOverride, deleteEventOverride } from '../../utils/eventOverridesUtils';

const EditEventModal = ({ event, familyId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    time: event.time || '',
    responsibility: event.responsibility || 'au_pair',
    location: event.location || '',
    additionalInfo: event.additionalInfo || '',
    cancelled: false
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Determine the responsibility from the event
  useEffect(() => {
    // Try to determine responsibility from the event
    let responsibility = 'au_pair';
    
    if (event.type === 'routine') {
      // Check the original responsibility from routine
      if (event.originalResponsibility) {
        responsibility = event.originalResponsibility;
      } else if (event.description?.includes('parent')) {
        responsibility = 'parent';
      } else if (event.description?.includes('Coordinate with parents') || event.additionalInfo?.includes('Coordinate with parents')) {
        responsibility = 'shared';
      }
    }
    
    setFormData(prev => ({ ...prev, responsibility }));
  }, [event]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const date = event.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
      
      // Create override data
      const overrideData = {
        eventType: event.type,
        eventTitle: event.title,
        date: date,
        childId: event.children[0]?.child.id || 'all',
        time: event.time,
        ...formData,
        originalEvent: {
          title: event.title,
          description: event.description,
          time: event.time,
          responsibility: event.responsibility || 'au_pair'
        }
      };

      await createEventOverride(familyId, overrideData);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving event override:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to cancel this event for today/tomorrow?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const date = event.isToday ? new Date().toDateString() : new Date(Date.now() + 86400000).toDateString();
      
      // Create a cancellation override
      const overrideData = {
        eventType: event.type,
        eventTitle: event.title,
        date: date,
        childId: event.children[0]?.child.id || 'all',
        time: event.time,
        cancelled: true,
        originalEvent: {
          title: event.title,
          description: event.description,
          time: event.time
        }
      };

      await createEventOverride(familyId, overrideData);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getResponsibilityLabel = (value) => {
    switch (value) {
      case 'parent': return 'Parent';
      case 'au_pair': return 'Au Pair';
      case 'shared': return 'Shared';
      default: return 'Au Pair';
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Edit Event</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          <div style={styles.eventInfo}>
            <div style={styles.eventDate}>
              {event.isToday ? 'Today' : 'Tomorrow'} at {event.time}
            </div>
            {event.children && event.children.length > 0 && (
              <div style={styles.childrenNames}>
                For: {event.children.map(c => c.child.name).join(', ')}
              </div>
            )}
          </div>

          <div style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Event Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                style={styles.input}
                placeholder="e.g., Breakfast, School Drop-off"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                style={styles.textarea}
                placeholder="Additional details about this event"
                rows={3}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Responsibility</label>
              <div style={styles.responsibilityOptions}>
                {['au_pair', 'parent', 'shared'].map(option => (
                  <button
                    key={option}
                    type="button"
                    style={{
                      ...styles.responsibilityButton,
                      ...(formData.responsibility === option ? styles.responsibilityButtonActive : {})
                    }}
                    onClick={() => handleChange('responsibility', option)}
                  >
                    <span style={styles.responsibilityIcon}>
                      {option === 'au_pair' ? '👩‍🎓' : option === 'parent' ? '👨‍👩‍👧' : '🤝'}
                    </span>
                    {getResponsibilityLabel(option)}
                  </button>
                ))}
              </div>
            </div>

            {formData.location !== undefined && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  style={styles.input}
                  placeholder="Location for this event"
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Additional Notes</label>
              <textarea
                value={formData.additionalInfo}
                onChange={(e) => handleChange('additionalInfo', e.target.value)}
                style={styles.textarea}
                placeholder="Any special instructions or changes for this occurrence"
                rows={2}
              />
            </div>
          </div>

          <div style={styles.notice}>
            <span style={styles.noticeIcon}>ℹ️</span>
            <span style={styles.noticeText}>
              Changes only apply to this specific occurrence ({event.isToday ? 'today' : 'tomorrow'})
            </span>
          </div>
        </div>

        <div style={styles.footer}>
          <button
            style={styles.cancelEventButton}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Cancelling...' : 'Cancel Event'}
          </button>
          <div style={styles.footerRight}>
            <button
              style={styles.cancelButton}
              onClick={onClose}
              disabled={isSaving || isDeleting}
            >
              Close
            </button>
            <button
              style={styles.saveButton}
              onClick={handleSave}
              disabled={isSaving || isDeleting}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
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
    zIndex: 10000,
    padding: 'var(--space-4)'
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
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
    fontSize: 'var(--font-size-xl)',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-4)'
  },
  eventInfo: {
    backgroundColor: '#f8f9fa',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)'
  },
  eventDate: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-1)'
  },
  childrenNames: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)'
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)'
  },
  input: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
    transition: 'var(--transition-fast)'
  },
  textarea: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'var(--transition-fast)'
  },
  responsibilityOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'var(--space-2)'
  },
  responsibilityButton: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-1)'
  },
  responsibilityButtonActive: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    borderColor: 'var(--primary-purple)'
  },
  responsibilityIcon: {
    fontSize: 'var(--font-size-xl)'
  },
  notice: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-4)',
    padding: 'var(--space-3)',
    backgroundColor: '#e3f2fd',
    borderRadius: 'var(--radius-md)'
  },
  noticeIcon: {
    fontSize: 'var(--font-size-base)'
  },
  noticeText: {
    fontSize: 'var(--font-size-sm)',
    color: '#1976d2'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--border-light)'
  },
  footerRight: {
    display: 'flex',
    gap: 'var(--space-3)'
  },
  cancelEventButton: {
    padding: 'var(--space-2) var(--space-4)',
    border: '1px solid #ef4444',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: '#ef4444',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  cancelButton: {
    padding: 'var(--space-2) var(--space-4)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  saveButton: {
    padding: 'var(--space-2) var(--space-4)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  }
};

export default EditEventModal;