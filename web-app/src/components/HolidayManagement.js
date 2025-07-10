import React, { useState, useEffect } from 'react';

const HolidayManagement = ({ childId, holidays = [], onSave }) => {
  const [holidayList, setHolidayList] = useState(holidays);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    startDate: '',
    endDate: '',
    type: 'school'
  });

  // Common German school holidays
  const holidayTemplates = [
    { name: 'Summer Holidays', duration: '6 weeks' },
    { name: 'Christmas Holidays', duration: '2 weeks' },
    { name: 'Easter Holidays', duration: '2 weeks' },
    { name: 'Autumn Holidays', duration: '1 week' },
    { name: 'Winter Holidays', duration: '1 week' },
    { name: 'Whitsun Holidays', duration: '1 week' }
  ];

  const addHoliday = () => {
    if (!newHoliday.name || !newHoliday.startDate || !newHoliday.endDate) {
      return;
    }

    const holiday = {
      id: `holiday-${Date.now()}`,
      ...newHoliday,
      childId
    };

    const updatedHolidays = [...holidayList, holiday];
    setHolidayList(updatedHolidays);
    onSave(updatedHolidays);
    
    setNewHoliday({
      name: '',
      startDate: '',
      endDate: '',
      type: 'school'
    });
    setShowAddForm(false);
  };

  const removeHoliday = (holidayId) => {
    const updatedHolidays = holidayList.filter(h => h.id !== holidayId);
    setHolidayList(updatedHolidays);
    onSave(updatedHolidays);
  };

  const useTemplate = (template) => {
    setNewHoliday({
      ...newHoliday,
      name: template.name
    });
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options = { month: 'short', day: 'numeric' };
    
    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}, ${start.getFullYear()}`;
      } else {
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${start.getFullYear()}`;
      }
    } else {
      return `${start.toLocaleDateString('en-US', options)}, ${start.getFullYear()} - ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
    }
  };

  const getDayCount = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>School Holidays</h3>
        <p style={styles.subtitle}>
          Add school holidays to automatically hide school events during these periods
        </p>
      </div>

      {/* Existing Holidays */}
      {holidayList.length > 0 && (
        <div style={styles.holidaysList}>
          {holidayList.map(holiday => (
            <div key={holiday.id} style={styles.holidayCard}>
              <div style={styles.holidayInfo}>
                <div style={styles.holidayName}>{holiday.name}</div>
                <div style={styles.holidayDate}>
                  {formatDateRange(holiday.startDate, holiday.endDate)}
                </div>
                <div style={styles.holidayDuration}>
                  {getDayCount(holiday.startDate, holiday.endDate)} days
                </div>
              </div>
              <button 
                style={styles.removeButton}
                onClick={() => removeHoliday(holiday.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Holiday Button */}
      {!showAddForm && (
        <button 
          style={styles.addButton}
          onClick={() => setShowAddForm(true)}
        >
          + Add Holiday
        </button>
      )}

      {/* Add Holiday Form */}
      {showAddForm && (
        <div style={styles.addForm}>
          <div style={styles.formHeader}>
            <h4 style={styles.formTitle}>Add School Holiday</h4>
            <button 
              style={styles.cancelButton}
              onClick={() => setShowAddForm(false)}
            >
              ×
            </button>
          </div>

          {/* Holiday Templates */}
          <div style={styles.templatesSection}>
            <div style={styles.templatesLabel}>Quick Templates:</div>
            <div style={styles.templatesList}>
              {holidayTemplates.map((template, index) => (
                <button
                  key={index}
                  style={styles.templateButton}
                  onClick={() => useTemplate(template)}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div style={styles.formFields}>
            <div style={styles.field}>
              <label style={styles.label}>Holiday Name</label>
              <input
                type="text"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                placeholder="e.g., Summer Holidays 2025"
                style={styles.input}
              />
            </div>

            <div style={styles.dateFields}>
              <div style={styles.field}>
                <label style={styles.label}>Start Date</label>
                <input
                  type="date"
                  value={newHoliday.startDate}
                  onChange={(e) => setNewHoliday({ ...newHoliday, startDate: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>End Date</label>
                <input
                  type="date"
                  value={newHoliday.endDate}
                  onChange={(e) => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Type</label>
              <select
                value={newHoliday.type}
                onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value })}
                style={styles.select}
              >
                <option value="school">School Holiday</option>
                <option value="public">Public Holiday</option>
                <option value="family">Family Holiday</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div style={styles.formActions}>
            <button 
              style={styles.cancelFormButton}
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
            <button 
              style={styles.saveButton}
              onClick={addHoliday}
              disabled={!newHoliday.name || !newHoliday.startDate || !newHoliday.endDate}
            >
              Add Holiday
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {holidayList.length === 0 && !showAddForm && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🏖️</div>
          <p style={styles.emptyText}>No holidays added yet</p>
          <p style={styles.emptySubtext}>
            Add school holidays to automatically hide school events during these periods
          </p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
    border: '1px solid var(--border-light)'
  },
  header: {
    marginBottom: 'var(--space-4)'
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-2) 0'
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 'var(--line-height-normal)'
  },
  holidaysList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-4)'
  },
  holidayCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--gray-50)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)'
  },
  holidayInfo: {
    flex: 1
  },
  holidayName: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-1)'
  },
  holidayDate: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-1)'
  },
  holidayDuration: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic'
  },
  removeButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-xl)',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: 'var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)'
  },
  addButton: {
    width: '100%',
    padding: 'var(--space-3)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  addForm: {
    backgroundColor: 'var(--gray-50)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    border: '1px solid var(--border-light)'
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-4)'
  },
  formTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0
  },
  cancelButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-xl)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 'var(--space-1)'
  },
  templatesSection: {
    marginBottom: 'var(--space-4)'
  },
  templatesLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-2)'
  },
  templatesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)'
  },
  templateButton: {
    padding: 'var(--space-2) var(--space-3)',
    backgroundColor: 'var(--white)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  formFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-4)'
  },
  dateFields: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-3)'
  },
  field: {
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
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    backgroundColor: 'var(--white)',
    transition: 'var(--transition-fast)'
  },
  select: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    backgroundColor: 'var(--white)',
    cursor: 'pointer'
  },
  formActions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end'
  },
  cancelFormButton: {
    padding: 'var(--space-2) var(--space-4)',
    border: '1px solid var(--border-medium)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  saveButton: {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-6)'
  },
  emptyIcon: {
    fontSize: 'var(--font-size-4xl)',
    marginBottom: 'var(--space-3)'
  },
  emptyText: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-2)',
    margin: '0 0 var(--space-2) 0'
  },
  emptySubtext: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-tertiary)',
    margin: 0,
    lineHeight: 'var(--line-height-normal)'
  }
};

export default HolidayManagement;