/**
 * Dynamic Folders Panel for Loom Lite v3.2
 * Displays semantic folders with auto-sort and saved views
 * 
 * v3.2-t02: Solar System Pane Integration
 */

import { bus } from './eventBus.js';

// Configuration
const BACKEND_URL = 'https://loomlite-production.up.railway.app';

// Global state
let folders = [];
let savedViews = [];
let currentSortMode = loadFromStorage('sortMode', 'auto');
let currentQuery = '';
let expandedFolders = new Set(loadFromStorage('expandedFolders', []));

/**
 * Load state from localStorage
 */
function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(`loomlite_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Save state to localStorage
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(`loomlite_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

/**
 * Initialize Dynamic Folders Panel
 */
export async function initDynamicFoldersPanel(container) {
  console.log('Initializing Dynamic Folders Panel...');
  
  if (!container) {
    console.warn('Container element not provided');
    return;
  }
  
  // Render panel structure
  renderPanelStructure(container);
  
  // Load saved views
  await loadSavedViews();
  
  // Load folders
  await loadFolders();
  
  console.log('Dynamic Folders Panel initialized');
}

/**
 * Render panel structure with saved views and folders sections
 */
function renderPanelStructure(container) {
  const panel = document.createElement('div');
  panel.id = 'dynamic-folders-panel';
  panel.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  `;
  
  // Saved Views Section
  const savedViewsSection = document.createElement('div');
  savedViewsSection.id = 'saved-views-section';
  savedViewsSection.style.cssText = `
    background: #1e293b;
    border-bottom: 1px solid #334155;
    padding: 12px;
  `;
  
  const savedViewsHeader = document.createElement('div');
  savedViewsHeader.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  `;
  
  const savedViewsTitle = document.createElement('div');
  savedViewsTitle.textContent = '📌 Saved Views';
  savedViewsTitle.style.cssText = `
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  
  const pinButton = document.createElement('button');
  pinButton.id = 'pin-current-view-btn';
  pinButton.textContent = '+ Pin';
  pinButton.style.cssText = `
    background: #3b82f6;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.2s;
  `;
  pinButton.onmouseover = () => pinButton.style.background = '#2563eb';
  pinButton.onmouseout = () => pinButton.style.background = '#3b82f6';
  pinButton.onclick = () => handlePinCurrentView();
  
  savedViewsHeader.appendChild(savedViewsTitle);
  savedViewsHeader.appendChild(pinButton);
  
  const savedViewsList = document.createElement('div');
  savedViewsList.id = 'saved-views-list';
  savedViewsList.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
  
  savedViewsSection.appendChild(savedViewsHeader);
  savedViewsSection.appendChild(savedViewsList);
  
  // Search Bar Section
  const searchSection = document.createElement('div');
  searchSection.id = 'search-section';
  searchSection.style.cssText = `
    background: #1e293b;
    border-bottom: 1px solid #334155;
    padding: 12px;
  `;
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'folder-search-input';
  searchInput.placeholder = 'Search folders and documents...';
  searchInput.style.cssText = `
    width: 100%;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #334155;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    transition: border-color 0.2s;
  `;
  searchInput.onfocus = () => searchInput.style.borderColor = '#3b82f6';
  searchInput.onblur = () => searchInput.style.borderColor = '#334155';
  
  // Debounced search handler
  let searchTimeout;
  searchInput.oninput = (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      handleSearch(e.target.value);
    }, 300); // 300ms debounce
  };
  
  searchSection.appendChild(searchInput);
  
  // Sort Controls Section
  const sortSection = document.createElement('div');
  sortSection.id = 'sort-controls-section';
  sortSection.style.cssText = `
    background: #1e293b;
    border-bottom: 1px solid #334155;
    padding: 12px;
  `;
  
  const sortLabel = document.createElement('label');
  sortLabel.textContent = 'Sort Mode:';
  sortLabel.style.cssText = `
    font-size: 11px;
    color: #94a3b8;
    margin-right: 8px;
  `;
  
  const sortSelect = document.createElement('select');
  sortSelect.id = 'sort-mode-select';
  sortSelect.style.cssText = `
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #334155;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  `;
  
  const sortOptions = [
    { value: 'auto', label: 'Auto (Semantic)' },
    { value: 'alphabetical', label: 'Alphabetical' },
    { value: 'recency', label: 'Recent First' }
  ];
  
  sortOptions.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === currentSortMode) {
      option.selected = true;
    }
    sortSelect.appendChild(option);
  });
  
  sortSelect.onchange = (e) => handleSortModeChange(e.target.value);
  
  sortSection.appendChild(sortLabel);
  sortSection.appendChild(sortSelect);
  
  // Folders Section
  const foldersSection = document.createElement('div');
  foldersSection.id = 'folders-section';
  foldersSection.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  `;
  
  const foldersList = document.createElement('div');
  foldersList.id = 'folders-list';
  
  foldersSection.appendChild(foldersList);
  
  // Assemble panel
  panel.appendChild(savedViewsSection);
  panel.appendChild(searchSection);
  panel.appendChild(sortSection);
  panel.appendChild(foldersSection);
  
  container.appendChild(panel);
}

/**
 * Load saved views from backend
 */
async function loadSavedViews() {
  try {
    const response = await fetch(`${BACKEND_URL}/saved-views`);
    const data = await response.json();
    savedViews = data.views || [];
    renderSavedViews();
  } catch (error) {
    console.error('Error loading saved views:', error);
  }
}

/**
 * Render saved views list
 */
function renderSavedViews() {
  const list = document.getElementById('saved-views-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (savedViews.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.textContent = 'No saved views yet';
    emptyMsg.style.cssText = `
      font-size: 11px;
      color: #64748b;
      font-style: italic;
      padding: 4px 0;
    `;
    list.appendChild(emptyMsg);
    return;
  }
  
  savedViews.forEach(view => {
    const viewItem = document.createElement('div');
    viewItem.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    viewItem.onmouseover = () => viewItem.style.background = '#1e293b';
    viewItem.onmouseout = () => viewItem.style.background = '#0f172a';
    viewItem.onclick = () => handleLoadSavedView(view);
    
    const viewInfo = document.createElement('div');
    viewInfo.style.cssText = `
      flex: 1;
      overflow: hidden;
    `;
    
    const viewName = document.createElement('div');
    viewName.textContent = view.view_name;
    viewName.style.cssText = `
      font-size: 12px;
      color: #e2e8f0;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    
    const viewQuery = document.createElement('div');
    viewQuery.textContent = `"${view.query}" • ${view.sort_mode}`;
    viewQuery.style.cssText = `
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    `;
    
    viewInfo.appendChild(viewName);
    viewInfo.appendChild(viewQuery);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.cssText = `
      background: transparent;
      color: #64748b;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    `;
    deleteBtn.onmouseover = () => deleteBtn.style.color = '#ef4444';
    deleteBtn.onmouseout = () => deleteBtn.style.color = '#64748b';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      handleDeleteSavedView(view.id);
    };
    
    viewItem.appendChild(viewInfo);
    viewItem.appendChild(deleteBtn);
    
    list.appendChild(viewItem);
  });
}

/**
 * Load folders from backend
 */
async function loadFolders(query = '', sortMode = 'auto') {
  try {
    // Show skeleton loader
    showSkeletonLoader();
    
    let url = `${BACKEND_URL}/semantic-folders?sort=${sortMode}`;
    if (query) {
      url += `&query=${encodeURIComponent(query)}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    folders = data.folders || [];
    currentSortMode = sortMode;
    currentQuery = query;
    
    // Persist sort mode to localStorage
    saveToStorage('sortMode', sortMode);
    
    renderFolders();
  } catch (error) {
    console.error('Error loading folders:', error);
    renderFolders(); // Show empty state on error
  }
}

/**
 * Show skeleton loader while folders are loading
 */
function showSkeletonLoader() {
  const list = document.getElementById('folders-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  // Create 3 skeleton items
  for (let i = 0; i < 3; i++) {
    const skeleton = document.createElement('div');
    skeleton.style.cssText = `
      margin-bottom: 8px;
      padding: 8px;
      background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      height: 40px;
    `;
    list.appendChild(skeleton);
  }
  
  // Add shimmer animation if not already added
  if (!document.getElementById('skeleton-animations')) {
    const style = document.createElement('style');
    style.id = 'skeleton-animations';
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Render folders list
 */
function renderFolders() {
  const list = document.getElementById('folders-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (folders.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.textContent = 'No folders found';
    emptyMsg.style.cssText = `
      font-size: 12px;
      color: #64748b;
      font-style: italic;
      padding: 8px 0;
    `;
    list.appendChild(emptyMsg);
    return;
  }
  
  folders.forEach(folder => {
    const folderItem = createFolderItem(folder);
    list.appendChild(folderItem);
  });
}

/**
 * Create folder item element
 */
function createFolderItem(folder) {
  const isExpanded = expandedFolders.has(folder.name);
  
  const folderContainer = document.createElement('div');
  folderContainer.style.cssText = `
    margin-bottom: 8px;
  `;
  
  // Folder header
  const folderHeader = document.createElement('div');
  folderHeader.style.cssText = `
    display: flex;
    align-items: center;
    padding: 8px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  `;
  folderHeader.onmouseover = () => folderHeader.style.background = '#334155';
  folderHeader.onmouseout = () => folderHeader.style.background = '#1e293b';
  folderHeader.onclick = () => toggleFolder(folder.name);
  
  const expandIcon = document.createElement('span');
  expandIcon.textContent = isExpanded ? '▼' : '▶';
  expandIcon.style.cssText = `
    font-size: 10px;
    color: #64748b;
    margin-right: 8px;
    transition: transform 0.2s;
  `;
  
  const folderIcon = document.createElement('span');
  folderIcon.textContent = '📁';
  folderIcon.style.cssText = `
    margin-right: 8px;
  `;
  
  const folderName = document.createElement('span');
  folderName.textContent = folder.name;
  folderName.style.cssText = `
    flex: 1;
    font-size: 13px;
    color: #e2e8f0;
    font-weight: 500;
  `;
  
  const docCount = document.createElement('span');
  docCount.textContent = folder.items.length;
  docCount.style.cssText = `
    font-size: 11px;
    color: #64748b;
    background: #0f172a;
    padding: 2px 6px;
    border-radius: 10px;
  `;
  
  folderHeader.appendChild(expandIcon);
  folderHeader.appendChild(folderIcon);
  folderHeader.appendChild(folderName);
  folderHeader.appendChild(docCount);
  
  folderContainer.appendChild(folderHeader);
  
  // Folder contents (documents)
  if (isExpanded && folder.items.length > 0) {
    const folderContents = document.createElement('div');
    folderContents.style.cssText = `
      margin-top: 4px;
      padding-left: 24px;
      animation: slideDown 0.2s ease-out;
      overflow: hidden;
    `;
    
    // Add CSS animation keyframes if not already added
    if (!document.getElementById('folder-animations')) {
      const style = document.createElement('style');
      style.id = 'folder-animations';
      style.textContent = `
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 1000px;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    folder.items.forEach(item => {
      const docItem = document.createElement('div');
      docItem.style.cssText = `
        padding: 6px 8px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 4px;
        margin-bottom: 4px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      docItem.onmouseover = () => docItem.style.background = '#1e293b';
      docItem.onmouseout = () => docItem.style.background = '#0f172a';
      docItem.onclick = () => handleDocumentClick(item, folder);
      
      const docTitle = document.createElement('div');
      docTitle.textContent = item.title;
      docTitle.style.cssText = `
        font-size: 12px;
        color: #e2e8f0;
        margin-bottom: 2px;
      `;
      
      const docMeta = document.createElement('div');
      docMeta.textContent = `Score: ${item.score} • ${item.concept_type || 'Document'}`;
      docMeta.style.cssText = `
        font-size: 10px;
        color: #64748b;
      `;
      
      docItem.appendChild(docTitle);
      docItem.appendChild(docMeta);
      
      folderContents.appendChild(docItem);
    });
    
    folderContainer.appendChild(folderContents);
  }
  
  return folderContainer;
}

/**
 * Toggle folder expansion
 */
function toggleFolder(folderName) {
  if (expandedFolders.has(folderName)) {
    expandedFolders.delete(folderName);
  } else {
    expandedFolders.add(folderName);
  }
  
  // Persist expanded folders to localStorage
  saveToStorage('expandedFolders', Array.from(expandedFolders));
  
  renderFolders();
}

/**
 * Handle document click
 */
function handleDocumentClick(item, folder) {
  console.log('Document clicked:', item.title);
  
  // Emit folderSelected event (similar to conceptSelected)
  bus.emit('folderSelected', {
    type: 'folder',
    folder: folder.name,
    document: item,
    doc_id: item.doc_id,
    title: item.title,
    score: item.score
  });
  
  // Also emit documentFocus for compatibility
  bus.emit('documentFocus', {
    doc_id: item.doc_id,
    title: item.title
  });
}

/**
 * Handle search input
 */
async function handleSearch(query) {
  console.log('Search query:', query);
  await loadFolders(query, currentSortMode);
}

/**
 * Handle sort mode change
 */
async function handleSortModeChange(sortMode) {
  console.log('Sort mode changed:', sortMode);
  await loadFolders(currentQuery, sortMode);
}

/**
 * Handle pin current view
 */
async function handlePinCurrentView() {
  const viewName = prompt('Enter a name for this view:');
  if (!viewName) return;
  
  try {
    const response = await fetch(`${BACKEND_URL}/saved-views`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        view_name: viewName,
        query: currentQuery,
        sort_mode: currentSortMode
      })
    });
    
    if (response.ok) {
      console.log('View saved successfully');
      await loadSavedViews();
    } else {
      console.error('Failed to save view');
    }
  } catch (error) {
    console.error('Error saving view:', error);
  }
}

/**
 * Handle load saved view
 */
async function handleLoadSavedView(view) {
  console.log('Loading saved view:', view.view_name);
  await loadFolders(view.query, view.sort_mode);
  
  // Update sort select
  const sortSelect = document.getElementById('sort-mode-select');
  if (sortSelect) {
    sortSelect.value = view.sort_mode;
  }
}

/**
 * Handle delete saved view
 */
async function handleDeleteSavedView(viewId) {
  if (!confirm('Delete this saved view?')) return;
  
  try {
    const response = await fetch(`${BACKEND_URL}/saved-views/${viewId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      console.log('View deleted successfully');
      await loadSavedViews();
    } else {
      console.error('Failed to delete view');
    }
  } catch (error) {
    console.error('Error deleting view:', error);
  }
}

// Export for use in other modules
export { loadFolders, loadSavedViews };

