/**
 * Navigator Dynamic Folder Pane
 * Renders folders based on current mode (Standard / Meaning / Time)
 * 
 * Part of Dynamic Navigator (v1.6)
 */

import { bus } from './eventBus.js';

const BACKEND_URL = 'https://loomlite-production.up.railway.app';

// State
let currentMode = 'meaning';
let foldersData = {
  standard: null,
  meaning: null,
  time: null
};
let container = null;
let collapsedFolders = loadCollapsedState();

/**
 * Initialize Dynamic Folder Pane
 */
export function initDynamicPane(parentContainer) {
  container = parentContainer;
  
  // Listen for mode changes
  bus.on('navigatorModeChanged', ({ mode }) => {
    currentMode = mode;
    renderFolders();
  });
  
  // Load initial data for all modes (cache)
  loadAllModes();
}

/**
 * Load data for all modes
 */
async function loadAllModes() {
  try {
    await Promise.all([
      loadStandardMode(),
      loadMeaningMode(),
      loadTimeMode()
    ]);
    
    // Render current mode
    renderFolders();
  } catch (error) {
    console.error('Error loading folder modes:', error);
  }
}

/**
 * Load Standard mode folders
 */
async function loadStandardMode() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/folders/standard`);
    const data = await response.json();
    foldersData.standard = data.folders || [];
    console.log(`Loaded ${foldersData.standard.length} standard folders`);
  } catch (error) {
    console.error('Error loading standard folders:', error);
    foldersData.standard = [];
  }
}

/**
 * Load Meaning mode folders (semantic)
 */
async function loadMeaningMode() {
  try {
    const categories = ['projects', 'concepts', 'financial', 'research', 'ai_tech'];
    
    const responses = await Promise.all(
      categories.map(cat => fetch(`${BACKEND_URL}/api/files/semantic/${cat}`))
    );
    
    const folders = await Promise.all(responses.map(r => r.json()));
    
    // Format for Dynamic Pane
    foldersData.meaning = folders
      .filter(f => f.items && f.items.length > 0)
      .map(f => ({
        id: f.category,
        title: f.folder_name,
        docCount: f.items.length,
        items: f.items
      }));
    
    console.log(`Loaded ${foldersData.meaning.length} meaning folders`);
  } catch (error) {
    console.error('Error loading meaning folders:', error);
    foldersData.meaning = [];
  }
}

/**
 * Load Time mode folders
 */
async function loadTimeMode() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/folders/temporal`);
    const data = await response.json();
    foldersData.time = data.folders || [];
    console.log(`Loaded ${foldersData.time.length} time folders`);
  } catch (error) {
    console.error('Error loading time folders:', error);
    foldersData.time = [];
  }
}

/**
 * Render folders for current mode
 */
function renderFolders() {
  if (!container) return;
  
  // Clear container
  container.innerHTML = '';
  
  // Get folders for current mode
  const folders = foldersData[currentMode] || [];
  
  if (folders.length === 0) {
    // Show loading or empty state
    const emptyState = document.createElement('div');
    emptyState.style.cssText = `
      padding: 16px 12px;
      font-size: 11px;
      color: #64748b;
      font-style: italic;
      text-align: center;
    `;
    emptyState.textContent = 'Loading folders...';
    container.appendChild(emptyState);
    return;
  }
  
  // Render each folder
  folders.forEach(folder => {
    const folderEl = createFolderItem(folder);
    container.appendChild(folderEl);
  });
}

/**
 * Create folder item with collapsible documents
 */
function createFolderItem(folder) {
  const folderId = `${currentMode}_${folder.id}`;
  const isCollapsed = collapsedFolders[folderId] !== false;  // Default collapsed
  
  const folderContainer = document.createElement('div');
  folderContainer.style.cssText = `
    border-bottom: 1px solid rgba(42, 42, 42, 0.4);
  `;
  
  // Folder header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s ease-in-out;
  `;
  
  header.onmouseover = () => {
    header.style.background = 'rgba(24, 24, 24, 0.5)';
  };
  
  header.onmouseout = () => {
    header.style.background = 'transparent';
  };
  
  // Left side (icon + title + count)
  const leftSide = document.createElement('div');
  leftSide.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  
  const chevron = document.createElement('span');
  chevron.textContent = isCollapsed ? '›' : '⌄';
  chevron.style.cssText = `
    font-size: 14px;
    color: #9a9a9a;
    transition: transform 0.2s ease-in-out;
  `;
  
  const title = document.createElement('span');
  title.textContent = folder.title;
  title.style.cssText = `
    font-size: 12px;
    font-weight: 500;
    color: #e6e6e6;
  `;
  
  const countBadge = document.createElement('span');
  countBadge.textContent = folder.docCount;
  countBadge.style.cssText = `
    font-size: 10px;
    color: #9a9a9a;
    background: #181818;
    padding: 2px 6px;
    border-radius: 10px;
  `;
  
  leftSide.appendChild(chevron);
  leftSide.appendChild(title);
  leftSide.appendChild(countBadge);
  
  header.appendChild(leftSide);
  
  // Folder content (documents)
  const content = document.createElement('div');
  content.style.cssText = `
    display: ${isCollapsed ? 'none' : 'block'};
    transition: all 0.2s ease-in-out;
  `;
  
  // Render documents
  (folder.items || []).forEach(doc => {
    const docItem = createDocumentItem(doc);
    content.appendChild(docItem);
  });
  
  // Toggle collapse
  header.onclick = () => {
    const newState = !isCollapsed;
    collapsedFolders[folderId] = !newState;  // Store opposite (false = expanded)
    saveCollapsedState();
    
    content.style.display = newState ? 'none' : 'block';
    chevron.textContent = newState ? '›' : '⌄';
  };
  
  folderContainer.appendChild(header);
  folderContainer.appendChild(content);
  
  return folderContainer;
}

/**
 * Create document item
 */
function createDocumentItem(doc) {
  const item = document.createElement('div');
  item.setAttribute('data-doc-id', doc.id);
  item.classList.add('file-item');
  item.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px 8px 32px;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    border-left: 2px solid transparent;
  `;
  
  // Document icon (SVG)
  const icon = document.createElement('div');
  icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>';
  icon.style.cssText = 'display: flex; align-items: center; color: #9a9a9a;';
  
  // Document title
  const titleEl = document.createElement('span');
  titleEl.textContent = truncateText(doc.title, 30);
  titleEl.style.cssText = `
    font-size: 11px;
    color: #e6e6e6;
    flex: 1;
  `;
  
  item.appendChild(icon);
  item.appendChild(titleEl);
  
  // Hover effects
  item.onmouseover = () => {
    item.style.background = 'rgba(24, 24, 24, 0.5)';
    item.style.borderLeft = '2px solid #fad643';
  };
  
  item.onmouseout = () => {
    item.style.background = 'transparent';
    item.style.borderLeft = '2px solid transparent';
  };
  
  // Click handler
  item.onclick = () => {
    console.log(`Document selected: ${doc.title} (${doc.id})`);
    
    // Emit documentSelected event
    bus.emit('documentSelected', { 
      detail: { 
        docId: doc.id, 
        title: doc.title 
      } 
    });
    
    // Also emit documentFocus for views
    bus.emit('documentFocus', { docId: doc.id });
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
    const saved = localStorage.getItem('navigator_collapsed_folders');
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
    localStorage.setItem('navigator_collapsed_folders', JSON.stringify(collapsedFolders));
  } catch (error) {
    console.error('Error saving collapsed state:', error);
  }
}

/**
 * Refresh current mode data
 */
export async function refreshCurrentMode() {
  if (currentMode === 'standard') {
    await loadStandardMode();
  } else if (currentMode === 'meaning') {
    await loadMeaningMode();
  } else if (currentMode === 'time') {
    await loadTimeMode();
  }
  
  renderFolders();
}

