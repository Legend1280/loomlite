/**
 * NAVIGATOR - Document Navigation System for LoomLite v2.0 (Dynamic)
 * Architecture: Top Hits → Pinned → Mode Switch → Dynamic Folders → Active Threads
 * 
 * The Navigator provides intelligent document organization with three viewing modes:
 * - Standard: File metadata (Recent, PDF, etc.)
 * - Meaning: Ontology-based clusters (Projects, Concepts, etc.)
 * - Time: Chronological groups (Today, This Week, etc.)
 */

import { bus } from './eventBus.js';
import { initModeSwitch } from './navigatorModeSwitch.js';
import { initDynamicPane } from './navigatorDynamicPane.js';
import { initActiveThreads } from './navigatorActiveThreads.js';

const BACKEND_URL = 'https://loomlite-production.up.railway.app';

// Global state
let topHits = [];
let originalTopHits = []; // Store original engagement-based top hits
let lastValidSearchHits = []; // Store last valid search results
let pinnedFolders = [];
let collapsedSections = loadCollapsedState();
let isSearchActive = false; // Track if search is active

/**
 * Initialize Navigator
 */
export function initFileSystemSidebar() {
  console.log('Initializing Navigator v2.0 (Dynamic)...');
  
  const container = document.getElementById('file-system-sidebar');
  if (!container) {
    console.warn('Navigator container not found');
    return;
  }
  
  // Load static tiers
  loadStaticTiers();
  
  // Listen for document upload events to refresh
  bus.on('documentUploaded', () => {
    console.log('Document uploaded, refreshing Navigator...');
    loadStaticTiers();
  });
  
  // Listen for search results to update Top Hits dynamically
  bus.on('searchResults', (data) => {
    console.log('Search results received, updating Top Hits...');
    updateTopHitsFromSearch(data);
  });
  
  // Listen for search cleared to restore original Top Hits
  bus.on('searchCleared', () => {
    console.log('Search cleared, restoring original Top Hits...');
    restoreOriginalTopHits();
  });
}

/**
 * Load static sidebar tiers (Top Hits, Pinned)
 */
async function loadStaticTiers() {
  try {
    await Promise.all([
      loadTopHits(),
      loadPinnedFolders()
    ]);
    
    renderSidebar();
  } catch (error) {
    console.error('Error loading sidebar tiers:', error);
  }
}

/**
 * Load top hits
 */
async function loadTopHits() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/files/top-hits?limit=6`);
    const data = await response.json();
    topHits = data.top_hits || [];
    originalTopHits = [...topHits]; // Store original for restoration
    console.log(`Loaded ${topHits.length} top hits`);
  } catch (error) {
    console.error('Error loading top hits:', error);
    topHits = [];
    originalTopHits = [];
  }
}

/**
 * Load pinned folders
 */
async function loadPinnedFolders() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/files/pinned`);
    const data = await response.json();
    pinnedFolders = data.pinned || [];
    console.log(`Loaded ${pinnedFolders.length} pinned folders`);
  } catch (error) {
    console.error('Error loading pinned folders:', error);
    pinnedFolders = [];
  }
}

/**
 * Render the complete sidebar
 */
function renderSidebar() {
  const container = document.getElementById('file-system-sidebar');
  if (!container) return;
  
  container.innerHTML = '';
  container.style.cssText = `
    width: 240px;
    height: 100%;
    background: #0c0c0c;
    border-right: 1px solid rgba(42, 42, 42, 0.4);
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  `;
  
  // Add NAVIGATOR label at the top
  const navigatorLabel = document.createElement('div');
  navigatorLabel.style.cssText = `
    padding: 16px 12px 12px 12px;
    font-size: 11px;
    font-weight: 500;
    color: #9a9a9a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(42, 42, 42, 0.4);
    flex-shrink: 0;
  `;
  navigatorLabel.textContent = 'NAVIGATOR';
  container.appendChild(navigatorLabel);
  
  // Render static tiers
  renderTopHits(container);
  renderPinnedFolders(container);
  
  // Create Mode Switch Bar container
  const modeSwitchContainer = document.createElement('div');
  modeSwitchContainer.style.cssText = 'flex-shrink: 0;';
  container.appendChild(modeSwitchContainer);
  
  // Create Dynamic Folders container (scrollable)
  const dynamicFoldersContainer = document.createElement('div');
  dynamicFoldersContainer.id = 'dynamic-folders-container';
  dynamicFoldersContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  `;
  container.appendChild(dynamicFoldersContainer);
  
  // Create Active Threads container (sticky at bottom)
  const activeThreadsContainer = document.createElement('div');
  activeThreadsContainer.id = 'active-threads-container';
  activeThreadsContainer.style.cssText = `
    flex-shrink: 0;
    background: #0c0c0c;
  `;
  container.appendChild(activeThreadsContainer);
  
  // Initialize dynamic components
  initModeSwitch(modeSwitchContainer);
  initDynamicPane(dynamicFoldersContainer);
  initActiveThreads(activeThreadsContainer);
}

/**
 * Render Top Hits section
 */
function renderTopHits(container) {
  const section = createSection('Top Hits', '▲', topHits.length);
  container.appendChild(section.header);
  container.appendChild(section.content);
  
  if (topHits.length === 0) {
    section.content.innerHTML = '<div style="padding: 8px 12px; font-size: 11px; color: #64748b; font-style: italic;">No top hits yet</div>';
    return;
  }
  
  topHits.forEach(hit => {
    const item = createDocumentItem(hit, {
      showScore: true,
      scoreLabel: `${(hit.engagement_score * 100).toFixed(0)}%`
    });
    section.content.appendChild(item);
  });
}

/**
 * Render Pinned Folders section
 */
function renderPinnedFolders(container) {
  const section = createSection('Pinned', '◆', pinnedFolders.length);
  container.appendChild(section.header);
  container.appendChild(section.content);
  
  if (pinnedFolders.length === 0) {
    section.content.innerHTML = '<div style="padding: 8px 12px; font-size: 11px; color: #64748b; font-style: italic;">No pinned folders</div>';
    return;
  }
  
  pinnedFolders.forEach(pin => {
    const item = createPinnedItem(pin);
    section.content.appendChild(item);
  });
}

/**
 * Create a collapsible section
 */
function createSection(title, iconText, count) {
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');
  const isCollapsed = collapsedSections[sectionId] || false;
  
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #111111;
    border-bottom: 1px solid rgba(42, 42, 42, 0.4);
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;
  `;
  
  const leftSide = document.createElement('div');
  leftSide.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  
  const iconEl = document.createElement('span');
  iconEl.textContent = iconText;
  iconEl.style.cssText = 'font-size: 12px; color: #9a9a9a; font-weight: 400;';
  
  const titleEl = document.createElement('span');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-size: 12px; font-weight: 500; color: #e6e6e6; letter-spacing: 0.5px;';
  
  const countBadge = document.createElement('span');
  countBadge.textContent = count;
  countBadge.style.cssText = `
    font-size: 10px;
    color: #9a9a9a;
    background: #181818;
    padding: 2px 6px;
    border-radius: 10px;
  `;
  
  leftSide.appendChild(iconEl);
  leftSide.appendChild(titleEl);
  leftSide.appendChild(countBadge);
  
  const chevron = document.createElement('span');
  chevron.textContent = isCollapsed ? '›' : '⌄';
  chevron.style.cssText = 'font-size: 14px; color: #9a9a9a; transition: transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1);';
  
  header.appendChild(leftSide);
  header.appendChild(chevron);
  
  const content = document.createElement('div');
  content.style.cssText = `
    display: ${isCollapsed ? 'none' : 'block'};
    animation: ${isCollapsed ? 'none' : 'slideDown 0.2s ease-out'};
    flex-shrink: 0;
  `;
  
  header.onclick = () => {
    const currentState = collapsedSections[sectionId] || false;
    const newState = !currentState;
    collapsedSections[sectionId] = newState;
    saveCollapsedState();
    
    content.style.display = newState ? 'none' : 'block';
    chevron.textContent = newState ? '›' : '⌄';
  };
  
  return { header, content };
}

/**
 * Create a document item
 */
function createDocumentItem(doc, options = {}) {
  const item = document.createElement('div');
  item.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1);
    border-bottom: 1px solid rgba(42, 42, 42, 0.4);
    border-left: 2px solid transparent;
  `;
  
  item.onmouseover = () => {
    item.style.background = 'rgba(24, 24, 24, 0.5)';
    item.style.borderLeft = '2px solid #fad643';
  };
  
  item.onmouseout = () => {
    item.style.background = 'transparent';
    item.style.borderLeft = '2px solid transparent';
  };
  
  const iconEl = document.createElement('div');
  iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>';
  iconEl.style.cssText = 'display: flex; align-items: center; color: #9a9a9a;';
  
  const titleEl = document.createElement('span');
  titleEl.textContent = truncateText(doc.title, 25);
  titleEl.style.cssText = 'font-size: 11px; color: #e6e6e6; flex: 1;';
  
  item.appendChild(iconEl);
  item.appendChild(titleEl);
  
  // Provenance indicator (minimal dot)
  if (doc.provenance_status) {
    const provenanceEl = document.createElement('div');
    const isVerified = doc.provenance_status === 'verified';
    
    provenanceEl.title = isVerified ? 'Provenance verified' : 'Provenance incomplete';
    provenanceEl.style.cssText = `
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${isVerified ? '#10b981' : '#f59e0b'};
      flex-shrink: 0;
    `;
    item.appendChild(provenanceEl);
  }
  
  if (options.showScore && options.scoreLabel) {
    const scoreEl = document.createElement('span');
    scoreEl.textContent = options.scoreLabel;
    scoreEl.style.cssText = `
      font-size: 9px;
      color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
      padding: 2px 5px;
      border-radius: 8px;
    `;
    item.appendChild(scoreEl);
  }
  
  item.onclick = () => {
    console.log(`Document selected: ${doc.title} (${doc.id})`);
    bus.emit('viewModeChanged', { mode: 'split' });
    bus.emit('documentFocus', { docId: doc.id });
  };
  
  return item;
}

/**
 * Create a pinned item
 */
function createPinnedItem(pin) {
  const item = document.createElement('div');
  item.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1);
    border-bottom: 1px solid rgba(42, 42, 42, 0.4);
    border-left: 2px solid transparent;
  `;
  
  item.onmouseover = () => {
    item.style.background = 'rgba(24, 24, 24, 0.5)';
    item.style.borderLeft = '2px solid #fad643';
  };
  
  item.onmouseout = () => {
    item.style.background = 'transparent';
    item.style.borderLeft = '2px solid transparent';
  };
  
  const iconEl = document.createElement('div');
  const docIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const folderIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>';
  iconEl.innerHTML = pin.type === 'document' ? docIcon : folderIcon;
  iconEl.style.cssText = 'display: flex; align-items: center; color: #9a9a9a;';
  
  const labelEl = document.createElement('span');
  labelEl.textContent = truncateText(pin.label, 25);
  labelEl.style.cssText = 'font-size: 11px; color: #e6e6e6; flex: 1;';
  
  item.appendChild(iconEl);
  item.appendChild(labelEl);
  
  item.onclick = () => {
    if (pin.type === 'document') {
      bus.emit('documentSelected', { detail: { docId: pin.target_id, title: pin.label } });
    } else {
      bus.emit('folderSelected', { detail: { folderId: pin.target_id, name: pin.label } });
    }
  };
  
  return item;
}

/**
 * Truncate text to max length
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Load collapsed state from localStorage
 */
function loadCollapsedState() {
  try {
    const saved = localStorage.getItem('navigator_collapsed_sections');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Save collapsed state to localStorage
 */
function saveCollapsedState() {
  try {
    localStorage.setItem('navigator_collapsed_sections', JSON.stringify(collapsedSections));
  } catch (error) {
    console.error('Error saving collapsed state:', error);
  }
}

/**
 * Update Top Hits based on search results
 */
async function updateTopHitsFromSearch(searchData) {
  isSearchActive = true;
  const { query, results, documentScores } = searchData;
  
  // Fetch all documents to match against
  try {
    const response = await fetch(`${BACKEND_URL}/documents`);
    const allDocs = await response.json();
    
    // Create a map of document scores from search results
    const docScoreMap = new Map();
    
    // Handle new format with document_scores
    if (documentScores) {
      Object.entries(documentScores).forEach(([docId, score]) => {
        docScoreMap.set(docId, score);
      });
    }
    
    // Also extract from results array if available
    if (Array.isArray(results)) {
      results.forEach(result => {
        if (result.doc_id && result.score) {
          const currentScore = docScoreMap.get(result.doc_id) || 0;
          docScoreMap.set(result.doc_id, Math.max(currentScore, result.score));
        }
      });
    }
    
    // Helper function for fuzzy matching
    const fuzzyMatch = (text, query) => {
      const textLower = text.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Direct substring match
      if (textLower.includes(queryLower)) return true;
      
      // Check if query matches word boundaries (e.g., "pillar" matches "pillars")
      const words = textLower.split(/[\s_.-]+/);
      for (const word of words) {
        if (word.startsWith(queryLower) || queryLower.startsWith(word)) {
          return true;
        }
      }
      
      // Fuzzy character matching (allows for minor typos)
      let queryIndex = 0;
      for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
        if (textLower[i] === queryLower[queryIndex]) {
          queryIndex++;
        }
      }
      return queryIndex === queryLower.length;
    };
    
    // Score documents based on title matching and semantic search
    const scoredDocs = allDocs.map(doc => {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Title matching (primary scoring) with fuzzy logic
      if (fuzzyMatch(doc.title, query)) {
        // Exact match gets highest score
        if (titleLower === queryLower) {
          score += 1.0;
        } else if (titleLower.startsWith(queryLower)) {
          score += 0.9;
        } else if (titleLower.includes(queryLower)) {
          // Direct substring match
          const position = titleLower.indexOf(queryLower);
          const matchRatio = queryLower.length / titleLower.length;
          score += 0.7 * matchRatio * (1 - position / titleLower.length);
        } else {
          // Word boundary or fuzzy match
          const words = titleLower.split(/[\s_.-]+/);
          for (const word of words) {
            if (word.startsWith(queryLower)) {
              score += 0.6;
              break;
            } else if (queryLower.startsWith(word)) {
              score += 0.5;
              break;
            }
          }
          // If still no score, give fuzzy match a lower score
          if (score === 0) {
            score += 0.3;
          }
        }
      }
      
      // Add semantic search score if available
      const semanticScore = docScoreMap.get(doc.id) || 0;
      score += semanticScore * 0.5; // Weight semantic score at 50%
      
      return {
        ...doc,
        search_score: score
      };
    });
    
    // Filter and sort by score
    const newTopHits = scoredDocs
      .filter(doc => doc.search_score > 0)
      .sort((a, b) => b.search_score - a.search_score)
      .slice(0, 6);
    
    // If no results found, keep the last valid search results
    if (newTopHits.length === 0 && lastValidSearchHits.length > 0) {
      console.log('No new matches, keeping last valid search results');
      topHits = lastValidSearchHits;
    } else if (newTopHits.length > 0) {
      // Store as last valid results
      lastValidSearchHits = newTopHits;
      topHits = newTopHits;
      console.log(`Updated Top Hits with ${topHits.length} search results`);
    } else {
      // No results at all
      topHits = [];
      console.log('No matching documents found');
    }
    
    updateTopHitsSection();
    
  } catch (error) {
    console.error('Error updating Top Hits from search:', error);
  }
}

/**
 * Restore original engagement-based Top Hits
 */
function restoreOriginalTopHits() {
  isSearchActive = false;
  topHits = [...originalTopHits];
  lastValidSearchHits = []; // Clear last search results
  console.log(`Restored ${topHits.length} original Top Hits`);
  updateTopHitsSection();
}

/**
 * Update only the Top Hits section without re-rendering entire sidebar
 */
function updateTopHitsSection() {
  const container = document.getElementById('file-system-sidebar');
  if (!container) return;
  
  // Find existing Top Hits section
  const sections = container.children;
  let topHitsHeaderIndex = -1;
  let topHitsContentIndex = -1;
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.textContent && section.textContent.includes('Top Hits')) {
      topHitsHeaderIndex = i;
      topHitsContentIndex = i + 1;
      break;
    }
  }
  
  if (topHitsHeaderIndex === -1) {
    console.warn('Top Hits section not found');
    return;
  }
  
  // Remove old header and content
  const oldHeader = sections[topHitsHeaderIndex];
  const oldContent = sections[topHitsContentIndex];
  
  // Create new section
  const section = createSection('Top Hits', '▲', topHits.length);
  
  // Populate content
  if (topHits.length === 0) {
    section.content.innerHTML = '<div style="padding: 8px 12px; font-size: 11px; color: #64748b; font-style: italic;">No matching documents</div>';
  } else {
    topHits.forEach(hit => {
      const scoreLabel = isSearchActive 
        ? `${(hit.search_score * 100).toFixed(0)}%`
        : `${(hit.engagement_score * 100).toFixed(0)}%`;
      
      const item = createDocumentItem(hit, {
        showScore: true,
        scoreLabel: scoreLabel
      });
      section.content.appendChild(item);
    });
  }
  
  // Replace in DOM
  container.replaceChild(section.header, oldHeader);
  container.replaceChild(section.content, oldContent);
}

