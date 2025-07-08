/**
 * Debouncing utilities to prevent rapid re-executions
 */

const debounceTimers = new Map();

/**
 * Debounce a function to prevent rapid executions
 * @param {string} key - Unique key for this debounce
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Promise} - Promise that resolves with the function result
 */
export const debounce = (key, func, delay = 300) => {
  return new Promise((resolve, reject) => {
    // Clear existing timer for this key
    if (debounceTimers.has(key)) {
      clearTimeout(debounceTimers.get(key));
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const result = await func();
        debounceTimers.delete(key);
        resolve(result);
      } catch (error) {
        debounceTimers.delete(key);
        reject(error);
      }
    }, delay);

    debounceTimers.set(key, timer);
  });
};

/**
 * Cancel a specific debounced function
 * @param {string} key - Key to cancel
 */
export const cancelDebounce = (key) => {
  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key));
    debounceTimers.delete(key);
  }
};

/**
 * Cancel all debounced functions
 */
export const cancelAllDebounces = () => {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
};