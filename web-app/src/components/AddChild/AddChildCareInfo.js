import { useState } from 'react';
import { COMMON_ALLERGIES, COMMON_MEDICATIONS, filterSuggestions } from '../../utils/dashboardStates';

function AddChildCareInfo({ childData, onNext, onBack, onSkip }) {
  const [formData, setFormData] = useState({
    allergies: childData.allergies || [],
    medications: childData.medications || [],
    emergencyContacts: childData.emergencyContacts || [],
    carePreferences: childData.carePreferences || {
      napTimes: [],
      bedtime: null,
      mealPreferences: []
    }
  });

  const [inputStates, setInputStates] = useState({
    allergyInput: '',
    medicationInput: '',
    quickNotes: ''
  });

  const [suggestions, setSuggestions] = useState({
    allergies: [],
    medications: []
  });

  const handleInputChange = (field, value) => {
    setInputStates(prev => ({ ...prev, [field]: value }));
    
    // Update suggestions based on input
    if (field === 'allergyInput') {
      setSuggestions(prev => ({
        ...prev,
        allergies: filterSuggestions(value, COMMON_ALLERGIES)
      }));
    } else if (field === 'medicationInput') {
      setSuggestions(prev => ({
        ...prev,
        medications: filterSuggestions(value, COMMON_MEDICATIONS)
      }));
    }
  };

  const addItem = (type, value) => {
    if (!value.trim()) return;
    
    const newItem = {
      id: Date.now().toString(),
      name: value.trim(),
      ...(type === 'allergies' ? { severity: 'mild' } : {}),
      ...(type === 'medications' ? { dosage: '', frequency: 'as needed' } : {})
    };

    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], newItem]
    }));

    // Clear input and suggestions
    const inputField = type === 'allergies' ? 'allergyInput' : 'medicationInput';
    setInputStates(prev => ({ ...prev, [inputField]: '' }));
    setSuggestions(prev => ({ ...prev, [type]: [] }));
  };

  const removeItem = (type, id) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  const addSuggestion = (type, suggestion) => {
    addItem(type, suggestion);
  };

  const handleKeyPress = (e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputField = type === 'allergies' ? 'allergyInput' : 'medicationInput';
      addItem(type, inputStates[inputField]);
    }
  };

  const handleSave = () => {
    const completeData = {
      ...formData,
      carePreferences: {
        ...formData.carePreferences,
        quickNotes: inputStates.quickNotes
      }
    };
    console.log('Saving child care data:', completeData);
    onNext(completeData);
  };

  const handleSkipStep = () => {
    onSkip(formData);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          ←
        </button>
        <h1 style={styles.title}>Care Information</h1>
        <div style={styles.placeholder}></div>
      </div>

      <div style={styles.content}>
        <div style={styles.iconSection}>
          <div style={styles.careIcon}>🏥</div>
          <h2 style={styles.subtitle}>Important Care Details</h2>
          <p style={styles.infoText}>
            ℹ️ Sharing these details helps your au pair provide the best, safest care for your child.
          </p>
        </div>

        <div style={styles.formSection}>
          {/* Allergies Section */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Allergies</label>
            <div style={styles.inputContainer}>
              <input
                type="text"
                style={styles.input}
                value={inputStates.allergyInput}
                onChange={(e) => handleInputChange('allergyInput', e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'allergies')}
                placeholder="Type to add allergy..."
              />
              <button 
                style={styles.addButton}
                onClick={() => addItem('allergies', inputStates.allergyInput)}
              >
                + Add allergy
              </button>
            </div>
            
            {suggestions.allergies.length > 0 && (
              <div style={styles.suggestionsContainer}>
                {suggestions.allergies.map(suggestion => (
                  <button
                    key={suggestion}
                    style={styles.suggestionButton}
                    onClick={() => addSuggestion('allergies', suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div style={styles.itemsList}>
              {formData.allergies.map(allergy => (
                <div key={allergy.id} style={styles.itemTag}>
                  <span>• {allergy.name}</span>
                  <button 
                    style={styles.removeButton}
                    onClick={() => removeItem('allergies', allergy.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Medications Section */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Medications</label>
            <div style={styles.inputContainer}>
              <input
                type="text"
                style={styles.input}
                value={inputStates.medicationInput}
                onChange={(e) => handleInputChange('medicationInput', e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'medications')}
                placeholder="Type to add medication..."
              />
              <button 
                style={styles.addButton}
                onClick={() => addItem('medications', inputStates.medicationInput)}
              >
                + Add medication
              </button>
            </div>
            
            {suggestions.medications.length > 0 && (
              <div style={styles.suggestionsContainer}>
                {suggestions.medications.map(suggestion => (
                  <button
                    key={suggestion}
                    style={styles.suggestionButton}
                    onClick={() => addSuggestion('medications', suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div style={styles.itemsList}>
              {formData.medications.map(medication => (
                <div key={medication.id} style={styles.itemTag}>
                  <span>• {medication.name}</span>
                  <button 
                    style={styles.removeButton}
                    onClick={() => removeItem('medications', medication.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contacts Section */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Emergency Contact</label>
            <div style={styles.contactContainer}>
              {formData.emergencyContacts.length === 0 ? (
                <div style={styles.contactPlaceholder}>
                  <div style={styles.contactItem}>
                    <span>• Parent (Auto-added)</span>
                    <span style={styles.contactPhone}>Will use your number</span>
                  </div>
                  <button style={styles.addContactButton}>+ Add doctor/contact</button>
                </div>
              ) : (
                <>
                  {formData.emergencyContacts.map(contact => (
                    <div key={contact.id} style={styles.contactItem}>
                      <span>• {contact.name} - {contact.relationship}</span>
                      <span style={styles.contactPhone}>{contact.phone}</span>
                      <button 
                        style={styles.removeButton}
                        onClick={() => removeItem('emergencyContacts', contact.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button style={styles.addContactButton}>+ Add contact</button>
                </>
              )}
            </div>
          </div>

          {/* Quick Notes Section */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Quick Notes</label>
            <textarea
              style={styles.textarea}
              value={inputStates.quickNotes}
              onChange={(e) => handleInputChange('quickNotes', e.target.value)}
              placeholder="Loves pasta, dislikes vegetables, needs stuffed animal for nap..."
              rows={3}
            />
          </div>
        </div>
      </div>

      <div style={styles.buttonSection}>
        <button style={styles.skipButton} onClick={handleSkipStep}>
          Skip
        </button>
        <button style={styles.saveButton} onClick={handleSave}>
          Save Child
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#F2F2F7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#007AFF'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: 0
  },
  placeholder: {
    width: '20px'
  },
  content: {
    flex: 1,
    padding: '20px',
    paddingBottom: '100px'
  },
  iconSection: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  careIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },
  infoText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    margin: 0
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#000',
    marginBottom: '8px'
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  input: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none'
  },
  addButton: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  suggestionsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '10px'
  },
  suggestionButton: {
    padding: '6px 12px',
    borderRadius: '16px',
    border: '1px solid #007AFF',
    backgroundColor: 'white',
    color: '#007AFF',
    fontSize: '12px',
    cursor: 'pointer'
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  itemTag: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '14px'
  },
  removeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#FF3B30',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 5px'
  },
  contactContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #E5E5EA'
  },
  contactPlaceholder: {
    padding: '15px'
  },
  contactItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #F0F0F0',
    fontSize: '14px'
  },
  contactPhone: {
    color: '#8E8E93',
    fontSize: '12px'
  },
  addContactButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#007AFF',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '10px 0',
    textAlign: 'left'
  },
  textarea: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none',
    resize: 'vertical',
    minHeight: '60px',
    fontFamily: 'inherit'
  },
  buttonSection: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #E5E5EA',
    display: 'flex',
    gap: '15px'
  },
  skipButton: {
    flex: 1,
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#8E8E93',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  saveButton: {
    flex: 2,
    padding: '15px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default AddChildCareInfo;