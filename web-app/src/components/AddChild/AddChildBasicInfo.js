import { useState, useRef, useEffect } from 'react';

function AddChildBasicInfo({ initialData, existingChildren = [], onNext, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    dateOfBirth: initialData.dateOfBirth || '',
    phoneNumber: initialData.phoneNumber || '',
    profilePictureUrl: initialData.profilePictureUrl || null
  });
  
  const fileInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    const age = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));
    return age;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Clear duplicate warning when user changes input
    if (duplicateWarning) {
      setDuplicateWarning(null);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Basic validation
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          alert('Please select a valid image file (JPEG, PNG, or WebP).');
          return;
        }
        
        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
          alert('Image size must be less than 5MB.');
          return;
        }
        
        // Create a preview URL for the selected image
        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, profilePictureUrl: previewUrl, photoFile: file }));
        
        console.log('Photo selected:', file.name, 'Size:', Math.round(file.size / 1024), 'KB');
      } catch (error) {
        console.error('Error handling photo:', error);
        alert('Error selecting photo. Please try again.');
      }
    }
  };

  const checkForDuplicates = () => {
    if (!formData.name.trim() || !formData.dateOfBirth) {
      return null;
    }

    const childName = formData.name.trim().toLowerCase();
    const childBirthDate = new Date(formData.dateOfBirth).toDateString();

    // Find exact matches (same name and birth date)
    const exactMatch = existingChildren.find(child => {
      const existingName = child.name.toLowerCase();
      const existingBirthDate = child.dateOfBirth ? 
        (child.dateOfBirth.toDate ? child.dateOfBirth.toDate() : new Date(child.dateOfBirth)).toDateString() : 
        null;
      
      return existingName === childName && existingBirthDate === childBirthDate;
    });

    if (exactMatch) {
      return {
        type: 'exact',
        message: `A child named "${exactMatch.name}" with the same birth date already exists.`,
        child: exactMatch
      };
    }

    // Find similar matches (same name, different birth date)
    const nameMatch = existingChildren.find(child => 
      child.name.toLowerCase() === childName
    );

    if (nameMatch) {
      const existingAge = nameMatch.dateOfBirth ? 
        Math.floor((new Date() - (nameMatch.dateOfBirth.toDate ? nameMatch.dateOfBirth.toDate() : new Date(nameMatch.dateOfBirth))) / (365.25 * 24 * 60 * 60 * 1000)) : 
        'unknown';
      
      return {
        type: 'similar',
        message: `A child named "${nameMatch.name}" (age ${existingAge}) already exists. Is this the same child?`,
        child: nameMatch
      };
    }

    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Child\'s name is required';
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      // Check for duplicates
      const duplicateCheck = checkForDuplicates();
      
      if (duplicateCheck && duplicateCheck.type === 'exact') {
        setDuplicateWarning(duplicateCheck);
        return; // Block continuation for exact duplicates
      }
      
      if (duplicateCheck && duplicateCheck.type === 'similar') {
        setDuplicateWarning(duplicateCheck);
        return; // Show warning but allow user to proceed
      }
      
      const processedData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : null
      };
      console.log('Basic info data:', processedData);
      onNext(processedData);
    }
  };
  
  const handleContinueAnyway = () => {
    // User chose to continue despite duplicate warning
    const processedData = {
      ...formData,
      dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : null
    };
    console.log('Basic info data (forced):', processedData);
    onNext(processedData);
  };

  const handleSkip = () => {
    // Save partial data before skipping
    const processedData = {
      ...formData,
      dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : null
    };
    console.log('Skipping with data:', processedData);
    onNext(processedData);
  };

  // Check for duplicates on form changes
  useEffect(() => {
    if (formData.name && formData.dateOfBirth && existingChildren.length > 0) {
      const duplicateCheck = checkForDuplicates();
      if (duplicateCheck && duplicateCheck.type === 'similar') {
        setDuplicateWarning(duplicateCheck);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name, formData.dateOfBirth, existingChildren]);

  const age = calculateAge(formData.dateOfBirth);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onCancel}>
          ←
        </button>
        <h1 style={styles.title}>Add Child</h1>
        <div style={styles.placeholder}></div>
      </div>

      <div style={styles.content}>
        <div style={styles.iconSection}>
          <div style={styles.childIcon}>👶</div>
          <h2 style={styles.subtitle}>Tell us about your child</h2>
        </div>

        <div style={styles.photoSection}>
          <div style={styles.photoPlaceholder} onClick={handlePhotoClick}>
            {formData.profilePictureUrl ? (
              <img 
                src={formData.profilePictureUrl} 
                alt="Child preview" 
                style={styles.photoPreview}
              />
            ) : (
              <>
                <div style={styles.photoIcon}>📷</div>
                <span style={styles.photoText}>Add Photo</span>
                <span style={styles.photoSubtext}>Tap to add photo</span>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={styles.hiddenInput}
            onChange={handlePhotoChange}
          />
        </div>

        <div style={styles.formSection}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Child's Name</label>
            <input
              type="text"
              style={{
                ...styles.input,
                ...(errors.name ? styles.inputError : {})
              }}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Emma"
            />
            {errors.name && <span style={styles.errorText}>{errors.name}</span>}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Date of Birth</label>
            <input
              type="date"
              style={{
                ...styles.input,
                ...(errors.dateOfBirth ? styles.inputError : {})
              }}
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            />
            {age !== null && (
              <div style={styles.ageDisplay}>Age: {age} years old</div>
            )}
            {errors.dateOfBirth && <span style={styles.errorText}>{errors.dateOfBirth}</span>}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Phone Number (Optional)</label>
            <input
              type="tel"
              style={styles.input}
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="+49 176 12345678"
            />
            <div style={styles.helpText}>
              For direct communication with older children, or emergency when au pair is out
            </div>
          </div>

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div style={{
              ...styles.warningCard,
              ...(duplicateWarning.type === 'exact' ? styles.errorCard : {})
            }}>
              <div style={styles.warningIcon}>
                {duplicateWarning.type === 'exact' ? '🚫' : '⚠️'}
              </div>
              <div style={styles.warningContent}>
                <div style={styles.warningText}>{duplicateWarning.message}</div>
                {duplicateWarning.type === 'exact' ? (
                  <div style={styles.warningActions}>
                    <button 
                      style={styles.warningButtonSecondary}
                      onClick={() => setDuplicateWarning(null)}
                    >
                      Edit Details
                    </button>
                  </div>
                ) : (
                  <div style={styles.warningActions}>
                    <button 
                      style={styles.warningButtonSecondary}
                      onClick={() => setDuplicateWarning(null)}
                    >
                      Edit Details
                    </button>
                    <button 
                      style={styles.warningButtonPrimary}
                      onClick={handleContinueAnyway}
                    >
                      Continue Anyway
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.buttonSection}>
        <button style={styles.skipButton} onClick={handleSkip}>
          Skip
        </button>
        <button 
          style={{
            ...styles.continueButton,
            ...(formData.name && formData.dateOfBirth && (!duplicateWarning || duplicateWarning.type !== 'exact') ? {} : styles.continueButtonDisabled)
          }}
          onClick={handleContinue}
          disabled={!formData.name || !formData.dateOfBirth || (duplicateWarning && duplicateWarning.type === 'exact')}
        >
          Continue
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
  childIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: 0
  },
  photoSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '40px'
  },
  photoPlaceholder: {
    width: '100px',
    height: '100px',
    borderRadius: '50px',
    border: '2px dashed #C7C7CC',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: 'white',
    position: 'relative',
    overflow: 'hidden'
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: '50px',
    objectFit: 'cover'
  },
  hiddenInput: {
    display: 'none'
  },
  photoIcon: {
    fontSize: '24px',
    marginBottom: '5px'
  },
  photoText: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#007AFF'
  },
  photoSubtext: {
    fontSize: '10px',
    color: '#8E8E93'
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
  input: {
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  inputError: {
    borderColor: '#FF3B30'
  },
  ageDisplay: {
    fontSize: '14px',
    color: '#34C759',
    marginTop: '5px',
    fontWeight: '500'
  },
  helpText: {
    fontSize: '12px',
    color: '#8E8E93',
    marginTop: '5px',
    lineHeight: '1.4'
  },
  errorText: {
    fontSize: '12px',
    color: '#FF3B30',
    marginTop: '5px'
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
  continueButton: {
    flex: 2,
    padding: '15px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  continueButtonDisabled: {
    backgroundColor: '#C7C7CC',
    cursor: 'not-allowed'
  },

  // Warning Card Styles
  warningCard: {
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFEAA7',
    borderRadius: '8px',
    padding: '15px',
    display: 'flex',
    gap: '12px',
    marginTop: '15px'
  },
  errorCard: {
    backgroundColor: '#F8D7DA',
    border: '1px solid #F5C6CB'
  },
  warningIcon: {
    fontSize: '20px',
    flexShrink: 0
  },
  warningContent: {
    flex: 1
  },
  warningText: {
    fontSize: '14px',
    color: '#856404',
    marginBottom: '10px',
    lineHeight: '1.4'
  },
  warningActions: {
    display: 'flex',
    gap: '10px'
  },
  warningButtonPrimary: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  warningButtonSecondary: {
    backgroundColor: 'transparent',
    color: '#856404',
    border: '1px solid #856404',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

export default AddChildBasicInfo;