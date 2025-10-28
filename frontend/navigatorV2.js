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
let pinnedFolders = [];
let collapsedSections = loadCollapsedState();

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
    console.log(`Loaded ${topHits.length} top hits`);
  } catch (error) {
    console.error('Error loading top hits:', error);
    topHits = [];
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
  
  const iconEl = document.createElement('span');
  iconEl.textContent = '▫';
  iconEl.style.cssText = 'font-size: 12px; color: #9a9a9a;';
  
  const titleEl = document.createElement('span');
  titleEl.textContent = truncateText(doc.title, 25);
  titleEl.style.cssText = 'font-size: 11px; color: #e6e6e6; flex: 1;';
  
  item.appendChild(iconEl);
  item.appendChild(titleEl);
  
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
  
  const iconEl = document.createElement('span');
  iconEl.textContent = pin.type === 'document' ? '▫' : '■';
  iconEl.style.cssText = 'font-size: 12px; color: #9a9a9a;';
  
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

