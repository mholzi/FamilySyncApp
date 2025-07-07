import React, { useState, useEffect } from 'react';
import { 
  ACTIVITY_TEMPLATES, 
  ACTIVITY_CATEGORIES, 
  RECURRENCE_TYPES, 
  DAY_NAMES, 
  COMMON_TIME_SLOTS,
  createDefaultActivity,
  validateActivityData,
  formatRecurrenceDescription
} from '../../utils/recurringActivityTemplates';

const RecurringActivityBuilder = ({ 
  children = [], 
  onSave, 
  onCancel, 
  editingActivity = null 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [activity, setActivity] = useState(() => 
    editingActivity || createDefaultActivity()
  );
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load activity data if editing
  useEffect(() => {
    if (editingActivity) {
      setActivity(editingActivity);
      setCurrentStep(2); // Skip template selection when editing
    }
  }, [editingActivity]);

  const updateActivity = (updates) => {
    setActivity(prev => ({ ...prev, ...updates }));
    // Clear validation errors when user makes changes
    setValidationErrors([]);
  };

  const updateNestedField = (path, value) => {
    setActivity(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
    setValidationErrors([]);
  };

  const handleTemplateSelect = (templateKey) => {
    const template = ACTIVITY_TEMPLATES[templateKey];
    const newActivity = createDefaultActivity(template);
    setActivity(newActivity);
    setSelectedTemplate(templateKey);
    setCurrentStep(2);
  };

  const handleSave = async () => {
    const validation = validateActivityData(activity);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    try {
      // Calculate arrival time based on arrival buffer
      const template = selectedTemplate ? ACTIVITY_TEMPLATES[selectedTemplate] : null;
      const arrivalBuffer = template?.arrivalBuffer || 15;
      const [hours, minutes] = activity.time.split(':').map(Number);
      const arrivalTime = new Date();
      arrivalTime.setHours(hours, minutes - arrivalBuffer, 0, 0);
      
      const finalActivity = {
        ...activity,
        arrivalTime: arrivalTime.toTimeString().slice(0, 5),
        id: editingActivity?.id || `activity_${Date.now()}`,
        createdAt: editingActivity?.createdAt || new Date(),
        updatedAt: new Date()
      };

      await onSave(finalActivity);
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Failed to save activity. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <div style={styles.stepIndicator}>
      {[1, 2, 3, 4].map(step => (
        <div 
          key={step}
          style={{
            ...styles.stepDot,
            ...(step === currentStep ? styles.stepDotActive : {}),
            ...(step < currentStep ? styles.stepDotCompleted : {})
          }}
        >
          {step < currentStep ? '✓' : step}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Choose Activity Type</h2>
      <p style={styles.stepDescription}>
        Select a template to get started quickly, or create a custom activity.
      </p>
      
      <div style={styles.templateGrid}>
        {Object.entries(ACTIVITY_TEMPLATES).map(([key, template]) => (
          <button
            key={key}
            style={styles.templateCard}
            onClick={() => handleTemplateSelect(key)}
          >
            <div style={styles.templateIcon}>{template.icon}</div>
            <div style={styles.templateName}>{template.name}</div>
            <div style={styles.templateCategory}>
              {ACTIVITY_CATEGORIES[template.category]?.label}
            </div>
          </button>
        ))}
        
        <button
          style={styles.customTemplateCard}
          onClick={() => {
            setActivity(createDefaultActivity());
            setSelectedTemplate(null);
            setCurrentStep(2);
          }}
        >
          <div style={styles.templateIcon}>➕</div>
          <div style={styles.templateName}>Custom Activity</div>
          <div style={styles.templateCategory}>Create from scratch</div>
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Activity Details</h2>
      
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Activity Name *</label>
          <input
            type="text"
            value={activity.name}
            onChange={(e) => updateActivity({ name: e.target.value })}
            style={styles.input}
            placeholder="e.g., Soccer Practice"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Category</label>
          <select
            value={activity.category}
            onChange={(e) => updateActivity({ category: e.target.value })}
            style={styles.select}
          >
            {Object.entries(ACTIVITY_CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>
                {category.icon} {category.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Start Time *</label>
            <input
              type="time"
              value={activity.time}
              onChange={(e) => updateActivity({ time: e.target.value })}
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Duration (minutes) *</label>
            <input
              type="number"
              value={activity.duration}
              onChange={(e) => updateActivity({ duration: parseInt(e.target.value) })}
              style={styles.input}
              min="15"
              step="15"
              placeholder="60"
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Assigned Children</label>
          <div style={styles.checkboxGrid}>
            {children.map(child => (
              <label key={child.id} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={activity.assignedChildren.includes(child.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateActivity({
                        assignedChildren: [...activity.assignedChildren, child.id]
                      });
                    } else {
                      updateActivity({
                        assignedChildren: activity.assignedChildren.filter(id => id !== child.id)
                      });
                    }
                  }}
                  style={styles.checkbox}
                />
                <span>{child.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Location & Contact</h2>
      
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Location Name</label>
          <input
            type="text"
            value={activity.location.name}
            onChange={(e) => updateNestedField('location.name', e.target.value)}
            style={styles.input}
            placeholder="e.g., City Sports Center"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Address *</label>
          <textarea
            value={activity.location.address}
            onChange={(e) => updateNestedField('location.address', e.target.value)}
            style={styles.textarea}
            placeholder="Street address, city, postal code"
            rows="3"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Location Notes</label>
          <input
            type="text"
            value={activity.location.notes}
            onChange={(e) => updateNestedField('location.notes', e.target.value)}
            style={styles.input}
            placeholder="e.g., Use side entrance, meet at field 2"
          />
        </div>

        <h3 style={styles.sectionTitle}>Contact Person</h3>
        
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Contact Name</label>
            <input
              type="text"
              value={activity.contact.name}
              onChange={(e) => updateNestedField('contact.name', e.target.value)}
              style={styles.input}
              placeholder="e.g., Coach Miller"
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <input
              type="text"
              value={activity.contact.role}
              onChange={(e) => updateNestedField('contact.role', e.target.value)}
              style={styles.input}
              placeholder="e.g., Coach, Teacher"
            />
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Phone</label>
            <input
              type="tel"
              value={activity.contact.phone}
              onChange={(e) => updateNestedField('contact.phone', e.target.value)}
              style={styles.input}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={activity.contact.email}
              onChange={(e) => updateNestedField('contact.email', e.target.value)}
              style={styles.input}
              placeholder="coach@example.com"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Schedule & Requirements</h2>
      
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Recurrence Pattern *</label>
          <select
            value={activity.recurrence.type}
            onChange={(e) => updateNestedField('recurrence.type', e.target.value)}
            style={styles.select}
          >
            {Object.entries(RECURRENCE_TYPES).map(([key, type]) => (
              <option key={key} value={key}>
                {type.label} - {type.description}
              </option>
            ))}
          </select>
        </div>

        {(activity.recurrence.type === 'weekly' || activity.recurrence.type === 'biweekly') && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Days of the Week *</label>
            <div style={styles.daySelector}>
              {Object.entries(DAY_NAMES).map(([day, info]) => (
                <button
                  key={day}
                  type="button"
                  style={{
                    ...styles.dayButton,
                    ...(activity.recurrence.days.includes(day) ? styles.dayButtonActive : {})
                  }}
                  onClick={() => {
                    const days = activity.recurrence.days.includes(day)
                      ? activity.recurrence.days.filter(d => d !== day)
                      : [...activity.recurrence.days, day];
                    updateNestedField('recurrence.days', days);
                  }}
                >
                  {info.short}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Items to Bring</label>
          <div style={styles.itemsList}>
            {activity.requirements.items.map((item, index) => (
              <div key={index} style={styles.itemRow}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const items = [...activity.requirements.items];
                    items[index] = e.target.value;
                    updateNestedField('requirements.items', items);
                  }}
                  style={styles.itemInput}
                  placeholder="e.g., Water bottle"
                />
                <button
                  type="button"
                  onClick={() => {
                    const items = activity.requirements.items.filter((_, i) => i !== index);
                    updateNestedField('requirements.items', items);
                  }}
                  style={styles.removeButton}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                updateNestedField('requirements.items', [...activity.requirements.items, '']);
              }}
              style={styles.addButton}
            >
              + Add Item
            </button>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Additional Notes</label>
          <textarea
            value={activity.requirements.notes}
            onChange={(e) => updateNestedField('requirements.notes', e.target.value)}
            style={styles.textarea}
            placeholder="Any special instructions or preparation needed"
            rows="4"
          />
        </div>

        <div style={styles.summaryCard}>
          <h3 style={styles.summaryTitle}>Activity Summary</h3>
          <div style={styles.summaryItem}>
            <strong>{activity.name}</strong> 
            {activity.assignedChildren.length > 0 && (
              <span style={styles.summaryDetail}>
                for {activity.assignedChildren.map(id => 
                  children.find(child => child.id === id)?.name
                ).filter(Boolean).join(', ')}
              </span>
            )}
          </div>
          <div style={styles.summaryItem}>
            📍 {activity.location.address}
          </div>
          <div style={styles.summaryItem}>
            🕐 {activity.time} ({activity.duration} minutes)
          </div>
          <div style={styles.summaryItem}>
            🔄 {formatRecurrenceDescription(activity.recurrence)}
          </div>
          {activity.requirements.items.length > 0 && (
            <div style={styles.summaryItem}>
              🎒 Bring: {activity.requirements.items.filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          {editingActivity ? 'Edit Activity' : 'Create Recurring Activity'}
        </h1>
        {renderStepIndicator()}
      </div>

      <div style={styles.content}>
        {!editingActivity && currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {validationErrors.length > 0 && (
          <div style={styles.errorContainer}>
            <h3 style={styles.errorTitle}>Please fix the following errors:</h3>
            <ul style={styles.errorList}>
              {validationErrors.map((error, index) => (
                <li key={index} style={styles.errorItem}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button
          onClick={onCancel}
          style={styles.cancelButton}
          disabled={isSaving}
        >
          Cancel
        </button>
        
        <div style={styles.navigationButtons}>
          {currentStep > 1 && !editingActivity && (
            <button
              onClick={prevStep}
              style={styles.prevButton}
              disabled={isSaving}
            >
              Previous
            </button>
          )}
          
          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              style={styles.nextButton}
              disabled={isSaving}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSave}
              style={styles.saveButton}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : editingActivity ? 'Update Activity' : 'Create Activity'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    boxShadow: 'var(--shadow-lg)',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    marginBottom: 'var(--space-6)',
    textAlign: 'center'
  },
  title: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-4) 0'
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-2)'
  },
  stepDot: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--gray-200)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    transition: 'var(--transition-normal)'
  },
  stepDotActive: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)'
  },
  stepDotCompleted: {
    backgroundColor: 'var(--secondary-green)',
    color: 'var(--white)'
  },
  content: {
    flex: 1
  },
  stepContent: {
    minHeight: '400px'
  },
  stepTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-2) 0'
  },
  stepDescription: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    margin: '0 0 var(--space-6) 0'
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 'var(--space-4)'
  },
  templateCard: {
    backgroundColor: 'var(--white)',
    border: '2px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-normal)',
    ':hover': {
      borderColor: 'var(--primary-purple)',
      transform: 'translateY(-2px)'
    }
  },
  customTemplateCard: {
    backgroundColor: '#f8f9fa',
    border: '2px dashed var(--border-medium)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-normal)'
  },
  templateIcon: {
    fontSize: 'var(--font-size-4xl)',
    marginBottom: 'var(--space-2)'
  },
  templateName: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-1)'
  },
  templateCategory: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-4)'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  input: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    transition: 'var(--transition-fast)',
    ':focus': {
      outline: 'none',
      borderColor: 'var(--primary-purple)',
      boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.1)'
    }
  },
  select: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    backgroundColor: 'var(--white)',
    cursor: 'pointer'
  },
  textarea: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 'var(--space-2)'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px'
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 'var(--space-4) 0 var(--space-3) 0',
    borderTop: '1px solid var(--border-light)',
    paddingTop: 'var(--space-4)'
  },
  daySelector: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap'
  },
  dayButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    transition: 'var(--transition-fast)'
  },
  dayButtonActive: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    borderColor: 'var(--primary-purple)'
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)'
  },
  itemRow: {
    display: 'flex',
    gap: 'var(--space-2)',
    alignItems: 'center'
  },
  itemInput: {
    flex: 1,
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)'
  },
  removeButton: {
    padding: 'var(--space-1) var(--space-2)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--red-500)',
    color: 'var(--white)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-xs)'
  },
  addButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px dashed var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'transparent',
    color: 'var(--primary-purple)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)'
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    marginTop: 'var(--space-4)'
  },
  summaryTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-3) 0'
  },
  summaryItem: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-2)',
    lineHeight: 'var(--line-height-relaxed)'
  },
  summaryDetail: {
    color: 'var(--text-tertiary)',
    fontSize: 'var(--font-size-xs)'
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    marginTop: 'var(--space-4)'
  },
  errorTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: '#dc2626',
    margin: '0 0 var(--space-2) 0'
  },
  errorList: {
    margin: 0,
    paddingLeft: 'var(--space-4)'
  },
  errorItem: {
    color: '#dc2626',
    fontSize: 'var(--font-size-sm)',
    marginBottom: 'var(--space-1)'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'var(--space-6)',
    paddingTop: 'var(--space-4)',
    borderTop: '1px solid var(--border-light)'
  },
  navigationButtons: {
    display: 'flex',
    gap: 'var(--space-3)'
  },
  cancelButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)'
  },
  prevButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid var(--primary-purple)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--primary-purple)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)'
  },
  nextButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)'
  },
  saveButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--secondary-green)',
    color: 'var(--white)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)'
  }
};

export default RecurringActivityBuilder;