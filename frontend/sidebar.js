/**
 * Sidebar Module for Loom Lite v2.0
 * Manages file navigator sidebar with document list
 * 
 * LOOM-V2-002: File Navigator Sidebar Implementation
 */

import { bus, setCurrentDocId } from './eventBus.js';
import { initDynamicFoldersPanel } from './dynamicFoldersPanel.js';

// Global state
let documents = [];
let activeDocId = null;
let isCollapsed = false;

/**
 * Initialize sidebar with file list
 */
export async function initSidebar() {
  console.log('Initializing File Navigator Sidebar...');
  
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) {
    console.warn('Sidebar element not found');
    return;
  }
  
  // Render header
  renderHeader(sidebar);
  
  // Create container for dynamic folders panel
  const dynamicFoldersContainer = document.createElement('div');
  dynamicFoldersContainer.id = 'dynamic-folders-container';
  dynamicFoldersContainer.style.cssText = `
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;
  sidebar.appendChild(dynamicFoldersContainer);
  
  // Initialize dynamic folders panel
  await initDynamicFoldersPanel(dynamicFoldersContainer);
  
  // Note: Original file list is replaced by dynamic folders panel
  // To show both, we could add a toggle or tabs
  
  console.log('File Navigator Sidebar initialized');
}

/**
 * Render sidebar header with collapse button
 * @param {HTMLElement} sidebar - Sidebar container element
 */
function renderHeader(sidebar) {
  const header = document.createElement('div');
  header.id = 'sidebar-header';
  header.style.cssText = `
    background: #1e293b;
    border-bottom: 1px solid #334155;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
  `;
  title.textContent = 'DOCUMENTS';
  
  const collapseBtn = document.createElement('button');
  collapseBtn.id = 'collapse-btn';
  collapseBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  `;
  collapseBtn.textContent = '☰';
  collapseBtn.title = 'Toggle sidebar';
  
  collapseBtn.addEventListener('click', toggleCollapse);
  collapseBtn.addEventListener('mouseenter', () => {
    collapseBtn.style.background = '#334155';
  });
  collapseBtn.addEventListener('mouseleave', () => {
    collapseBtn.style.background = 'transparent';
  });
  
  header.appendChild(title);
  header.appendChild(collapseBtn);
  sidebar.appendChild(header);
}

/**
 * Fetch documents from API and render file list
 * @param {HTMLElement} sidebar - Sidebar container element
 */
async function fetchAndRenderDocuments(sidebar) {
  const startTime = performance.now();
  
  try {
    // Fetch documents from /tree endpoint
    const response = await fetch('https://loomlite-production.up.railway.app/tree');
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }
    
    documents = await response.json();
    console.log(`Fetched ${documents.length} documents`);
    
    // Create file list container
    const fileList = document.createElement('div');
    fileList.id = 'file-list';
    fileList.style.cssText = `
      padding: 8px;
      overflow-y: auto;
      height: calc(100% - 60px);
    `;
    
    // Render each document
    if (documents.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.style.cssText = `
        padding: 16px;
        color: #64748b;
        font-size: 13px;
        text-align: center;
      `;
      emptyMessage.textContent = 'No documents yet. Upload to get started!';
      fileList.appendChild(emptyMessage);
    } else {
      documents.forEach(doc => {
        const fileItem = createFileItem(doc);
        fileList.appendChild(fileItem);
      });
    }
    
    sidebar.appendChild(fileList);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    console.log(`⚡ File list rendered in ${renderTime.toFixed(2)}ms`);
    
    // Check performance target
    if (renderTime > 500) {
      console.warn(`Render time exceeded target (${renderTime.toFixed(2)}ms > 500ms)`);
    }
    
  } catch (error) {
    console.error('Error fetching documents:', error);
    
    // Show error message
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
      padding: 16px;
      color: #ef4444;
      font-size: 13px;
    `;
    errorMessage.textContent = `Error loading documents: ${error.message}`;
    sidebar.appendChild(errorMessage);
  }
}

/**
 * Create file item element
 * @param {Object} doc - Document object
 * @returns {HTMLElement} File item element
 */
function createFileItem(doc) {
  const item = document.createElement('div');
  item.className = 'file-item';
  item.dataset.docId = doc.id;
  item.style.cssText = `
    padding: 12px;
    margin-bottom: 4px;
    background: #334155;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #e2e8f0;
  `;
  
  // Add icon
  const icon = document.createElement('span');
  icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
  icon.style.cssText = 'display: flex; align-items: center; color: #94a3b8;';
  
  // Add title
  const title = document.createElement('span');
  title.className = 'file-title';
  title.textContent = doc.title || doc.id;
  title.style.cssText = `
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  
  item.appendChild(icon);
  item.appendChild(title);
  
  // Add hover effect
  item.addEventListener('mouseenter', () => {
    if (activeDocId !== doc.id) {
      item.style.background = '#475569';
    }
  });
  
  item.addEventListener('mouseleave', () => {
    if (activeDocId !== doc.id) {
      item.style.background = '#334155';
    }
  });
  
  // Add click handler
  item.addEventListener('click', () => {
    handleFileClick(doc);
  });
  
  return item;
}

/**
 * Handle file item click
 * @param {Object} doc - Document object
 */
async function handleFileClick(doc) {
  console.log(`Loading document: ${doc.title || doc.id}`);
  
  // Update active state
  setActiveDocument(doc.id);
  
  // Update breadcrumbs
  updateBreadcrumbs(['Galaxy', doc.title || doc.id]);
  
  // Update state via event bus
  setCurrentDocId(doc.id);
  bus.emit('documentLoaded', { docId: doc.id, title: doc.title });
  
  // Trigger dual visualizer to load this document
  if (window.drawDualVisualizer) {
    await window.drawDualVisualizer(doc.id);
  } else {
    console.error('drawDualVisualizer function not found');
  }
}

/**
 * Set active document and update UI
 * @param {string} docId - Document ID
 */
function setActiveDocument(docId) {
  activeDocId = docId;
  
  // Update all file items
  const fileItems = document.querySelectorAll('.file-item');
  fileItems.forEach(item => {
    if (item.dataset.docId === docId) {
      item.style.background = '#3b82f6';
      item.style.color = 'white';
    } else {
      item.style.background = '#334155';
      item.style.color = '#e2e8f0';
    }
  });
}

/**
 * Update breadcrumbs
 * @param {Array<string>} crumbs - Breadcrumb items
 */
function updateBreadcrumbs(crumbs) {
  const breadcrumbsEl = document.getElementById('breadcrumbs');
  if (!breadcrumbsEl) return;
  
  breadcrumbsEl.innerHTML = '';
  
  crumbs.forEach((crumb, index) => {
    const crumbEl = document.createElement('span');
    crumbEl.className = 'breadcrumb-item';
    crumbEl.textContent = crumb;
    crumbEl.style.cssText = `
      color: #e2e8f0;
      cursor: pointer;
      transition: color 0.2s;
    `;
    
    crumbEl.addEventListener('mouseenter', () => {
      crumbEl.style.color = '#60a5fa';
    });
    
    crumbEl.addEventListener('mouseleave', () => {
      crumbEl.style.color = '#e2e8f0';
    });
    
    // Add click handler for navigation back
    if (index === 0) {
      crumbEl.addEventListener('click', () => {
        // Navigate back to Galaxy view
        activeDocId = null;
        updateBreadcrumbs(['Galaxy']);
        // Clear visualizers or show all documents
      });
    }
    
    breadcrumbsEl.appendChild(crumbEl);
    
    // Add separator
    if (index < crumbs.length - 1) {
      const separator = document.createElement('span');
      separator.className = 'breadcrumb-separator';
      separator.textContent = ' / ';
      separator.style.color = '#475569';
      breadcrumbsEl.appendChild(separator);
    }
  });
}

/**
 * Toggle sidebar collapse state
 */
function toggleCollapse() {
  isCollapsed = !isCollapsed;
  const sidebar = document.getElementById('sidebar');
  
  if (isCollapsed) {
    sidebar.style.width = '3.5rem';
    
    // Hide file titles
    document.querySelectorAll('.file-title').forEach(title => {
      title.style.display = 'none';
    });
    
    // Hide header title
    const headerTitle = document.querySelector('#sidebar-header > div');
    if (headerTitle) headerTitle.style.display = 'none';
    
    // Add tooltips to file items
    document.querySelectorAll('.file-item').forEach(item => {
      const doc = documents.find(d => d.id === item.dataset.docId);
      if (doc) {
        item.title = doc.title || doc.id;
      }
    });
    
    console.log('📌 Sidebar collapsed');
  } else {
    sidebar.style.width = '16rem';
    
    // Show file titles
    document.querySelectorAll('.file-title').forEach(title => {
      title.style.display = 'block';
    });
    
    // Show header title
    const headerTitle = document.querySelector('#sidebar-header > div');
    if (headerTitle) headerTitle.style.display = 'block';
    
    // Remove tooltips
    document.querySelectorAll('.file-item').forEach(item => {
      item.removeAttribute('title');
    });
    
    console.log('📌 Sidebar expanded');
  }
}

/**
 * Get active document ID
 * @returns {string|null} Active document ID
 */
export function getActiveDocId() {
  return activeDocId;
}

/**
 * Get all documents
 * @returns {Array} Documents array
 */
export function getDocuments() {
  return documents;
}

// Listen for documentFocus events to sync active state
bus.on('documentFocus', (event) => {
  const { docId } = event.detail;
  if (docId && docId !== activeDocId) {
    setActiveDocument(docId);
    
    // Update breadcrumbs
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      updateBreadcrumbs(['Galaxy', doc.title || doc.id]);
    }
  }
});

// Export for global access
window.initSidebar = initSidebar;
window.setActiveDocument = setActiveDocument;
window.getActiveDocId = getActiveDocId;

