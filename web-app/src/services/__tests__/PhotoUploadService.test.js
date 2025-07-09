import { 
  validateImageFile, 
  resizeImage, 
  CONFIG 
} from '../PhotoUploadService';

// Mock Firebase storage
jest.mock('../../firebase', () => ({
  storage: {}
}));

describe('PhotoUploadService', () => {
  describe('validateImageFile', () => {
    it('should validate a valid JPEG file', () => {
      const validFile = new File([''], 'test.jpg', { type: 'image/jpeg', size: 1024 * 1024 }); // 1MB
      const result = validateImageFile(validFile);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that are too large', () => {
      const largeFile = new File([''], 'large.jpg', { 
        type: 'image/jpeg', 
        size: 11 * 1024 * 1024 // 11MB
      });
      const result = validateImageFile(largeFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('File too large');
    });

    it('should reject unsupported file types', () => {
      const invalidFile = new File([''], 'test.gif', { type: 'image/gif', size: 1024 });
      const result = validateImageFile(invalidFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unsupported file type');
    });

    it('should warn about large but acceptable files', () => {
      const largeFile = new File([''], 'large.jpg', { 
        type: 'image/jpeg', 
        size: 6 * 1024 * 1024 // 6MB
      });
      const result = validateImageFile(largeFile);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('Large file detected');
    });

    it('should handle null file input', () => {
      const result = validateImageFile(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No file selected');
    });
  });

  describe('Configuration', () => {
    it('should have correct file size limits', () => {
      expect(CONFIG.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
      expect(CONFIG.warnFileSize).toBe(5 * 1024 * 1024); // 5MB
    });

    it('should support correct file types', () => {
      expect(CONFIG.supportedTypes).toContain('image/jpeg');
      expect(CONFIG.supportedTypes).toContain('image/png');
      expect(CONFIG.supportedTypes).toContain('image/webp');
    });

    it('should have reasonable timeout', () => {
      expect(CONFIG.timeout).toBe(30000); // 30 seconds
    });
  });

  // Note: Testing resizeImage would require DOM mocking for Canvas API
  // This is typically done with jsdom and canvas mocking libraries
  describe('resizeImage', () => {
    it('should be defined', () => {
      expect(typeof resizeImage).toBe('function');
    });
  });
});