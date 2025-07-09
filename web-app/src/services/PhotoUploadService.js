import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Unified Photo Upload Service
 * Consolidates all photo upload functionality with consistent validation, resizing, and error handling
 */

// Configuration constants
const CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  warnFileSize: 5 * 1024 * 1024, // 5MB
  supportedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  defaultQuality: 0.8,
  maxDimensions: {
    child: { width: 800, height: 800 },
    shopping: { width: 800, height: 600 },
    receipt: { width: 1200, height: 1600 }
  },
  timeout: 30000 // 30 seconds
};

// Storage path generators
const STORAGE_PATHS = {
  child: (familyId, childId) => `children/${familyId}/${childId}/profile.jpg`,
  receipt: (familyId, listId, filename) => `shopping/${familyId}/receipts/${listId}/${filename}`,
  product: (familyId, itemKey, filename) => `shopping/${familyId}/products/${itemKey}/${filename}`
};

/**
 * Validate image file with detailed error messages
 */
export function validateImageFile(file) {
  const errors = [];

  if (!file) {
    errors.push('No file selected');
    return { isValid: false, errors };
  }

  // Check file type
  if (!CONFIG.supportedTypes.includes(file.type)) {
    errors.push(`Unsupported file type: ${file.type}. Please use JPEG, PNG, or WebP.`);
  }

  // Check file size
  if (file.size > CONFIG.maxFileSize) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed: ${CONFIG.maxFileSize / 1024 / 1024}MB`);
  }

  // Warning for large files
  const warnings = [];
  if (file.size > CONFIG.warnFileSize && file.size <= CONFIG.maxFileSize) {
    warnings.push(`Large file detected: ${(file.size / 1024 / 1024).toFixed(1)}MB. Consider compressing for faster upload.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Resize image with specified dimensions and quality
 */
export function resizeImage(file, maxWidth, maxHeight, quality = CONFIG.defaultQuality) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Image processing timeout'));
    }, CONFIG.timeout);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        clearTimeout(timeout);

        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        const aspectRatio = width / height;

        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }

        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload photo with progress tracking
 */
export function uploadPhotoWithProgress(file, storagePath, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress({
            progress,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            state: snapshot.state
          });
        }
      },
      (error) => {
        console.error('Upload error:', error);
        reject(new Error(`Upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: storagePath,
            filename: file.name,
            size: file.size,
            type: file.type
          });
        } catch (error) {
          reject(new Error(`Failed to get download URL: ${error.message}`));
        }
      }
    );
  });
}

/**
 * Delete photo from storage
 */
export async function deletePhoto(storagePath) {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    throw new Error(`Failed to delete photo: ${error.message}`);
  }
}

/**
 * Child Photo Upload - Complete pipeline
 */
export async function uploadChildPhoto(file, familyId, childId, onProgress) {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  try {
    // Update progress
    if (onProgress) onProgress({ stage: 'validating', progress: 10 });

    // Resize image
    if (onProgress) onProgress({ stage: 'processing', progress: 20 });
    
    const { width, height } = CONFIG.maxDimensions.child;
    const resizedFile = await resizeImage(file, width, height);

    // Upload with progress
    if (onProgress) onProgress({ stage: 'uploading', progress: 30 });
    
    const storagePath = STORAGE_PATHS.child(familyId, childId);
    
    return await uploadPhotoWithProgress(resizedFile, storagePath, (uploadProgress) => {
      if (onProgress) {
        onProgress({
          stage: 'uploading',
          progress: 30 + (uploadProgress.progress * 0.7) // 30% to 100%
        });
      }
    });
  } catch (error) {
    console.error('Child photo upload error:', error);
    throw error;
  }
}

/**
 * Receipt Photo Upload
 */
export async function uploadReceiptPhoto(file, familyId, listId, onProgress) {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  try {
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `receipt_${timestamp}.jpg`;

    if (onProgress) onProgress({ stage: 'processing', progress: 20 });

    // Resize for receipts (higher resolution)
    const { width, height } = CONFIG.maxDimensions.receipt;
    const resizedFile = await resizeImage(file, width, height, 0.9);

    if (onProgress) onProgress({ stage: 'uploading', progress: 30 });

    const storagePath = STORAGE_PATHS.receipt(familyId, listId, filename);
    
    return await uploadPhotoWithProgress(resizedFile, storagePath, (uploadProgress) => {
      if (onProgress) {
        onProgress({
          stage: 'uploading',
          progress: 30 + (uploadProgress.progress * 0.7)
        });
      }
    });
  } catch (error) {
    console.error('Receipt photo upload error:', error);
    throw error;
  }
}

/**
 * Product Photo Upload
 */
export async function uploadProductPhoto(file, familyId, itemKey, onProgress) {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `product_${timestamp}.jpg`;

    if (onProgress) onProgress({ stage: 'processing', progress: 20 });

    const { width, height } = CONFIG.maxDimensions.shopping;
    const resizedFile = await resizeImage(file, width, height);

    if (onProgress) onProgress({ stage: 'uploading', progress: 30 });

    const storagePath = STORAGE_PATHS.product(familyId, itemKey, filename);
    
    return await uploadPhotoWithProgress(resizedFile, storagePath, (uploadProgress) => {
      if (onProgress) {
        onProgress({
          stage: 'uploading',
          progress: 30 + (uploadProgress.progress * 0.7)
        });
      }
    });
  } catch (error) {
    console.error('Product photo upload error:', error);
    throw error;
  }
}

/**
 * Generic photo processing and upload
 */
export async function processAndUploadPhoto(file, storagePath, maxWidth = 800, maxHeight = 800, onProgress) {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  try {
    if (onProgress) onProgress({ stage: 'processing', progress: 20 });

    const resizedFile = await resizeImage(file, maxWidth, maxHeight);

    if (onProgress) onProgress({ stage: 'uploading', progress: 30 });

    return await uploadPhotoWithProgress(resizedFile, storagePath, (uploadProgress) => {
      if (onProgress) {
        onProgress({
          stage: 'uploading',
          progress: 30 + (uploadProgress.progress * 0.7)
        });
      }
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    throw error;
  }
}

// Export configuration for external use
export { CONFIG };