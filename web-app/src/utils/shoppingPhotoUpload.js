import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

// Upload receipt photo
export const uploadReceiptPhoto = async (file, familyId, listId) => {
  if (!file || !familyId || !listId) {
    throw new Error('Missing required parameters for receipt upload');
  }

  try {
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `receipt_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `shopping/${familyId}/receipts/${listId}/${filename}`);

    console.log('Uploading receipt photo to:', storageRef.fullPath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Receipt photo uploaded successfully');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Receipt photo URL:', downloadURL);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      filename: filename,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error uploading receipt photo:', error);
    throw new Error(`Failed to upload receipt photo: ${error.message}`);
  }
};

// Upload product reference photo
export const uploadProductPhoto = async (file, familyId, itemKey) => {
  if (!file || !familyId || !itemKey) {
    throw new Error('Missing required parameters for product photo upload');
  }

  try {
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `product_${itemKey}_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `shopping/${familyId}/products/${itemKey}/${filename}`);

    console.log('Uploading product photo to:', storageRef.fullPath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Product photo uploaded successfully');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Product photo URL:', downloadURL);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      filename: filename,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error uploading product photo:', error);
    throw new Error(`Failed to upload product photo: ${error.message}`);
  }
};

// Delete photo by path
export const deletePhoto = async (photoPath) => {
  if (!photoPath) {
    throw new Error('Photo path is required for deletion');
  }

  try {
    const photoRef = ref(storage, photoPath);
    await deleteObject(photoRef);
    console.log('Photo deleted successfully:', photoPath);
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw new Error(`Failed to delete photo: ${error.message}`);
  }
};

// Validate image file
export const validateImageFile = (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('Image file must be smaller than 5MB');
  }

  // Check for common image formats
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Image must be JPEG, PNG, or WebP format');
  }

  return true;
};

// Compress image if needed (basic implementation)
export const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const newWidth = img.width * ratio;
      const newHeight = img.height * ratio;

      // Set canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw and compress
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      canvas.toBlob(resolve, file.type, quality);
    };

    img.src = URL.createObjectURL(file);
  });
};