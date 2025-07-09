import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { storage } from '../firebase';
import { Timestamp } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';

/**
 * Photo Storage Service for FamilySync
 * Handles photo uploads with compression and auto-expiration
 */
class PhotoStorageService {
  constructor() {
    this.compressionOptions = {
      maxSizeMB: 0.5, // 500KB max
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.8
    };
    
    this.expirationMonths = 2; // Photos expire after 2 months
  }

  /**
   * Compress an image file
   * @param {File} file - Image file to compress
   * @returns {Promise<File>} Compressed image file
   */
  async compressImage(file) {
    try {
      const compressedFile = await imageCompression(file, this.compressionOptions);
      console.log('🗜️ Image compressed:', {
        originalSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        compressedSize: (compressedFile.size / 1024 / 1024).toFixed(2) + 'MB',
        reduction: (((file.size - compressedFile.size) / file.size) * 100).toFixed(1) + '%'
      });
      
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Upload a photo to Firebase Storage
   * @param {File} file - Image file to upload
   * @param {string} familyId - Family identifier
   * @param {string} type - Photo type ('example' or 'completion')
   * @param {string} taskId - Task identifier (optional)
   * @returns {Promise<{url: string, path: string, uploadedAt: Timestamp}>}
   */
  async uploadPhoto(file, familyId, type = 'example', taskId = null) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Compress the image
      const compressedFile = await this.compressImage(file);

      // Generate unique filename
      const timestamp = Date.now();
      const extension = compressedFile.name.split('.').pop() || 'jpg';
      const filename = `${timestamp}_${Math.random().toString(36).substring(2)}.${extension}`;

      // Create storage path
      const folder = type === 'example' ? 'task-examples' : 'task-completions';
      const basePath = `families/${familyId}/photos/${folder}`;
      const fullPath = taskId ? `${basePath}/${taskId}/${filename}` : `${basePath}/${filename}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, fullPath);
      const snapshot = await uploadBytes(storageRef, compressedFile, {
        contentType: compressedFile.type,
        customMetadata: {
          familyId,
          type,
          taskId: taskId || '',
          uploadedAt: timestamp.toString(),
          expiresAt: (timestamp + (this.expirationMonths * 30 * 24 * 60 * 60 * 1000)).toString()
        }
      });

      // Get download URL
      const url = await getDownloadURL(snapshot.ref);

      console.log('📸 Photo uploaded successfully:', {
        path: fullPath,
        size: (compressedFile.size / 1024).toFixed(2) + 'KB',
        type
      });

      return {
        url,
        path: fullPath,
        uploadedAt: Timestamp.now()
      };
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }

  /**
   * Upload multiple photos
   * @param {File[]} files - Array of image files
   * @param {string} familyId - Family identifier
   * @param {string} type - Photo type ('example' or 'completion')
   * @param {string} taskId - Task identifier (optional)
   * @param {Function} onProgress - Progress callback (optional)
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultiplePhotos(files, familyId, type = 'example', taskId = null, onProgress = null) {
    const results = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadPhoto(files[i], familyId, type, taskId);
        results.push(result);
        
        if (onProgress) {
          onProgress({ completed: i + 1, total, current: files[i].name });
        }
      } catch (error) {
        console.error(`Failed to upload ${files[i].name}:`, error);
        results.push({ error: error.message, file: files[i].name });
      }
    }

    return results;
  }

  /**
   * Delete a photo from storage
   * @param {string} photoPath - Full path to photo in storage
   * @returns {Promise<void>}
   */
  async deletePhoto(photoPath) {
    try {
      const storageRef = ref(storage, photoPath);
      await deleteObject(storageRef);
      console.log('🗑️ Photo deleted:', photoPath);
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw new Error(`Failed to delete photo: ${error.message}`);
    }
  }

  /**
   * Delete multiple photos
   * @param {string[]} photoPaths - Array of photo paths
   * @returns {Promise<Array>} Array of deletion results
   */
  async deleteMultiplePhotos(photoPaths) {
    const results = [];
    
    for (const path of photoPaths) {
      try {
        await this.deletePhoto(path);
        results.push({ success: true, path });
      } catch (error) {
        results.push({ success: false, path, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Check for expired photos and return list for deletion
   * @param {string} familyId - Family identifier
   * @returns {Promise<Array>} Array of expired photo paths
   */
  async getExpiredPhotos(familyId) {
    try {
      const now = Date.now();
      const expiredPhotos = [];
      
      // Check task examples folder
      const examplesRef = ref(storage, `families/${familyId}/photos/task-examples`);
      const examplesList = await listAll(examplesRef);
      
      for (const itemRef of examplesList.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const expiresAt = metadata.customMetadata?.expiresAt;
          
          if (expiresAt && parseInt(expiresAt) < now) {
            expiredPhotos.push({
              path: itemRef.fullPath,
              type: 'example',
              expiredAt: new Date(parseInt(expiresAt))
            });
          }
        } catch (error) {
          console.warn('Could not get metadata for:', itemRef.fullPath);
        }
      }
      
      // Check subfolders in task-examples
      for (const folderRef of examplesList.prefixes) {
        const folderList = await listAll(folderRef);
        
        for (const itemRef of folderList.items) {
          try {
            const metadata = await getMetadata(itemRef);
            const expiresAt = metadata.customMetadata?.expiresAt;
            
            if (expiresAt && parseInt(expiresAt) < now) {
              expiredPhotos.push({
                path: itemRef.fullPath,
                type: 'example',
                expiredAt: new Date(parseInt(expiresAt))
              });
            }
          } catch (error) {
            console.warn('Could not get metadata for:', itemRef.fullPath);
          }
        }
      }
      
      console.log(`🕐 Found ${expiredPhotos.length} expired photos for family ${familyId}`);
      return expiredPhotos;
    } catch (error) {
      console.error('Error checking for expired photos:', error);
      return [];
    }
  }

  /**
   * Clean up expired photos
   * @param {string} familyId - Family identifier
   * @returns {Promise<{deleted: number, errors: Array}>}
   */
  async cleanupExpiredPhotos(familyId) {
    try {
      const expiredPhotos = await this.getExpiredPhotos(familyId);
      
      if (expiredPhotos.length === 0) {
        console.log('🧹 No expired photos to clean up');
        return { deleted: 0, errors: [] };
      }
      
      const deletionResults = await this.deleteMultiplePhotos(
        expiredPhotos.map(photo => photo.path)
      );
      
      const deleted = deletionResults.filter(result => result.success).length;
      const errors = deletionResults.filter(result => !result.success);
      
      console.log(`🧹 Cleaned up ${deleted} expired photos, ${errors.length} errors`);
      
      return { deleted, errors };
    } catch (error) {
      console.error('Error during cleanup:', error);
      return { deleted: 0, errors: [error.message] };
    }
  }

  /**
   * Get photos approaching expiration (within 1 week)
   * @param {string} familyId - Family identifier
   * @returns {Promise<Array>} Array of photos approaching expiration
   */
  async getPhotosApproachingExpiration(familyId) {
    try {
      const now = Date.now();
      const oneWeekFromNow = now + (7 * 24 * 60 * 60 * 1000);
      const approachingExpiration = [];
      
      // Check task examples folder
      const examplesRef = ref(storage, `families/${familyId}/photos/task-examples`);
      const examplesList = await listAll(examplesRef);
      
      for (const itemRef of examplesList.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const expiresAt = metadata.customMetadata?.expiresAt;
          
          if (expiresAt) {
            const expirationTime = parseInt(expiresAt);
            if (expirationTime > now && expirationTime < oneWeekFromNow) {
              approachingExpiration.push({
                path: itemRef.fullPath,
                type: 'example',
                expiresAt: new Date(expirationTime),
                taskId: metadata.customMetadata?.taskId
              });
            }
          }
        } catch (error) {
          console.warn('Could not get metadata for:', itemRef.fullPath);
        }
      }
      
      console.log(`⏰ Found ${approachingExpiration.length} photos approaching expiration`);
      return approachingExpiration;
    } catch (error) {
      console.error('Error checking for photos approaching expiration:', error);
      return [];
    }
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @returns {{valid: boolean, error?: string}}
   */
  validateFile(file) {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' };
    }
    
    // Check file size (max 10MB before compression)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }
    
    // Check file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return { valid: false, error: 'Invalid file type. Please use JPG, PNG, GIF, or WebP' };
    }
    
    return { valid: true };
  }

  /**
   * Get storage usage statistics for a family
   * @param {string} familyId - Family identifier
   * @returns {Promise<{totalFiles: number, totalSize: number, byType: Object}>}
   */
  async getStorageStats(familyId) {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        byType: {
          examples: { files: 0, size: 0 },
          completions: { files: 0, size: 0 }
        }
      };
      
      // Check examples folder
      const examplesRef = ref(storage, `families/${familyId}/photos/task-examples`);
      const examplesList = await listAll(examplesRef);
      
      for (const itemRef of examplesList.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const size = metadata.size || 0;
          
          stats.totalFiles++;
          stats.totalSize += size;
          stats.byType.examples.files++;
          stats.byType.examples.size += size;
        } catch (error) {
          console.warn('Could not get metadata for:', itemRef.fullPath);
        }
      }
      
      // Check completions folder  
      const completionsRef = ref(storage, `families/${familyId}/photos/task-completions`);
      const completionsList = await listAll(completionsRef);
      
      for (const itemRef of completionsList.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const size = metadata.size || 0;
          
          stats.totalFiles++;
          stats.totalSize += size;
          stats.byType.completions.files++;
          stats.byType.completions.size += size;
        } catch (error) {
          console.warn('Could not get metadata for:', itemRef.fullPath);
        }
      }
      
      console.log('📊 Storage stats for family', familyId, ':', {
        totalFiles: stats.totalFiles,
        totalSize: (stats.totalSize / 1024 / 1024).toFixed(2) + 'MB'
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        byType: {
          examples: { files: 0, size: 0 },
          completions: { files: 0, size: 0 }
        }
      };
    }
  }
}

// Export singleton instance
export const photoStorageService = new PhotoStorageService();
export default photoStorageService;