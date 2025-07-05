import { useState, useEffect } from 'react';

function PreparationChecklist({ event, childData, onComplete, onClose }) {
  const [checkedItems, setCheckedItems] = useState({});
  const [notes, setNotes] = useState('');
  const [travelReminder, setTravelReminder] = useState(null);

  useEffect(() => {
    // Calculate departure time based on travel time
    if (event.metadata?.travelTime) {
      const eventStart = parseTime(event.startTime);
      const departureTime = addMinutes(eventStart, -event.metadata.travelTime);
      setTravelReminder(formatTime(departureTime));
    }
  }, [event]);

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const addMinutes = (date, minutes) => {
    return new Date(date.getTime() + minutes * 60000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleItemCheck = (item, checked) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: checked
    }));
  };

  const getDefaultChecklist = () => {
    const items = [];
    
    // Add metadata-based items
    if (event.metadata?.preparation) {
      items.push(...event.metadata.preparation);
    }
    
    if (event.metadata?.equipment) {
      items.push(...event.metadata.equipment);
    }

    // Add type-specific items
    switch (event.type) {
      case 'school':
        items.push('Backpack', 'Lunch box', 'Water bottle', 'Homework', 'School supplies');
        break;
      case 'activity':
        if (event.metadata?.category === 'sports') {
          items.push('Sports clothes', 'Water bottle', 'Towel', 'Athletic shoes');
        } else if (event.metadata?.category === 'arts') {
          items.push('Art supplies', 'Apron', 'Clean clothes');
        }
        break;
      case 'meal':
        items.push('High chair/booster', 'Bib', 'Utensils', 'Napkins');
        break;
      default:
        items.push('Water bottle', 'Snacks', 'Comfort item');
    }

    // Add age-specific items
    const age = calculateAge(childData.dateOfBirth);
    if (age < 3) {
      items.push('Diapers', 'Wipes', 'Change of clothes', 'Pacifier');
    } else if (age < 6) {
      items.push('Extra underwear', 'Small toy', 'Tissues');
    }

    // Add weather-specific items (simplified)
    items.push('Weather-appropriate clothing', 'Jacket/sweater');

    return [...new Set(items)]; // Remove duplicates
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 5; // Default age
    const birthDate = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
    return Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const getCompletionPercentage = () => {
    const totalItems = checklistItems.length;
    const checkedCount = Object.values(checkedItems).filter(Boolean).length;
    return totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  };

  const handleComplete = () => {
    const completionData = {
      eventId: event.id,
      checkedItems,
      notes,
      completedAt: new Date().toISOString(),
      completionPercentage: getCompletionPercentage()
    };
    
    if (onComplete) {
      onComplete(completionData);
    }
  };

  const checklistItems = getDefaultChecklist();
  const completionPercentage = getCompletionPercentage();
  const isFullyPrepared = completionPercentage === 100;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.eventInfo}>
            <h3 style={styles.eventTitle}>{event.title}</h3>
            <div style={styles.eventDetails}>
              {event.startTime} - {event.endTime}
              {event.location && (
                <span style={styles.location}> • {event.location.name}</span>
              )}
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Travel Reminder */}
        {travelReminder && (
          <div style={styles.travelReminder}>
            <div style={styles.travelIcon}>🚗</div>
            <div style={styles.travelInfo}>
              <div style={styles.travelText}>Leave by {travelReminder}</div>
              <div style={styles.travelSubtext}>
                {event.metadata.travelTime} minutes travel time
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div style={styles.progressSection}>
          <div style={styles.progressLabel}>
            Preparation Progress: {completionPercentage}%
          </div>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${completionPercentage}%`,
                backgroundColor: isFullyPrepared ? '#4CAF50' : '#2196F3'
              }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div style={styles.checklistSection}>
          <h4 style={styles.checklistTitle}>📋 Preparation Checklist</h4>
          <div style={styles.checklist}>
            {checklistItems.map((item, index) => (
              <label key={index} style={styles.checklistItem}>
                <input
                  type="checkbox"
                  checked={checkedItems[item] || false}
                  onChange={(e) => handleItemCheck(item, e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={{
                  ...styles.checklistText,
                  ...(checkedItems[item] ? styles.checkedText : {})
                }}>
                  {item}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        {event.metadata?.contact && (
          <div style={styles.contactSection}>
            <h4 style={styles.contactTitle}>📞 Contact Information</h4>
            <div style={styles.contactInfo}>
              {event.metadata.contact.name && (
                <div style={styles.contactItem}>
                  <strong>Contact:</strong> {event.metadata.contact.name}
                </div>
              )}
              {event.metadata.contact.phone && (
                <div style={styles.contactItem}>
                  <strong>Phone:</strong> 
                  <a href={`tel:${event.metadata.contact.phone}`} style={styles.phoneLink}>
                    {event.metadata.contact.phone}
                  </a>
                </div>
              )}
              {event.metadata.contact.email && (
                <div style={styles.contactItem}>
                  <strong>Email:</strong> 
                  <a href={`mailto:${event.metadata.contact.email}`} style={styles.emailLink}>
                    {event.metadata.contact.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div style={styles.notesSection}>
          <h4 style={styles.notesTitle}>📝 Additional Notes</h4>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any special instructions or reminders..."
            style={styles.notesInput}
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button 
            style={{
              ...styles.completeButton,
              ...(isFullyPrepared ? styles.completeButtonReady : {})
            }}
            onClick={handleComplete}
          >
            {isFullyPrepared ? '✓ All Set!' : `Complete (${completionPercentage}%)`}
          </button>
        </div>

        {/* Quick Tips */}
        <div style={styles.tipsSection}>
          <div style={styles.tipsTitle}>💡 Quick Tips</div>
          <div style={styles.tips}>
            {event.type === 'school' && (
              <div style={styles.tip}>Check weather forecast for appropriate clothing</div>
            )}
            {event.metadata?.travelTime > 20 && (
              <div style={styles.tip}>Long travel time - consider bringing entertainment</div>
            )}
            {calculateAge(childData.dateOfBirth) < 4 && (
              <div style={styles.tip}>Bring comfort items for young children</div>
            )}
            <div style={styles.tip}>Double-check pickup time and location</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  
  container: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  
  eventInfo: {
    flex: 1
  },
  
  eventTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0'
  },
  
  eventDetails: {
    fontSize: '14px',
    color: '#666'
  },
  
  location: {
    color: '#007AFF'
  },
  
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  travelReminder: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#E3F2FD',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  
  travelIcon: {
    fontSize: '20px'
  },
  
  travelInfo: {
    flex: 1
  },
  
  travelText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1976D2'
  },
  
  travelSubtext: {
    fontSize: '12px',
    color: '#1565C0'
  },
  
  progressSection: {
    marginBottom: '20px'
  },
  
  progressLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '8px'
  },
  
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#E5E5EA',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: '4px'
  },
  
  checklistSection: {
    marginBottom: '20px'
  },
  
  checklistTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 12px 0'
  },
  
  checklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    transition: 'background-color 0.2s'
  },
  
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  
  checklistText: {
    fontSize: '14px',
    color: '#333',
    transition: 'all 0.2s'
  },
  
  checkedText: {
    textDecoration: 'line-through',
    color: '#666',
    opacity: 0.7
  },
  
  contactSection: {
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px'
  },
  
  contactTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0'
  },
  
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  
  contactItem: {
    fontSize: '13px',
    color: '#333'
  },
  
  phoneLink: {
    color: '#007AFF',
    textDecoration: 'none',
    marginLeft: '8px'
  },
  
  emailLink: {
    color: '#007AFF',
    textDecoration: 'none',
    marginLeft: '8px'
  },
  
  notesSection: {
    marginBottom: '20px'
  },
  
  notesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0'
  },
  
  notesInput: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none'
  },
  
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px'
  },
  
  cancelButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  completeButton: {
    flex: 2,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  
  completeButtonReady: {
    backgroundColor: '#4CAF50'
  },
  
  tipsSection: {
    padding: '12px',
    backgroundColor: '#FFF8E1',
    borderRadius: '8px'
  },
  
  tipsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: '8px'
  },
  
  tips: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  
  tip: {
    fontSize: '12px',
    color: '#F57F17',
    lineHeight: '1.4'
  }
};

export default PreparationChecklist;