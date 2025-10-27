/**
 * Event Bus Module for Loom Lite v2.0
 * Centralized event system for cross-panel communication
 * 
 * LOOM-V2-INT-001: Frontend Integration Layer
 */

// Global state management
const state = {
  currentDocId: null,
  currentConceptId: null,
  searchQuery: null,
  selectedFilters: {
    types: [],
    tags: []
  }
};

/**
 * Event bus for cross-panel communication
 */
export const bus = {
  /**
   * Subscribe to an event
   * @param {string} type - Event type
   * @param {Function} handler - Event handler function
   */
  on: (type, handler) => {
    window.addEventListener(type, handler);
  },
  
  /**
   * Unsubscribe from an event
   * @param {string} type - Event type
   * @param {Function} handler - Event handler function
   */
  off: (type, handler) => {
    window.removeEventListener(type, handler);
  },
  
  /**
   * Emit an event
   * @param {string} type - Event type
   * @param {*} detail - Event payload
   */
  emit: (type, detail) => {
    const event = new CustomEvent(type, { detail });
    window.dispatchEvent(event);
    
    // Log for debugging
    console.log(`🔔 Event: ${type}`, detail);
  }
};

/**
 * Get current application state
 * @returns {Object} Current state
 */
export function getState() {
  return { ...state };
}

/**
 * Update application state
 * @param {Object} updates - State updates
 */
export function setState(updates) {
  Object.assign(state, updates);
  bus.emit('stateChanged', { state: getState() });
}

/**
 * Get current document ID
 * @returns {string|null} Current document ID
 */
export function getCurrentDocId() {
  return state.currentDocId;
}

/**
 * Set current document ID
 * @param {string} docId - Document ID
 */
export function setCurrentDocId(docId) {
  state.currentDocId = docId;
  bus.emit('documentFocus', { docId });
}

/**
 * Get current concept ID
 * @returns {string|null} Current concept ID
 */
export function getCurrentConceptId() {
  return state.currentConceptId;
}

/**
 * Set current concept ID
 * @param {string} conceptId - Concept ID
 * @param {string} docId - Document ID (optional)
 */
export function setCurrentConceptId(conceptId, docId = null) {
  state.currentConceptId = conceptId;
  bus.emit('conceptSelected', { 
    conceptId, 
    docId: docId || state.currentDocId 
  });
}

/**
 * Get search query
 * @returns {string|null} Current search query
 */
export function getSearchQuery() {
  return state.searchQuery;
}

/**
 * Set search query
 * @param {string} query - Search query
 */
export function setSearchQuery(query) {
  state.searchQuery = query;
  bus.emit('searchQueryChanged', { query });
}

/**
 * Get selected filters
 * @returns {Object} Selected filters
 */
export function getSelectedFilters() {
  return { ...state.selectedFilters };
}

/**
 * Set selected filters
 * @param {Object} filters - Filters object with types and tags arrays
 */
export function setSelectedFilters(filters) {
  state.selectedFilters = filters;
  bus.emit('filtersChanged', { filters });
}

/**
 * Add filter
 * @param {string} category - Filter category ('types' or 'tags')
 * @param {string} value - Filter value
 */
export function addFilter(category, value) {
  if (!state.selectedFilters[category].includes(value)) {
    state.selectedFilters[category].push(value);
    bus.emit('filtersChanged', { filters: getSelectedFilters() });
  }
}

/**
 * Remove filter
 * @param {string} category - Filter category ('types' or 'tags')
 * @param {string} value - Filter value
 */
export function removeFilter(category, value) {
  const index = state.selectedFilters[category].indexOf(value);
  if (index > -1) {
    state.selectedFilters[category].splice(index, 1);
    bus.emit('filtersChanged', { filters: getSelectedFilters() });
  }
}

/**
 * Clear all filters
 */
export function clearFilters() {
  state.selectedFilters = { types: [], tags: [] };
  bus.emit('filtersChanged', { filters: getSelectedFilters() });
}

// Initialize event listeners for state management
bus.on('documentLoaded', (event) => {
  const { docId } = event.detail;
  state.currentDocId = docId;
  console.log(`Document loaded: ${docId}`);
});

bus.on('conceptSelected', (event) => {
  const { conceptId } = event.detail;
  state.currentConceptId = conceptId;
  console.log(`Concept selected: ${conceptId}`);
});

// Export for global access
window.bus = bus;
window.getState = getState;
window.setState = setState;
window.getCurrentDocId = getCurrentDocId;
window.setCurrentDocId = setCurrentDocId;
window.getCurrentConceptId = getCurrentConceptId;
window.setCurrentConceptId = setCurrentConceptId;

console.log('Event Bus initialized');

