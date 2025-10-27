/**
 * Search Bar Module for Loom Lite v2.0
 * Global concept search with autocomplete and filters
 * 
 * LOOM-V2-INT-001: Frontend Integration Layer
 */

import { bus, setSearchQuery, getSelectedFilters, addFilter, removeFilter } from './eventBus.js';

// Configuration
const API_BASE = 'https://loomlite-production.up.railway.app';
const DEBOUNCE_DELAY = 200; // ms
const MAX_SUGGESTIONS = 5;

// State
let debounceTimer = null;
let currentSuggestions = [];
let availableTypes = [];
let availableTags = [];

/**
 * Initialize search bar
 */
export async function initSearchBar() {
  console.log('Initializing Search Bar...');
  
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) {
    console.warn('Toolbar element not found');
    return;
  }
  
  // Create search container
  const searchContainer = createSearchContainer();
  
  // Insert after logo (first child)
  const logo = toolbar.querySelector('img');
  if (logo && logo.nextSibling) {
    toolbar.insertBefore(searchContainer, logo.nextSibling);
  } else {
    toolbar.insertBefore(searchContainer, toolbar.firstChild);
  }
  
  // Fetch available filters
  await fetchAvailableFilters();
  
  // Filter chips removed in v2.2
  // renderFilterChips();
  
  console.log('Search Bar initialized');
}

/**
 * Create search container with input and autocomplete
 * @returns {HTMLElement} Search container element
 */
function createSearchContainer() {
  const container = document.createElement('div');
  container.id = 'search-container';
  container.style.cssText = `
    position: relative;
    flex: 0 0 auto;
    width: 20%;
    max-width: 280px;
    margin: 0;
  `;
  
  // Search input
  const input = document.createElement('input');
  input.id = 'search-input';
  input.type = 'text';
  input.placeholder = 'Search';
  input.style.cssText = `
    width: 100%;
    padding: 8px 12px 8px 32px;
    background: #181818;
    border: none;
    border-radius: 6px;
    color: #e6e6e6;
    font-size: 12px;
    transition: box-shadow 0.15s cubic-bezier(0.25, 0.1, 0.25, 1);
  `;
  
  // Add search icon
  const icon = document.createElement('span');
  icon.style.cssText = `
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: #777777;
    pointer-events: none;
  `;
  icon.textContent = '⌕'; // Search icon
  
  // Focus styling
  input.addEventListener('focus', () => {
    input.style.boxShadow = '0 0 0 2px rgba(250, 214, 67, 0.2)';
  });
  
  input.addEventListener('blur', () => {
    input.style.boxShadow = 'none';
    
    // Hide suggestions after a delay to allow click
    setTimeout(() => {
      hideSuggestions();
    }, 200);
  });
  
  // Input handler with debounce
  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Debounce search
    if (query.length >= 2) {
      debounceTimer = setTimeout(() => {
        performSearch(query);
      }, DEBOUNCE_DELAY);
    } else {
      hideSuggestions();
    }
  });
  
  // Enter key handler
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = input.value.trim();
      if (query.length >= 2) {
        performSearch(query);
      }
    }
  });
  
  // Autocomplete dropdown
  const dropdown = document.createElement('div');
  dropdown.id = 'search-dropdown';
  dropdown.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
  `;
  
  container.appendChild(icon);
  container.appendChild(input);
  container.appendChild(dropdown);
  
  return container;
}

/**
 * Perform search and show suggestions
 * @param {string} query - Search query
 */
async function performSearch(query) {
  const startTime = performance.now();
  
  try {
    // Update state
    setSearchQuery(query);
    
    // Build query parameters
    const filters = getSelectedFilters();
    const params = new URLSearchParams({ q: query });
    
    if (filters.types.length > 0) {
      params.append('types', filters.types.join(','));
    }
    
    if (filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','));
    }
    
    // Fetch results
    const response = await fetch(`${API_BASE}/search?${params}`);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const results = data.concepts || data; // Handle both {concepts: [...]} and [...] formats
    currentSuggestions = results.slice(0, MAX_SUGGESTIONS);
    
    // Emit search results event for graph highlighting
    bus.emit('searchResults', { 
      query, 
      results,
      count: results.length 
    });
    
    // Show suggestions
    showSuggestions(currentSuggestions);
    
    const endTime = performance.now();
    const searchTime = endTime - startTime;
    console.log(`Search completed in ${searchTime.toFixed(2)}ms`);
    
    // Check performance target
    if (searchTime > 150) {
      console.warn(`Search exceeded target (${searchTime.toFixed(2)}ms > 150ms)`);
    }
    
  } catch (error) {
    console.error('Search error:', error);
    hideSuggestions();
  }
}

/**
 * Show autocomplete suggestions
 * @param {Array} suggestions - Array of concept objects
 */
function showSuggestions(suggestions) {
  const dropdown = document.getElementById('search-dropdown');
  if (!dropdown) return;
  
  if (suggestions.length === 0) {
    dropdown.innerHTML = `
      <div style="padding: 12px; color: #64748b; font-size: 13px; text-align: center;">
        No results found
      </div>
    `;
    dropdown.style.display = 'block';
    return;
  }
  
  dropdown.innerHTML = '';
  
  suggestions.forEach(concept => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.style.cssText = `
      padding: 10px 12px;
      cursor: pointer;
      transition: background 0.2s;
      border-bottom: 1px solid #334155;
      font-size: 13px;
    `;
    
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: ${getTypeColor(concept.type)}; font-weight: 600;">${concept.label}</span>
        <span style="color: #64748b; font-size: 11px;">${concept.type}</span>
      </div>
      ${concept.doc_id ? `<div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">${concept.doc_id}</div>` : ''}
    `;
    
    item.addEventListener('mouseenter', () => {
      item.style.background = '#334155';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });
    
    item.addEventListener('click', () => {
      handleSuggestionClick(concept);
    });
    
    dropdown.appendChild(item);
  });
  
  dropdown.style.display = 'block';
}

/**
 * Hide autocomplete suggestions
 */
function hideSuggestions() {
  const dropdown = document.getElementById('search-dropdown');
  if (dropdown) {
    dropdown.style.display = 'none';
  }
}

/**
 * Handle suggestion click
 * @param {Object} concept - Selected concept
 */
async function handleSuggestionClick(concept) {
  console.log(`Suggestion selected: ${concept.label}`);
  
  // Hide suggestions
  hideSuggestions();
  
  // Clear search input
  const input = document.getElementById('search-input');
  if (input) {
    input.value = '';
  }
  
  // If concept has a document, load it first
  if (concept.doc_id) {
    console.log(`Loading document: ${concept.doc_id}`);
    
    // Emit document focus to switch document in sidebar
    bus.emit('documentFocus', { docId: concept.doc_id });
    
    // Wait for document to load, then select the concept
    // The drawDualVisualizer function will be called by the sidebar
    // After it completes, we can select the concept
    setTimeout(() => {
      console.log(`Selecting concept: ${concept.label}`);
      bus.emit('conceptSelected', { 
        conceptId: concept.id, 
        docId: concept.doc_id 
      });
    }, 500); // Wait 500ms for document to load
  } else {
    // No document, just emit concept selected
    bus.emit('conceptSelected', { 
      conceptId: concept.id 
    });
  }
}

/**
 * Fetch available filter options
 */
async function fetchAvailableFilters() {
  try {
    // Fetch available types from concepts
    const typesResponse = await fetch(`${API_BASE}/concepts?types=`);
    if (typesResponse.ok) {
      const data = await typesResponse.json();
      const concepts = data.concepts || data; // Handle both {concepts: [...]} and [...] formats
      availableTypes = [...new Set(concepts.map(c => c.type))].sort();
    }
    
    // Fetch available tags
    const tagsResponse = await fetch(`${API_BASE}/tags`);
    if (tagsResponse.ok) {
      const tagsData = await tagsResponse.json();
      // Handle both array and {tags: [...]} response formats
      const tags = Array.isArray(tagsData) ? tagsData : (tagsData.tags || []);
      availableTags = tags.map(t => t.label || t).sort();
    }
    
    console.log(`Loaded filters: ${availableTypes.length} types, ${availableTags.length} tags`);
    
  } catch (error) {
    console.error('Error fetching filters:', error);
  }
}

/**
 * Render filter chips
 */
function renderFilterChips() {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;
  
  // Check if filter container already exists
  let filterContainer = document.getElementById('filter-container');
  if (filterContainer) {
    filterContainer.remove();
  }
  
  filterContainer = document.createElement('div');
  filterContainer.id = 'filter-container';
  filterContainer.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;
  
  // Type filter dropdown
  if (availableTypes.length > 0) {
    const typeButton = createFilterButton('Types', availableTypes, 'types');
    filterContainer.appendChild(typeButton);
  }
  
  // Tag filter dropdown
  if (availableTags.length > 0) {
    const tagButton = createFilterButton('Tags', availableTags, 'tags');
    filterContainer.appendChild(tagButton);
  }
  
  // Insert before view mode buttons
  const viewModeButtons = document.getElementById('viewModeButtons');
  if (viewModeButtons) {
    toolbar.insertBefore(filterContainer, viewModeButtons);
  } else {
    toolbar.appendChild(filterContainer);
  }
}

/**
 * Create filter button with dropdown
 * @param {string} label - Button label
 * @param {Array} options - Filter options
 * @param {string} category - Filter category
 * @returns {HTMLElement} Filter button element
 */
function createFilterButton(label, options, category) {
  const button = document.createElement('button');
  button.className = 'filter-button';
  button.textContent = label;
  button.style.cssText = `
    padding: 6px 12px;
    background: #334155;
    border: none;
    border-radius: 6px;
    color: #e2e8f0;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.background = '#475569';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.background = '#334155';
  });
  
  button.addEventListener('click', () => {
    // Show filter dropdown (placeholder - full implementation would add dropdown)
    console.log(`Filter button clicked: ${label}`);
  });
  
  return button;
}

/**
 * Get color for concept type
 * @param {string} type - Concept type
 * @returns {string} Color hex code
 */
function getTypeColor(type) {
  const colors = {
    Person: '#8b5cf6',
    Project: '#f59e0b',
    Date: '#10b981',
    Metric: '#3b82f6',
    Technology: '#06b6d4',
    Feature: '#ec4899',
    Process: '#f97316',
    Topic: '#84cc16',
    Team: '#6366f1'
  };
  return colors[type] || '#94a3b8';
}

// Export for global access
window.initSearchBar = initSearchBar;
window.performSearch = performSearch;

