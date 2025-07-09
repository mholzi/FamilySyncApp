import React, { useState } from 'react';
import { photoStorageService } from '../../../services/photoStorageService';
import './ExamplePhotos.css';

const ExamplePhotos = ({ 
  familyId, 
  photos = [], 
  onPhotosChange, 
  isEditing = false,
  taskTitle = "this task"
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress({ completed: 0, total: files.length });

    try {
      const results = await photoStorageService.uploadMultiplePhotos(
        Array.from(files),
        familyId,
        'example',
        null,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Filter successful uploads
      const successfulUploads = results.filter(result => result.url);
      const newPhotos = [...photos, ...successfulUploads];
      
      onPhotosChange(newPhotos);

      // Show error for failed uploads
      const failedUploads = results.filter(result => result.error);
      if (failedUploads.length > 0) {
        console.warn('Some photos failed to upload:', failedUploads);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDeletePhoto = async (photoIndex) => {
    if (!isEditing) return;

    const photoToDelete = photos[photoIndex];
    if (photoToDelete?.path) {
      try {
        await photoStorageService.deletePhoto(photoToDelete.path);
      } catch (error) {
        console.error('Error deleting photo:', error);
      }
    }

    const newPhotos = photos.filter((_, index) => index !== photoIndex);
    onPhotosChange(newPhotos);
  };

  const PhotoViewer = ({ photo, onClose }) => (
    <div className="photo-viewer-overlay" onClick={onClose}>
      <div className="photo-viewer-container">
        <button className="photo-viewer-close" onClick={onClose}>×</button>
        <img src={photo.url} alt="Example" className="photo-viewer-image" />
        <div className="photo-viewer-info">
          <p>Uploaded {photo.uploadedAt?.toDate().toLocaleDateString()}</p>
          <p className="expiration-note">
            Photos automatically expire after 2 months
          </p>
        </div>
      </div>
    </div>
  );

  if (!isEditing && photos.length === 0) {
    return null;
  }

  return (
    <div className="example-photos">
      <div className="example-photos-header">
        <h4>Photo Examples</h4>
        <span className="example-photos-subtitle">
          {isEditing 
            ? "Show your au pair how you like it done"
            : `How we like ${taskTitle} done`
          }
        </span>
      </div>

      {photos.length > 0 && (
        <div className="photos-grid">
          {photos.map((photo, index) => (
            <div key={index} className="photo-item">
              <img 
                src={photo.url} 
                alt={`Example ${index + 1}`}
                className="photo-thumbnail"
                onClick={() => setSelectedPhoto(photo)}
              />
              {isEditing && (
                <button 
                  className="photo-delete-btn"
                  onClick={() => handleDeletePhoto(index)}
                  title="Delete photo"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="photo-upload-section">
          <div 
            className={`photo-drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="photo-upload-input"
              disabled={uploading}
            />
            <label htmlFor="photo-upload" className="photo-upload-label">
              {uploading ? (
                <div className="upload-progress">
                  <div className="upload-spinner"></div>
                  <span>
                    Uploading {uploadProgress?.completed || 0} of {uploadProgress?.total || 0}...
                  </span>
                </div>
              ) : (
                <>
                  <div className="upload-icon">📸</div>
                  <div className="upload-text">
                    <strong>Click to upload</strong> or drag photos here
                  </div>
                  <div className="upload-hint">
                    JPG, PNG, GIF up to 10MB each
                  </div>
                </>
              )}
            </label>
          </div>

          {photos.length > 0 && (
            <div className="photo-management-info">
              <div className="photo-count">
                📸 {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded
              </div>
              <div className="photo-expiration">
                ⏰ Photos automatically expire after 2 months
              </div>
            </div>
          )}
        </div>
      )}

      {!isEditing && photos.length === 0 && (
        <div className="no-photos-message">
          <span className="no-photos-icon">📸</span>
          <p>No example photos available</p>
        </div>
      )}

      {selectedPhoto && (
        <PhotoViewer 
          photo={selectedPhoto} 
          onClose={() => setSelectedPhoto(null)} 
        />
      )}
    </div>
  );
};

export default ExamplePhotos;