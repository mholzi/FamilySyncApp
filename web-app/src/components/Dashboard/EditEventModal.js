import React, { useState, useEffect } from 'react';
import { createEventOverride } from '../../utils/eventOverridesUtils';
import { PICKUP_PERSON_OPTIONS, pickupPersonToResponsibility, responsibilityToPickupPerson } from '../../utils/schoolPickupUtils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { useFamily } from '../../hooks/useFamily';
import { notifyParentsOfEventChange, NOTIFICATION_TYPES } from '../../utils/notificationUtils';

const EditEventModal = ({ event, familyId, onClose, onSave }) => {
  const [user] = useAuthState(auth);
  const { userData } = useFamily();
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    time: event.time || '',
    responsibility: event.responsibility || 'au_pair',
    location: event.location || '',
    additionalInfo: event.additionalInfo || '',
    requiredItems: event.requiredItems || [],
    cancelled: false
  });
  const [newRequiredItem, setNewRequiredItem] = useState('');
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
      requiredItems: event.requiredItems || [],
      cancelled: false
    });
  }, [event]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddRequiredItem = () => {
    if (newRequiredItem.trim()) {
      setFormData(prev => ({
        ...prev,
        requiredItems: [...prev.requiredItems, newRequiredItem.trim()]
      }));
      setNewRequiredItem('');
    }
  };

  const handleRemoveRequiredItem = (index) => {
    setFormData(prev => ({
      ...prev,
      requiredItems: prev.requiredItems.filter((_, i) => i !== index)
    }));
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
        time: event.time, // Keep original time for ID generation (override matching)
        // Store all form data including the new time as individual fields
        title: formData.title,
        description: formData.description,
        newTime: formData.time, // Store the new time separately
        responsibility: formData.responsibility,
        location: formData.location,
        additionalInfo: formData.additionalInfo,
        requiredItems: formData.requiredItems,
        originalEvent: {
          title: event.title,
          description: event.description,
          time: event.time,
          responsibility: event.responsibility || 'au_pair',
          requiredItems: event.requiredItems || []
        }
      };

      console.log('Creating event override with data:', overrideData);
      const overrideId = await createEventOverride(familyId, overrideData);
      console.log('Event override created with ID:', overrideId);
      
      // Send notification to parents if au pair made changes
      if (userData?.role === 'aupair' && user) {
        try {
          await notifyParentsOfEventChange(
            familyId,
            {
              ...event,
              id: event.id || `${event.type}-${event.time}`,
              date: date,
              time: formData.time,
              childName: event.children?.[0]?.child.name || ''
            },
            NOTIFICATION_TYPES.EVENT_UPDATED,
            user
          );
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      }
      
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
      
      // Send notification to parents if au pair cancelled the event
      if (userData?.role === 'aupair' && user) {
        try {
          await notifyParentsOfEventChange(
            familyId,
            {
              ...event,
              id: event.id || `${event.type}-${event.time}`,
              date: date,
              time: event.time,
              childName: event.children?.[0]?.child.name || ''
            },
            NOTIFICATION_TYPES.EVENT_CANCELLED,
            user
          );
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      }
      
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

                  {/* Required Items section - only show for activity events */}
                  {(event.type === 'activity' || event.type === 'recurring_activity') && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Required Items</label>
                      <div style={styles.requiredItemsContainer}>
                        {formData.requiredItems.length > 0 && (
                          <div style={styles.requiredItemsList}>
                            {formData.requiredItems.map((item, index) => (
                              <div key={index} style={styles.requiredItem}>
                                <span style={styles.requiredItemText}>{item}</span>
                                <button
                                  type="button"
                                  style={styles.removeItemButton}
                                  onClick={() => handleRemoveRequiredItem(index)}
                                  title="Remove item"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={styles.addItemRow}>
                          <input
                            type="text"
                            value={newRequiredItem}
                            onChange={(e) => setNewRequiredItem(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddRequiredItem();
                              }
                            }}
                            style={styles.addItemInput}
                            placeholder="Add an item (e.g., water bottle, snacks)"
                          />
                          <button
                            type="button"
                            style={styles.addItemButton}
                            onClick={handleAddRequiredItem}
                            disabled={!newRequiredItem.trim()}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
    padding: '16px'
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    boxShadow: 'var(--md-sys-elevation-level5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px',
    color: 'var(--md-sys-color-on-surface-variant)',
    borderRadius: 'var(--md-sys-shape-corner-small)'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px'
  },
  eventInfo: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    padding: '12px',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    marginBottom: '16px'
  },
  eventDate: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '4px'
  },
  childrenNames: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)'
  },
  input: {
    padding: '12px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '16px',
    outline: 'none',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  textarea: {
    padding: '12px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '16px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  responsibilityOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px'
  },
  responsibilityButton: {
    padding: '12px',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '500'
  },
  responsibilityButtonActive: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: '1px solid var(--md-sys-color-primary)'
  },
  notice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '12px',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    borderRadius: 'var(--md-sys-shape-corner-medium)'
  },
  noticeIcon: {
    fontSize: '16px'
  },
  noticeText: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-primary-container)'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderTop: '1px solid var(--md-sys-color-outline-variant)'
  },
  footerRight: {
    display: 'flex',
    gap: '12px'
  },
  cancelEventButton: {
    padding: '8px 16px',
    border: '1px solid var(--md-sys-color-error)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-error)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  saveButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  requiredItemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  requiredItemsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  requiredItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    padding: '6px 12px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontSize: '14px'
  },
  requiredItemText: {
    color: 'var(--md-sys-color-on-primary-container)'
  },
  removeItemButton: {
    background: 'none',
    border: 'none',
    color: 'var(--md-sys-color-on-primary-container)',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
    opacity: 0.7,
    transition: 'opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  addItemRow: {
    display: 'flex',
    gap: '8px'
  },
  addItemInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '14px',
    outline: 'none',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  addItemButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-secondary)',
    color: 'var(--md-sys-color-on-secondary)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  }
};

export default EditEventModal;