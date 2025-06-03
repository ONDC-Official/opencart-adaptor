// utils/cache.js

const cache = new Map();

/**
 * Retrieves a value from the cache based on the key.
 * @param {string} key The key to look up.
 * @returns {*} The cached value, or undefined if not found.
 */
export const getValue = (key) => {
  return cache.get(key);
};

/**
 * Stores a value in the cache with an optional time-to-live (TTL).
 * @param {string} key The key to store the value under.
 * @param {*} value The value to store.
 * @param {number} [ttlInSeconds] The time-to-live for the entry in seconds.
 */
export const setValue = (key, value, ttlInSeconds) => {
  cache.set(key, value);
  if (ttlInSeconds && typeof ttlInSeconds === 'number' && ttlInSeconds > 0) {
    setTimeout(() => {
      cache.delete(key);
    }, ttlInSeconds * 1000);
  }
};

/**
 * Removes a value from the cache based on the key.
 * @param {string} key The key to remove.
 */
export const deleteValue = (key) => {
  cache.delete(key);
};

/**
 * Clears all entries from the cache.
 */
export const clearCache = () => {
  cache.clear();
};

export default { getValue, setValue, deleteValue, clearCache };