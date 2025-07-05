import { useState } from 'react';
import { ACTIVITY_CATEGORIES } from '../../utils/routineTemplates';

function ActivityRegistration({ initialActivities = [], onSave, onCancel }) {
  const [activities, setActivities] = useState(initialActivities);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'sports',
    schedule: {
      type: 'weekly',
      days: [],
      startTime: '16:00',
      duration: 60
    },
    location: {
      name: '',
      address: '',
      travelTime: 15
    },
    requirements: {
      equipment: [],
      preparation: []
    }
  });

  const [inputStates, setInputStates] = useState({
    equipmentInput: '',
    preparationInput: ''
  });

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const handleDayToggle = (day) => {
    const currentDays = formData.schedule.days;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    setFormData({
      ...formData,
      schedule: { ...formData.schedule, days: newDays }
    });
  };

  const handleAddItem = (type, value) => {
    if (!value.trim()) return;
    
    const field = type === 'equipment' ? 'equipment' : 'preparation';
    setFormData({
      ...formData,
      requirements: {
        ...formData.requirements,
        [field]: [...formData.requirements[field], value.trim()]
      }
    });
    
    setInputStates({
      ...inputStates,
      [`${type}Input`]: ''
    });
  };

  const handleRemoveItem = (type, index) => {
    const field = type === 'equipment' ? 'equipment' : 'preparation';
    setFormData({
      ...formData,
      requirements: {
        ...formData.requirements,
        [field]: formData.requirements[field].filter((_, i) => i !== index)
      }
    });
  };

  const handleSaveActivity = () => {
    const newActivity = {
      ...formData,
      id: editingActivity?.id || Date.now().toString()
    };
    
    if (editingActivity) {
      setActivities(activities.map(a => a.id === editingActivity.id ? newActivity : a));
    } else {
      setActivities([...activities, newActivity]);
    }
    
    // Reset form
    setFormData({
      name: '',
      category: 'sports',
      schedule: {
        type: 'weekly',
        days: [],
        startTime: '16:00',
        duration: 60
      },
      location: {
        name: '',
        address: '',
        travelTime: 15
      },
      requirements: {
        equipment: [],
        preparation: []
      }
    });
    setIsAddingActivity(false);
    setEditingActivity(null);
  };

  const handleEditActivity = (activity) => {
    setFormData(activity);
    setEditingActivity(activity);
    setIsAddingActivity(true);
  };

  const handleDeleteActivity = (activityId) => {
    setActivities(activities.filter(a => a.id !== activityId));
  };

  const handleSave = () => {
    onSave({ weeklyActivities: activities });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Weekly Activities</h2>
        <p style={styles.subtitle}>
          Add recurring activities like school, sports, music lessons, and playdates
        </p>
      </div>

      <div style={styles.activitiesList}>
        {activities.map((activity) => {
          const categoryInfo = ACTIVITY_CATEGORIES[activity.category];
          return (
            <div key={activity.id} style={styles.activityCard}>
              <div style={styles.activityHeader}>
                <div style={styles.activityInfo}>
                  <div style={styles.activityIcon} style={{ color: categoryInfo?.color }}>
                    {categoryInfo?.icon}
                  </div>
                  <div>
                    <h4 style={styles.activityName}>{activity.name}</h4>
                    <p style={styles.activitySchedule}>
                      {activity.schedule.days.map(d => d.substring(0, 3).toUpperCase()).join(', ')} • {activity.schedule.startTime} • {activity.schedule.duration} min
                    </p>
                  </div>
                </div>
                <div style={styles.activityActions}>
                  <button
                    style={styles.editButton}
                    onClick={() => handleEditActivity(activity)}
                  >
                    Edit
                  </button>
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDeleteActivity(activity.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {activity.location.name && (
                <div style={styles.activityDetail}>
                  📍 {activity.location.name} • {activity.location.travelTime} min travel
                </div>
              )}
              
              {activity.requirements.equipment.length > 0 && (
                <div style={styles.activityDetail}>
                  🎒 Equipment: {activity.requirements.equipment.join(', ')}
                </div>
              )}
            </div>
          );
        })}

        {activities.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📅</div>
            <p style={styles.emptyText}>No activities added yet</p>
            <p style={styles.emptySubtext}>Add recurring activities to build your weekly schedule</p>
          </div>
        )}

        <button
          style={styles.addActivityButton}
          onClick={() => setIsAddingActivity(true)}
        >
          + Add Activity
        </button>
      </div>

      {/* Add/Edit Activity Modal */}
      {isAddingActivity && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              {editingActivity ? 'Edit Activity' : 'Add New Activity'}
            </h3>

            <div style={styles.formSection}>
              <label style={styles.label}>Activity Name</label>
              <input
                type="text"
                style={styles.input}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Soccer Practice, Piano Lessons"
              />
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>Category</label>
              <select
                style={styles.select}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {Object.entries(ACTIVITY_CATEGORIES).map(([key, category]) => (
                  <option key={key} value={key}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>Days of the Week</label>
              <div style={styles.daysGrid}>
                {weekDays.map((day) => (
                  <button
                    key={day}
                    style={{
                      ...styles.dayButton,
                      ...(formData.schedule.days.includes(day) ? styles.dayButtonActive : {})
                    }}
                    onClick={() => handleDayToggle(day)}
                  >
                    {day.substring(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formSection}>
                <label style={styles.label}>Start Time</label>
                <input
                  type="time"
                  style={styles.input}
                  value={formData.schedule.startTime}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, startTime: e.target.value }
                  })}
                />
              </div>
              <div style={styles.formSection}>
                <label style={styles.label}>Duration (minutes)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.schedule.duration}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, duration: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>Location Name</label>
              <input
                type="text"
                style={styles.input}
                value={formData.location.name}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, name: e.target.value }
                })}
                placeholder="e.g., Community Center"
              />
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>Travel Time (minutes)</label>
              <input
                type="number"
                style={styles.input}
                value={formData.location.travelTime}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, travelTime: parseInt(e.target.value) || 0 }
                })}
              />
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>Equipment Needed</label>
              <div style={styles.itemInput}>
                <input
                  type="text"
                  style={styles.input}
                  value={inputStates.equipmentInput}
                  onChange={(e) => setInputStates({ ...inputStates, equipmentInput: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddItem('equipment', inputStates.equipmentInput);
                    }
                  }}
                  placeholder="e.g., cleats, water bottle"
                />
                <button
                  style={styles.addItemButton}
                  onClick={() => handleAddItem('equipment', inputStates.equipmentInput)}
                >
                  Add
                </button>
              </div>
              <div style={styles.itemsList}>
                {formData.requirements.equipment.map((item, index) => (
                  <span key={index} style={styles.itemTag}>
                    {item}
                    <button
                      style={styles.removeItemButton}
                      onClick={() => handleRemoveItem('equipment', index)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setIsAddingActivity(false);
                  setEditingActivity(null);
                }}
              >
                Cancel
              </button>
              <button
                style={styles.saveButton}
                onClick={handleSaveActivity}
                disabled={!formData.name || formData.schedule.days.length === 0}
              >
                {editingActivity ? 'Update Activity' : 'Add Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.actions}>
        <button style={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <button style={styles.saveButton} onClick={handleSave}>
          Save Activities
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#F2F2F7'
  },
  header: {
    padding: '20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #E5E5EA',
    textAlign: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  activitiesList: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto'
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  activityInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  activityIcon: {
    fontSize: '24px',
    marginTop: '2px'
  },
  activityName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 4px 0'
  },
  activitySchedule: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  activityActions: {
    display: 'flex',
    gap: '8px'
  },
  editButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #007AFF',
    backgroundColor: 'white',
    color: '#007AFF',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  deleteButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #FF3B30',
    backgroundColor: 'white',
    color: '#FF3B30',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  activityDetail: {
    fontSize: '13px',
    color: '#666',
    marginTop: '4px',
    paddingLeft: '36px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  addActivityButton: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '2px dashed #007AFF',
    backgroundColor: 'white',
    color: '#007AFF',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '12px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 24px 0'
  },
  formSection: {
    marginBottom: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
    display: 'block'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none'
  },
  select: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none'
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px'
  },
  dayButton: {
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  dayButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    color: 'white'
  },
  itemInput: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  addItemButton: {
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
  itemsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  itemTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '16px',
    backgroundColor: '#E5E5EA',
    fontSize: '14px',
    color: '#333'
  },
  removeItemButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#666',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 2px'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    justifyContent: 'flex-end'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #E5E5EA'
  },
  cancelButton: {
    flex: 1,
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  saveButton: {
    flex: 2,
    padding: '16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default ActivityRegistration;