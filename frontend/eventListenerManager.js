/**
 * Event Listener Manager - Prevents memory leaks by tracking and cleaning up event listeners
 * 
 * Usage:
 * import { createListenerManager } from './eventListenerManager.js';
 * 
 * const listeners = createListenerManager();
 * listeners.add('searchResults', handleSearch);
 * // Later: listeners.cleanup();
 */

import { bus } from './eventBus.js';

/**
 * Create a new listener manager for a component
 * @returns {Object} Manager with add() and cleanup() methods
 */
export function createListenerManager() {
  const listeners = [];
  
  return {
    /**
     * Add an event listener and track it for cleanup
     * @param {string} eventName - Name of the event
     * @param {Function} handler - Event handler function
     */
    add(eventName, handler) {
      bus.on(eventName, handler);
      listeners.push({ eventName, handler });
    },
    
    /**
     * Remove all tracked event listeners
     */
    cleanup() {
      listeners.forEach(({ eventName, handler }) => {
        bus.off(eventName, handler);
      });
      listeners.length = 0;
      console.log(`[EventListenerManager] Cleaned up ${listeners.length} listeners`);
    },
    
    /**
     * Get count of tracked listeners
     */
    count() {
      return listeners.length;
    }
  };
}

/**
 * Global cleanup function to be called on page unload
 */
const globalManagers = [];

export function registerManager(manager) {
  globalManagers.push(manager);
}

export function cleanupAllManagers() {
  console.log(`[EventListenerManager] Cleaning up ${globalManagers.length} managers...`);
  globalManagers.forEach(manager => manager.cleanup());
  globalManagers.length = 0;
}

// Automatically cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAllManagers);
}
