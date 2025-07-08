/**
 * Firestore Listener Manager
 * Prevents duplicate listeners and manages cleanup to avoid internal assertion failures
 */

class FirestoreListenerManager {
  constructor() {
    this.activeListeners = new Map();
    this.listenersByComponent = new Map();
  }

  /**
   * Register a listener with automatic cleanup
   * @param {string} key - Unique key for the listener
   * @param {Function} listenerFactory - Function that returns an unsubscribe function
   * @param {string} componentId - Component identifier for cleanup
   * @returns {Function} - Unsubscribe function
   */
  registerListener(key, listenerFactory, componentId = 'unknown') {
    // If listener already exists, return the existing one
    if (this.activeListeners.has(key)) {
      console.log(`🔄 Reusing existing listener: ${key}`);
      return this.activeListeners.get(key);
    }

    try {
      console.log(`🎯 Creating new listener: ${key} (component: ${componentId})`);
      
      // Create the listener
      const unsubscribe = listenerFactory();
      
      if (typeof unsubscribe !== 'function') {
        console.error(`❌ Listener factory for ${key} did not return an unsubscribe function`);
        return () => {};
      }

      // Store the listener
      this.activeListeners.set(key, unsubscribe);

      // Track by component for cleanup
      if (!this.listenersByComponent.has(componentId)) {
        this.listenersByComponent.set(componentId, new Set());
      }
      this.listenersByComponent.get(componentId).add(key);

      // Return a wrapped unsubscribe function
      const wrappedUnsubscribe = () => {
        this.removeListener(key, componentId);
      };

      return wrappedUnsubscribe;

    } catch (error) {
      console.error(`❌ Error creating listener ${key}:`, error);
      return () => {};
    }
  }

  /**
   * Remove a specific listener
   * @param {string} key - Listener key
   * @param {string} componentId - Component identifier
   */
  removeListener(key, componentId = 'unknown') {
    const unsubscribe = this.activeListeners.get(key);
    if (unsubscribe) {
      try {
        console.log(`🛑 Removing listener: ${key} (component: ${componentId})`);
        unsubscribe();
        this.activeListeners.delete(key);

        // Remove from component tracking
        const componentListeners = this.listenersByComponent.get(componentId);
        if (componentListeners) {
          componentListeners.delete(key);
          if (componentListeners.size === 0) {
            this.listenersByComponent.delete(componentId);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error removing listener ${key}:`, error);
        // Force remove even if cleanup failed
        this.activeListeners.delete(key);
      }
    }
  }

  /**
   * Remove all listeners for a component
   * @param {string} componentId - Component identifier
   */
  removeComponentListeners(componentId) {
    const componentListeners = this.listenersByComponent.get(componentId);
    if (componentListeners) {
      console.log(`🧹 Cleaning up ${componentListeners.size} listeners for component: ${componentId}`);
      
      for (const key of componentListeners) {
        this.removeListener(key, componentId);
      }
    }
  }

  /**
   * Remove all listeners (emergency cleanup)
   */
  removeAllListeners() {
    console.log(`🚨 Emergency cleanup: removing ${this.activeListeners.size} listeners`);
    
    for (const [key, unsubscribe] of this.activeListeners) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn(`⚠️ Error during emergency cleanup of ${key}:`, error);
      }
    }
    
    this.activeListeners.clear();
    this.listenersByComponent.clear();
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      activeListeners: this.activeListeners.size,
      componentCount: this.listenersByComponent.size,
      listeners: Array.from(this.activeListeners.keys()),
      components: Array.from(this.listenersByComponent.keys())
    };
  }

  /**
   * Create a unique key for a Firestore query (instance method)
   * @param {string} collection - Collection name
   * @param {object} params - Query parameters
   * @returns {string} - Unique key
   */
  createKey(collection, params = {}) {
    return FirestoreListenerManager.createKey(collection, params);
  }

  /**
   * Create a unique key for a Firestore query (static method)
   * @param {string} collection - Collection name
   * @param {object} params - Query parameters
   * @returns {string} - Unique key
   */
  static createKey(collection, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${collection}${sortedParams ? `?${sortedParams}` : ''}`;
  }
}

// Create singleton instance
const firestoreListenerManager = new FirestoreListenerManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    firestoreListenerManager.removeAllListeners();
  });

  // Debug utility
  window.firestoreListenerManager = firestoreListenerManager;
}

export default firestoreListenerManager;