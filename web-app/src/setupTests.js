// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('./firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  },
  db: {},
  storage: {},
  analytics: {}
}));

// Mock console.error to suppress React error boundary logs during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock IntersectionObserver (for components that use it)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  
  observe() {
    return null;
  }
  
  disconnect() {
    return null;
  }
  
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver (for components that use it)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  
  observe() {
    return null;
  }
  
  disconnect() {
    return null;
  }
  
  unobserve() {
    return null;
  }
};

// Mock Canvas API for image processing tests
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4)
  })),
  putImageData: jest.fn()
}));

global.HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  callback(new Blob([''], { type: 'image/jpeg' }));
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock File constructor for file upload tests
global.File = class MockFile {
  constructor(content, filename, options = {}) {
    this.content = content;
    this.name = filename;
    this.size = options.size || content.length;
    this.type = options.type || 'text/plain';
    this.lastModified = options.lastModified || Date.now();
  }
};

// Mock Image constructor for image processing tests
global.Image = class MockImage {
  constructor() {
    this.width = 800;
    this.height = 600;
    
    // Simulate image loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
  
  set src(value) {
    this._src = value;
  }
  
  get src() {
    return this._src;
  }
};
