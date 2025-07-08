import React, { useState, useEffect } from 'react';
import { createEventOverride, deleteEventOverride } from '../../utils/eventOverridesUtils';
import { PICKUP_PERSON_OPTIONS, pickupPersonToResponsibility, responsibilityToPickupPerson } from '../../utils/schoolPickupUtils';

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

  // Initialize form data with current event values (including any overrides)
  useEffect(() => {
    setFormData({
      title: event.title || '',
      description: event.description || '',
      time: event.time || '',
      responsibility: event.responsibility || 'au_pair',
      location: event.location || '',
      additionalInfo: event.additionalInfo || '',
      cancelled: false
    });
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

      console.log('Creating event override with data:', overrideData);
      const overrideId = await createEventOverride(familyId, overrideData);
      console.log('Event override created with ID:', overrideId);
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
      case 'aware': return 'Awareness';
      default: return 'Au Pair';
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {event.type === 'routine' ? 'Edit Routine Event' : 'Edit Event'}
          </h3>
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
            {(() => {
              // Helper function to check if event is a meal or bedtime
              const isMealOrBedtimeEvent = event.title && (
                event.title.toLowerCase().includes('breakfast') ||
                event.title.toLowerCase().includes('lunch') ||
                event.title.toLowerCase().includes('dinner') ||
                event.title.toLowerCase().includes('snack') ||
                event.title.toLowerCase().includes('bedtime')
              );
              
              // Only show title and description fields if NOT a school pickup event AND NOT a meal/bedtime event
              const showTitleAndDescription = event.type !== 'school_pickup' && !isMealOrBedtimeEvent;
              
              return (
                <>
                  {showTitleAndDescription && (
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Event Title</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => handleChange('title', e.target.value)}
                          style={styles.input}
                          placeholder={event.type === 'routine' ? "e.g., Breakfast, Wake Up, Bedtime" : "e.g., School Drop-off, Appointment"}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleChange('description', e.target.value)}
                          style={styles.textarea}
                          placeholder={event.type === 'routine' ? "Modify instructions for this routine event" : "Additional details about this event"}
                          rows={3}
                        />
                      </div>
                    </>
                  )}

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
                    <label style={styles.label}>
                      {event.type === 'school_pickup' ? 'Pickup Person' : 'Responsibility'}
                    </label>
                    <div style={styles.responsibilityOptions}>
                      {event.type === 'school_pickup' 
                        ? PICKUP_PERSON_OPTIONS.map(option => {
                            const currentPickupPerson = responsibilityToPickupPerson(formData.responsibility);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                style={{
                                  ...styles.responsibilityButton,
                                  ...(currentPickupPerson === option.value ? styles.responsibilityButtonActive : {})
                                }}
                                onClick={() => handleChange('responsibility', pickupPersonToResponsibility(option.value))}
                              >
                                {option.label}
                              </button>
                            );
                          })
                        : (() => {
                            // For meal and bedtime events, exclude 'aware' option
                            const responsibilityOptions = isMealOrBedtimeEvent 
                              ? ['au_pair', 'parent', 'shared']
                              : ['au_pair', 'parent', 'shared', 'aware'];
                            
                            return responsibilityOptions.map(option => (
                              <button
                                key={option}
                                type="button"
                                style={{
                                  ...styles.responsibilityButton,
                                  ...(formData.responsibility === option ? styles.responsibilityButtonActive : {})
                                }}
                                onClick={() => handleChange('responsibility', option)}
                              >
                                {getResponsibilityLabel(option)}
                              </button>
                            ));
                          })()
                      }
                    </div>
                  </div>

                  {/* Only show location field if NOT a school pickup event AND NOT a meal/bedtime event */}
                  {event.type !== 'school_pickup' && !isMealOrBedtimeEvent && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        style={styles.input}
                        placeholder={event.type === 'routine' ? "e.g., Kitchen, Child's Room, Living Room" : "Location for this event"}
                      />
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Additional Notes</label>
                    <textarea
                      value={formData.additionalInfo}
                      onChange={(e) => handleChange('additionalInfo', e.target.value)}
                      style={styles.textarea}
                      placeholder={
                        isMealOrBedtimeEvent 
                          ? event.title && event.title.toLowerCase().includes('bedtime')
                            ? "Special bedtime routine instructions or notes"
                            : "Special cooking instructions or dietary notes for this meal"
                          : event.type === 'routine' 
                            ? "Special instructions for this routine event today/tomorrow" 
                            : "Any special instructions or changes for this occurrence"
                      }
                      rows={2}
                    />
                  </div>
                </>
              );
            })()}
          </div>

          <div style={styles.notice}>
            <span style={styles.noticeIcon}>ℹ️</span>
            <span style={styles.noticeText}>
              {event.type === 'routine' 
                ? `Changes only apply to this specific occurrence (${event.isToday ? 'today' : 'tomorrow'}). The routine itself remains unchanged for future days.`
                : `Changes only apply to this specific occurrence (${event.isToday ? 'today' : 'tomorrow'})`
              }
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
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)'
  },
  responsibilityButtonActive: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: '1px solid var(--primary-purple)'
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