import { useState, useRef, useEffect } from 'react';
import { storage, auth, db } from '../../firebase';
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
// import { processAndUploadPhoto } from '../../utils/optimizedPhotoUpload';

function AddChildBasicInfo({ initialData, existingChildren = [], onNext, onCancel, onDelete = null, isEditing = false, onSaveStatusChange }) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    dateOfBirth: initialData.dateOfBirth || '',
    phoneNumber: initialData.phoneNumber || '',
    profilePictureUrl: initialData.profilePictureUrl || null,
    photoFile: null,
    scheduleType: initialData.scheduleType || 'kindergarten'
  });
  
  const fileInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTask, setUploadTask] = useState(null);
  const [uploadFileSize, setUploadFileSize] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  
  // Save state management - handled globally in parent component

  // Update form data when initialData changes (for editing mode)
  useEffect(() => {
    if (initialData && (initialData.name || initialData.dateOfBirth || initialData.phoneNumber || initialData.profilePictureUrl || initialData.scheduleType)) {
      console.log('Updating form data with initial data:', initialData);
      setFormData({
        name: initialData.name || '',
        dateOfBirth: initialData.dateOfBirth || '',
        phoneNumber: initialData.phoneNumber || '',
        profilePictureUrl: initialData.profilePictureUrl || null,
        photoFile: null,
        scheduleType: initialData.scheduleType || 'kindergarten'
      });
    }
  }, [initialData]);

  // Cleanup preview URL and cancel upload when component unmounts
  useEffect(() => {
    return () => {
      if (formData.profilePictureUrl && formData.profilePictureUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.profilePictureUrl);
      }
      // Cancel any ongoing upload when component unmounts
      if (uploadTask) {
        uploadTask.cancel();
      }
    };
  }, [formData.profilePictureUrl, uploadTask]);

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    const age = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));
    return age;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Auto-save function for immediate persistence
  const saveBasicInfoToDatabase = async (updatedFormData) => {
    if (!auth.currentUser) return;
    
    try {
      if (onSaveStatusChange) onSaveStatusChange('saving');
      
      // Get user's family ID
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!userDoc.exists()) return;
      
      const familyId = userDoc.data().familyId;
      if (!familyId) return;
      
      const dataToSave = {
        name: updatedFormData.name || '',
        dateOfBirth: updatedFormData.dateOfBirth || null,
        // phoneNumber removed - handled in Step 2
        scheduleType: updatedFormData.scheduleType || 'kindergarten',
        profilePictureUrl: updatedFormData.profilePictureUrl || null,
        lastModified: new Date().toISOString()
      };
      
      if (isEditing && initialData?.id) {
        // Update existing child document
        const childRef = doc(db, 'children', initialData.id);
        await updateDoc(childRef, dataToSave);
        console.log('✅ Child basic info updated in database:', initialData.id);
      } else if (initialData?.tempId) {
        // Save to draft document for new children
        const draftRef = doc(db, 'families', familyId, 'childDrafts', initialData.tempId);
        await setDoc(draftRef, dataToSave, { merge: true });
        console.log('✅ Child basic info saved to draft:', initialData.tempId);
      }
      
      if (onSaveStatusChange) onSaveStatusChange('saved');
      
      // Clear status after 2 seconds
      setTimeout(() => {
        if (onSaveStatusChange) onSaveStatusChange(null);
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error saving basic info:', error);
      if (onSaveStatusChange) onSaveStatusChange('error');
      
      // Auto-retry after 2 seconds
      setTimeout(() => {
        saveBasicInfoToDatabase(updatedFormData);
      }, 2000);
    }
  };

  const handleInputChange = (field, value) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Clear duplicate warning when user changes input
    if (duplicateWarning) {
      setDuplicateWarning(null);
    }
    
    // Auto-save to database (debounced)
    if (isEditing || initialData?.tempId) {
      clearTimeout(window.basicInfoSaveTimeout);
      window.basicInfoSaveTimeout = setTimeout(() => {
        saveBasicInfoToDatabase(updatedFormData);
      }, 1000); // 1 second debounce
    }
  };

  const handlePhotoClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const cancelUpload = () => {
    if (uploadTask) {
      uploadTask.cancel();
      setIsUploading(false);
      setUploadProgress(0);
      setUploadTask(null);
      console.log('Upload cancelled by user');
    }
  };

  const uploadPhotoToFirebase = async (file, previewUrl) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadFileSize(file.size);
    setUploadedBytes(0);
    
    console.log('Starting Firebase upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      user: auth.currentUser,
      isAuthenticated: !!auth.currentUser
    });
    
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.error('User not authenticated for upload');
      setIsUploading(false);
      alert('You must be logged in to upload photos. Please refresh and try again.');
      return;
    }
    
    try {
      // Create a unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `child-photos/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(storage, fileName);
      console.log('Storage reference created:', storageRef.fullPath);
      
      // Start upload with progress tracking
      const currentUploadTask = uploadBytesResumable(storageRef, file);
      setUploadTask(currentUploadTask);
      
      console.log('Upload task created, starting upload...');
      
      // Add a small delay to ensure the task is properly set up
      setTimeout(() => {
        console.log('Upload task state:', currentUploadTask.snapshot.state);
        
        // If upload seems stuck after 2 seconds, try fallback method
        setTimeout(() => {
          if (uploadProgress === 0 && isUploading) {
            console.log('Upload seems stuck, trying fallback method...');
            // Don't cancel the current task, but try the fallback
            uploadPhotoFallback(file, fileName, previewUrl);
          }
        }, 2000);
      }, 100);
      
      currentUploadTask.on('state_changed', 
        (snapshot) => {
          // Track upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          setUploadedBytes(snapshot.bytesTransferred);
          
          console.log('Upload progress:', {
            progress: Math.round(progress) + '%',
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            state: snapshot.state,
            taskState: currentUploadTask.snapshot.state
          });
          
          // Log state changes
          if (snapshot.state === 'paused') {
            console.log('Upload is paused');
          } else if (snapshot.state === 'running') {
            console.log('Upload is running');
          }
        },
        (error) => {
          // Handle upload error
          console.error('Upload failed:', {
            code: error.code,
            message: error.message,
            name: error.name,
            stack: error.stack
          });
          setIsUploading(false);
          setUploadProgress(0);
          setUploadTask(null);
          
          // Show user-friendly error message
          let errorMessage = 'Upload failed. Please try again.';
          if (error.code === 'storage/unauthorized') {
            errorMessage = 'Upload failed: Permission denied. You may need to log in again.';
          } else if (error.code === 'storage/canceled') {
            errorMessage = 'Upload was cancelled.';
          } else if (error.code === 'storage/quota-exceeded') {
            errorMessage = 'Storage quota exceeded. Please contact support.';
          } else if (error.code === 'storage/unknown') {
            errorMessage = 'Upload failed due to unknown error. Check your internet connection.';
          }
          
          alert(errorMessage);
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(currentUploadTask.snapshot.ref);
            
            // Clean up the preview URL since we now have the Firebase URL
            if (previewUrl && previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(previewUrl);
            }
            
            // Update form data with the Firebase download URL
            setFormData(prev => ({ 
              ...prev, 
              profilePictureUrl: downloadURL, 
              photoFile: file,
              firebasePhotoPath: fileName // Store the path for potential deletion later
            }));
            
            console.log('Photo uploaded successfully to:', downloadURL);
            
            setTimeout(() => {
              setIsUploading(false);
              setUploadProgress(0);
              setUploadTask(null);
            }, 500); // Small delay to show 100% completion
            
          } catch (error) {
            console.error('Error getting download URL:', error);
            setIsUploading(false);
            setUploadProgress(0);
            setUploadTask(null);
            alert('Upload completed but failed to get photo URL. Please try again.');
          }
        }
      );
      
    } catch (error) {
      console.error('Error starting upload:', error);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadTask(null);
      alert('Failed to start upload. Please check your connection and try again.');
    }
  };

  const uploadPhotoFallback = async (file, fileName, previewUrl) => {
    console.log('Using fallback upload method...');
    
    try {
      // Cancel the existing upload task if it exists
      if (uploadTask) {
        uploadTask.cancel();
        setUploadTask(null);
      }
      
      const storageRef = ref(storage, fileName);
      
      // Simulate progress for fallback method
      setUploadProgress(25);
      setUploadedBytes(file.size * 0.25);
      
      setTimeout(() => {
        setUploadProgress(50);
        setUploadedBytes(file.size * 0.5);
      }, 500);
      
      setTimeout(() => {
        setUploadProgress(75);
        setUploadedBytes(file.size * 0.75);
      }, 1000);
      
      // Use simple upload method
      const snapshot = await uploadBytes(storageRef, file);
      
      setUploadProgress(100);
      setUploadedBytes(file.size);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Clean up the preview URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Update form data with the Firebase download URL
      setFormData(prev => ({ 
        ...prev, 
        profilePictureUrl: downloadURL, 
        photoFile: file,
        firebasePhotoPath: fileName 
      }));
      
      console.log('Fallback upload successful:', downloadURL);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadedBytes(0);
      }, 500);
      
    } catch (error) {
      console.error('Fallback upload failed:', error);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadedBytes(0);
      alert('Upload failed. Please check your internet connection and try again.');
    }
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
        
        // Clean up previous preview URL if it exists
        if (formData.profilePictureUrl && formData.profilePictureUrl.startsWith('blob:')) {
          URL.revokeObjectURL(formData.profilePictureUrl);
        }
        
        // Create a preview URL for immediate display during upload
        const previewUrl = URL.createObjectURL(file);
        
        // Show preview immediately while upload is in progress
        setFormData(prev => ({ ...prev, profilePictureUrl: previewUrl, photoFile: file }));
        
        // Start real Firebase upload process
        uploadPhotoToFirebase(file, previewUrl);
        
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

    // Skip duplicate check when editing existing child
    if (isEditing && initialData?.id) {
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


  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
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
        <h1 style={styles.title}>{isEditing ? 'Edit Child' : 'Add Child'}</h1>
        <div style={styles.headerRight}>
          {/* Save Status handled globally */}
          
          {isEditing && onDelete ? (
            <button style={styles.deleteButton} onClick={handleDeleteClick}>
              🗑️
            </button>
          ) : null}
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.progressIndicator}>
          <div style={styles.progressBar}>
            <div style={styles.progressFill}></div>
          </div>
          <div style={styles.stepText}>Step 1 of 3</div>
        </div>

        <div style={styles.iconSection}>
          <div style={styles.childIcon}>👶</div>
          <h2 style={styles.subtitle}>Tell us about your child</h2>
          <p style={styles.infoText}>Just the basics to get started</p>
        </div>

        <div style={styles.formSection}>
          {/* Photo Section - Inline with form */}
          <div style={styles.photoFormGroup}>
            <label style={styles.label}>Photo <span style={styles.optional}>(optional)</span></label>
            <div style={styles.photoContainer}>
              <div style={styles.photoSmall} onClick={!isUploading ? handlePhotoClick : undefined}>
                {isUploading ? (
                  <div style={styles.uploadingContainer}>
                    <div style={styles.uploadSpinner}></div>
                    <div style={styles.uploadProgressCircle}>
                      <svg style={styles.progressSvg} viewBox="0 0 36 36">
                        <path
                          style={styles.progressTrack}
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          style={{
                            ...styles.progressFillCircle,
                            strokeDasharray: `${uploadProgress}, 100`
                          }}
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div style={styles.uploadProgressText}>{Math.round(uploadProgress)}%</div>
                    </div>
                  </div>
                ) : formData.profilePictureUrl && !formData.profilePictureUrl.startsWith('blob:') ? (
                  <img 
                    src={formData.profilePictureUrl} 
                    alt="Child preview" 
                    style={styles.photoPreviewSmall}
                    onError={(e) => {
                      console.log('Image failed to load:', e.target.src);
                      setFormData(prev => ({ ...prev, profilePictureUrl: null }));
                    }}
                  />
                ) : (
                  <div style={styles.photoPlaceholderSmall}>
                    <span style={styles.photoIconSmall}>📷</span>
                  </div>
                )}
              </div>
              <div style={styles.photoLabelContainer}>
                <span style={styles.photoLabel}>
                  {isUploading 
                    ? `Uploading photo... (${formatFileSize(uploadedBytes)} of ${formatFileSize(uploadFileSize)})` 
                    : formData.profilePictureUrl 
                      ? 'Tap to change' 
                      : 'Tap to add photo'
                  }
                </span>
                {isUploading && (
                  <div style={styles.uploadProgressContainer}>
                    <div style={styles.uploadProgressBar}>
                      <div 
                        style={{
                          ...styles.uploadProgressFill,
                          width: `${uploadProgress}%`
                        }}
                      ></div>
                    </div>
                    <button 
                      style={styles.cancelUploadButton}
                      onClick={cancelUpload}
                      title="Cancel upload"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={styles.hiddenInput}
              onChange={handlePhotoChange}
              disabled={isUploading}
            />
          </div>

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
            <label style={styles.label}>School Type</label>
            <div style={styles.scheduleTypeContainer}>
              <button
                type="button"
                style={{
                  ...styles.scheduleTypeButton,
                  ...(formData.scheduleType === 'kindergarten' ? styles.scheduleTypeButtonActive : {})
                }}
                onClick={() => handleInputChange('scheduleType', 'kindergarten')}
              >
                <div style={styles.scheduleTypeIcon}>🧸</div>
                <div style={styles.scheduleTypeLabel}>Kindergarten</div>
                <div style={styles.scheduleTypeDescription}>Ages 3-6, flexible schedule</div>
              </button>
              <button
                type="button"
                style={{
                  ...styles.scheduleTypeButton,
                  ...(formData.scheduleType === 'school' ? styles.scheduleTypeButtonActive : {})
                }}
                onClick={() => handleInputChange('scheduleType', 'school')}
              >
                <div style={styles.scheduleTypeIcon}>📚</div>
                <div style={styles.scheduleTypeLabel}>School</div>
                <div style={styles.scheduleTypeDescription}>Ages 6+, structured schedule</div>
              </button>
            </div>
            <div style={styles.helpText}>
              This helps us set up the right schedule options for your child
            </div>
          </div>

          {/* Phone number moved to Step 2 (Care Info) - edit mode only */}

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

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div style={styles.deleteConfirmOverlay}>
            <div style={styles.deleteConfirmDialog}>
              <div style={styles.deleteConfirmIcon}>⚠️</div>
              <h3 style={styles.deleteConfirmTitle}>Delete {formData.name || 'Child'}?</h3>
              <p style={styles.deleteConfirmText}>
                This action cannot be undone. All data including routines, schedules, and care logs will be permanently deleted.
              </p>
              <div style={styles.deleteConfirmActions}>
                <button style={styles.deleteConfirmCancel} onClick={handleDeleteCancel}>
                  Cancel
                </button>
                <button style={styles.deleteConfirmDelete} onClick={handleDeleteConfirm}>
                  Delete Child
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.buttonSection}>
        <button 
          style={{
            ...styles.continueButton,
            ...(formData.name && formData.dateOfBirth && (!duplicateWarning || duplicateWarning.type !== 'exact') && !isUploading ? {} : styles.continueButtonDisabled)
          }}
          onClick={handleContinue}
          disabled={!formData.name || !formData.dateOfBirth || (duplicateWarning && duplicateWarning.type === 'exact') || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Continue'}
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
  deleteButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#FF3B30',
    width: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  // Header Right Section
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  
  // Save Status Styles
  saveStatusContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px'
  },
  saveStatusSaving: {
    fontSize: '16px',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  saveStatusSaved: {
    fontSize: '16px',
    color: '#34C759'
  },
  saveStatusError: {
    fontSize: '16px',
    color: '#FF3B30'
  },
  content: {
    flex: 1,
    padding: '20px',
    paddingBottom: '100px',
    overflow: 'hidden'
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
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#E5E5EA',
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
    bottom: '70px', // Add space for bottom navigation
    left: 0,
    right: 0,
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #E5E5EA',
    display: 'flex',
    gap: '15px',
    zIndex: 100 // Ensure it appears above other elements
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
  },

  // Delete Confirmation Dialog
  deleteConfirmOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  deleteConfirmDialog: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '30px',
    textAlign: 'center',
    maxWidth: '320px',
    width: '90%',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
  },
  deleteConfirmIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  deleteConfirmTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 10px 0'
  },
  deleteConfirmText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4',
    margin: '0 0 25px 0'
  },
  deleteConfirmActions: {
    display: 'flex',
    gap: '10px'
  },
  deleteConfirmCancel: {
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
  deleteConfirmDelete: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#FF3B30',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },

  // Progress indicator styles
  progressIndicator: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box'
  },
  
  progressBar: {
    flex: '1 1 auto',
    height: '4px',
    backgroundColor: '#E5E5EA',
    borderRadius: '2px',
    overflow: 'hidden',
    minWidth: '0'
  },
  
  progressFill: {
    width: '33%',
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: '2px'
  },
  
  stepText: {
    flex: '0 0 auto',
    fontSize: '12px',
    color: '#666',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },

  // Updated info text
  infoText: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.4',
    margin: 0
  },

  // Optional label style
  optional: {
    fontSize: '14px',
    fontWeight: '400',
    color: '#666'
  },

  // Small photo styles
  photoFormGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '20px'
  },

  photoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  photoSmall: {
    width: '60px',
    height: '60px',
    borderRadius: '30px',
    border: '2px dashed #C7C7CC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: 'white',
    overflow: 'hidden'
  },

  photoPreviewSmall: {
    width: '100%',
    height: '100%',
    borderRadius: '30px',
    objectFit: 'cover'
  },

  photoPlaceholderSmall: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  },

  photoIconSmall: {
    fontSize: '20px'
  },

  photoLabel: {
    fontSize: '14px',
    color: '#666'
  },

  photoLabelContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1
  },

  // Upload progress styles
  uploadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    position: 'relative'
  },

  uploadSpinner: {
    position: 'absolute',
    width: '40px',
    height: '40px',
    border: '3px solid #E5E5EA',
    borderTop: '3px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  uploadProgressCircle: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  progressSvg: {
    width: '50px',
    height: '50px',
    transform: 'rotate(-90deg)'
  },

  progressTrack: {
    fill: 'none',
    stroke: '#E5E5EA',
    strokeWidth: '3'
  },

  progressFillCircle: {
    fill: 'none',
    stroke: '#007AFF',
    strokeWidth: '3',
    strokeLinecap: 'round',
    transition: 'stroke-dasharray 0.3s ease'
  },

  uploadProgressText: {
    position: 'absolute',
    fontSize: '10px',
    fontWeight: '600',
    color: '#007AFF'
  },

  uploadProgressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%'
  },

  uploadProgressBar: {
    flex: 1,
    height: '4px',
    backgroundColor: '#E5E5EA',
    borderRadius: '2px',
    overflow: 'hidden'
  },

  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: '2px',
    transition: 'width 0.3s ease'
  },

  cancelUploadButton: {
    backgroundColor: '#FF3B30',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    width: '24px',
    height: '24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    flexShrink: 0
  },

  // Schedule Type Selection Styles
  scheduleTypeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  scheduleTypeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '12px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#E5E5EA',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  scheduleTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF'
  },
  scheduleTypeIcon: {
    fontSize: '24px',
    marginBottom: '8px'
  },
  scheduleTypeLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '4px'
  },
  scheduleTypeDescription: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.3'
  }
};

// Add CSS animations for photo upload
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-child-basic-spinner]')) {
    style.setAttribute('data-child-basic-spinner', 'true');
    document.head.appendChild(style);
  }
}

export default AddChildBasicInfo;