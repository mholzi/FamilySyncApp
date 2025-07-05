import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Upload a photo file to Firebase Storage with progress tracking
 * @param {File} file - The image file to upload
 * @param {string} childId - Unique identifier for the child
 * @param {string} familyId - Family ID for organization
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} - Download URL of the uploaded image
 */
export const uploadChildPhotoWithProgress = async (file, childId, familyId, onProgress = () => {}) => {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${childId}_${timestamp}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `families/${familyId}/children/${fileName}`);
    
    // Start the upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Track upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({
            stage: 'uploading',
            progress: progress,
            message: `Uploading photo... ${Math.round(progress)}%`
          });
        },
        (error) => {
          console.error('Upload error:', error);
          reject(new Error('Failed to upload photo. Please try again.'));
        },
        async () => {
          try {
            // Upload completed successfully
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress({
              stage: 'complete',
              progress: 100,
              message: 'Photo uploaded successfully!'
            });
            resolve(downloadURL);
          } catch (error) {
            reject(new Error('Failed to get photo download URL.'));
          }
        }
      );
    });
    
  } catch (error) {
    console.error('Error setting up photo upload:', error);
    throw new Error('Failed to start photo upload.');
  }
};

/**
 * Optimized image resizing with Web Workers (fallback to main thread)
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} maxHeight - Maximum height in pixels
 * @param {number} quality - Image quality (0-1)
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<File>} - Resized image file
 */
export const resizeImageOptimized = (file, maxWidth = 800, maxHeight = 800, quality = 0.8, onProgress = () => {}) => {
  return new Promise((resolve, reject) => {
    onProgress({
      stage: 'processing',
      progress: 0,
      message: 'Processing image...'
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const handleImageLoad = () => {
      try {
        onProgress({
          stage: 'processing',
          progress: 25,
          message: 'Calculating image size...'
        });

        // Calculate new dimensions
        let { width, height } = img;
        
        // Check if resizing is needed
        if (width <= maxWidth && height <= maxHeight) {
          // No resizing needed, return original file
          onProgress({
            stage: 'processing',
            progress: 100,
            message: 'Image optimized!'
          });
          resolve(file);
          return;
        }
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        onProgress({
          stage: 'processing',
          progress: 50,
          message: 'Resizing image...'
        });
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);
        
        onProgress({
          stage: 'processing',
          progress: 75,
          message: 'Optimizing image quality...'
        });
        
        // Convert to blob with timeout
        const conversionTimeout = setTimeout(() => {
          reject(new Error('Image processing timeout. Please try a smaller image.'));
        }, 10000); // 10 second timeout
        
        canvas.toBlob(
          (blob) => {
            clearTimeout(conversionTimeout);
            if (!blob) {
              reject(new Error('Failed to process image. Please try a different image.'));
              return;
            }
            
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            
            onProgress({
              stage: 'processing',
              progress: 100,
              message: 'Image processed successfully!'
            });
            
            resolve(resizedFile);
          },
          file.type,
          quality
        );
      } catch (error) {
        reject(new Error('Failed to process image: ' + error.message));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image. Please try a different image.'));
    };
    
    // Add timeout for image loading
    const loadTimeout = setTimeout(() => {
      reject(new Error('Image loading timeout. Please try again.'));
    }, 5000);
    
    img.onload = () => {
      clearTimeout(loadTimeout);
      handleImageLoad();
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Validate image file with detailed feedback
 * @param {File} file - The file to validate
 * @returns {boolean} - Whether the file is valid
 */
export const validateImageFileDetailed = (file) => {
  // Check if file exists
  if (!file) {
    throw new Error('No file selected.');
  }
  
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Please select a valid image file (JPEG, PNG, or WebP).');
  }
  
  // Check file size (max 10MB, but we'll warn at 5MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  const warnSize = 5 * 1024 * 1024; // 5MB in bytes
  
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 10MB.');
  }
  
  if (file.size > warnSize) {
    console.warn('Large image detected. Processing may take longer.');
  }
  
  return true;
};

/**
 * Complete photo processing and upload pipeline
 * @param {File} file - The original image file
 * @param {string} childId - Child identifier
 * @param {string} familyId - Family identifier
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} - Download URL
 */
export const processAndUploadPhoto = async (file, childId, familyId, onProgress = () => {}) => {
  try {
    // Check if file exists first
    if (!file || !(file instanceof File) || file.size === 0) {
      throw new Error('No valid file provided for upload.');
    }
    
    // Validate the file
    validateImageFileDetailed(file);
    
    onProgress({
      stage: 'validation',
      progress: 0,
      message: 'Validating image...'
    });
    
    // Process the image
    const processedFile = await resizeImageOptimized(
      file, 
      800, 
      800, 
      0.8, 
      (progress) => {
        onProgress({
          ...progress,
          progress: progress.progress * 0.4 // First 40% for processing
        });
      }
    );
    
    // Upload the processed image
    const downloadURL = await uploadChildPhotoWithProgress(
      processedFile,
      childId,
      familyId,
      (progress) => {
        onProgress({
          ...progress,
          progress: 40 + (progress.progress * 0.6) // Last 60% for upload
        });
      }
    );
    
    return downloadURL;
    
  } catch (error) {
    onProgress({
      stage: 'error',
      progress: 0,
      message: error.message
    });
    throw error;
  }
};