import React, { useState, useEffect } from 'react';
import { useFamily } from '../../hooks/useFamily';
import { updateUserPreferences } from '../../utils/userUtils';

const SettingsPage = ({ user, onBack }) => {
  const { userData, loading } = useFamily(user.uid);
  const [editingSection, setEditingSection] = useState(null);
  const [isSaving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userData) {
      setFormData({
        language: userData.preferences?.language || 'en',
        theme: userData.preferences?.theme || 'system',
        notifications: userData.preferences?.notifications !== false,
        defaultView: userData.preferences?.defaultView || 'dashboard'
      });
    }
  }, [userData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const preferences = {
        language: formData.language,
        theme: formData.theme,
        notifications: formData.notifications,
        defaultView: formData.defaultView
      };

      const preferencesResult = await updateUserPreferences(user.uid, preferences);
      if (!preferencesResult.success) {
        throw new Error(preferencesResult.error);
      }

      setEditingSection(null);
      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    if (userData) {
      setFormData({
        language: userData.preferences?.language || 'en',
        theme: userData.preferences?.theme || 'system',
        notifications: userData.preferences?.notifications !== false,
        defaultView: userData.preferences?.defaultView || 'dashboard'
      });
    }
    setEditingSection(null);
    setErrors({});
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton} onClick={onBack || (() => window.history.back())}>
          ←
        </button>
        <h1 style={styles.title}>Settings</h1>
        <div style={{ width: '40px' }} /> {/* Spacer for layout balance */}
      </header>

      {/* Content */}
      <div style={styles.content}>
        {/* Preferences */}
        {(!editingSection || editingSection === 'preferences') && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Preferences</h2>
              {!editingSection && (
                <button
                  style={styles.sectionEditButton}
                  onClick={() => setEditingSection('preferences')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary)';
                    e.currentTarget.style.color = 'var(--md-sys-color-on-primary)';
                    e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                    e.currentTarget.style.color = 'var(--md-sys-color-on-primary-container)';
                    e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                  }}
                >
                  Edit
                </button>
              )}
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Language</label>
              {editingSection === 'preferences' ? (
                <div>
                  <select
                    style={styles.select}
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="de">🇩🇪 German</option>
                  </select>
                  <div style={styles.fieldHelp}>
                    Choose your preferred language for the app interface
                  </div>
                </div>
              ) : (
                <div>
                  <div style={styles.value}>
                    {formData.language === 'de' ? '🇩🇪 German' : '🇺🇸 English'}
                  </div>
                  <div style={styles.fieldHelp}>
                    Choose your preferred language for the app interface
                  </div>
                </div>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Theme</label>
              {editingSection === 'preferences' ? (
                <div>
                  <select
                    style={styles.select}
                    value={formData.theme}
                    onChange={(e) => handleInputChange('theme', e.target.value)}
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                  <div style={styles.fieldHelp}>
                    Choose between light, dark, or automatic based on system settings
                  </div>
                </div>
              ) : (
                <div>
                  <div style={styles.value}>
                    {formData.theme ? formData.theme.charAt(0).toUpperCase() + formData.theme.slice(1) : 'System'}
                  </div>
                  <div style={styles.fieldHelp}>
                    Choose between light, dark, or automatic based on system settings
                  </div>
                </div>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Push Notifications</label>
              {editingSection === 'preferences' ? (
                <div>
                  <label style={styles.switchContainer}>
                    <input
                      type="checkbox"
                      checked={formData.notifications}
                      onChange={(e) => handleInputChange('notifications', e.target.checked)}
                      style={styles.hiddenInput}
                    />
                    <span style={{
                      ...styles.switch,
                      ...(formData.notifications ? styles.switchOn : {})
                    }}>
                      <span style={{
                        ...styles.switchHandle,
                        ...(formData.notifications ? styles.switchHandleOn : {})
                      }} />
                    </span>
                    <span style={styles.switchLabel}>
                      {formData.notifications ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                  <div style={styles.fieldHelp}>
                    Receive notifications for tasks, shopping lists, and family updates
                  </div>
                </div>
              ) : (
                <div>
                  <div style={styles.value}>
                    {formData.notifications ? 'Enabled' : 'Disabled'}
                  </div>
                  <div style={styles.fieldHelp}>
                    Receive notifications for tasks, shopping lists, and family updates
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Action buttons for editing mode */}
        {editingSection && (
          <div style={styles.actions}>
            <button 
              style={styles.cancelButton} 
              onClick={handleCancel}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
                e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-highest)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Cancel
            </button>
            <button 
              style={styles.saveButton} 
              onClick={handleSave}
              disabled={isSaving}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 64px)', // Account for bottom navigation
    backgroundColor: 'var(--md-sys-color-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    paddingBottom: '80px' // Extra padding for bottom navigation
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: 'var(--md-sys-color-on-surface)',
    padding: '8px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  title: {
    fontSize: '22px',
    fontWeight: '400',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    fontFamily: 'var(--md-sys-typescale-headline-small-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-headline-small-line-height)'
  },
  content: {
    padding: '24px',
    maxWidth: '720px',
    margin: '0 auto'
  },
  section: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    paddingBottom: '12px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    fontFamily: 'var(--md-sys-typescale-title-medium-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-title-medium-line-height)',
    letterSpacing: 'var(--md-sys-typescale-title-medium-letter-spacing)'
  },
  sectionEditButton: {
    backgroundColor: 'var(--md-sys-color-primary-container)',
    border: '1px solid var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary-container)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  field: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginBottom: '8px',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-label-small-line-height)',
    letterSpacing: 'var(--md-sys-typescale-label-small-letter-spacing)'
  },
  value: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface)',
    padding: '8px 0',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-body-large-line-height)'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    backgroundColor: 'var(--md-sys-color-surface)',
    boxSizing: 'border-box',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    cursor: 'pointer',
    transition: 'border-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    outline: 'none'
  },
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '12px'
  },
  switch: {
    width: '52px',
    height: '32px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: '16px',
    position: 'relative',
    transition: 'background-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    border: '2px solid var(--md-sys-color-outline)'
  },
  switchOn: {
    backgroundColor: 'var(--md-sys-color-primary)',
    borderColor: 'var(--md-sys-color-primary)'
  },
  switchHandle: {
    width: '28px',
    height: '28px',
    backgroundColor: 'var(--md-sys-color-on-primary)',
    borderRadius: '14px',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  switchHandleOn: {
    transform: 'translateX(20px)',
    backgroundColor: 'var(--md-sys-color-on-primary)'
  },
  switchLabel: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    userSelect: 'none'
  },
  fieldHelp: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '8px',
    lineHeight: '1.4',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  hiddenInput: {
    display: 'none'
  },
  actions: {
    marginTop: '24px',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '100px'
  },
  saveButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '8px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    opacity: 1
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  }
};

export default SettingsPage;