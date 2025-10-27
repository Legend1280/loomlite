/**
 * File System Sidebar for LoomLite v4.0
 * 4-Tier Architecture: Top Hits → Pinned → Standard → Semantic
 */

import { bus } from './eventBus.js';

const BACKEND_URL = 'https://loomlite-production.up.railway.app';

// Global state
let topHits = [];
let pinnedFolders = [];
let standardFolders = [];
let semanticFolders = [];
let collapsedSections = loadCollapsedState();

/**
 * Initialize file system sidebar
 */
export function initFileSystemSidebar() {
  console.log('🗂️ Initializing File System Sidebar v4.0...');
  
  const container = document.getElementById('file-system-sidebar');
  if (!container) {
    console.warn('⚠️ File system sidebar container not found');
    return;
  }
  
  // Load all tiers
  loadAllTiers();
  
  // Listen for document upload events to refresh
  bus.on('documentUploaded', () => {
    console.log('📄 Document uploaded, refreshing sidebar...');
    loadAllTiers();
  });
}

/**
 * Load all sidebar tiers
 */
async function loadAllTiers() {
  try {
    await Promise.all([
      loadTopHits(),
      loadPinnedFolders(),
      loadStandardFolders(),
      loadSemanticFolders()
    ]);
    
    renderSidebar();
  } catch (error) {
    console.error('❌ Error loading sidebar tiers:', error);
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
    console.log(`✅ Loaded ${topHits.length} top hits`);
  } catch (error) {
    console.error('❌ Error loading top hits:', error);
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
    console.log(`✅ Loaded ${pinnedFolders.length} pinned folders`);
  } catch (error) {
    console.error('❌ Error loading pinned folders:', error);
    pinnedFolders = [];
  }
}

/**
 * Load standard folders
 */
async function loadStandardFolders() {
  try {
    // Load multiple standard folder types
    const [recentRes, byTypeRes, byDateRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/files/folders/recent`),
      fetch(`${BACKEND_URL}/api/files/folders/by-type`),
      fetch(`${BACKEND_URL}/api/files/folders/by-date`)
    ]);
    
    const recent = await recentRes.json();
    const byType = await byTypeRes.json();
    const byDate = await byDateRes.json();
    
    standardFolders = [
      recent,
      ...(byType.folders || []),
      ...(byDate.folders || [])
    ];
    
    console.log(`✅ Loaded ${standardFolders.length} standard folders`);
  } catch (error) {
    console.error('❌ Error loading standard folders:', error);
    standardFolders = [];
  }
}

/**
 * Load semantic folders
 */
async function loadSemanticFolders() {
  try {
    const categories = ['projects', 'concepts', 'financial', 'research', 'ai_tech'];
    
    const responses = await Promise.all(
      categories.map(cat => fetch(`${BACKEND_URL}/api/files/semantic/${cat}`))
    );
    
    const folders = await Promise.all(responses.map(r => r.json()));
    
    // Filter out empty folders
    semanticFolders = folders.filter(f => f.items && f.items.length > 0);
    
    console.log(`✅ Loaded ${semanticFolders.length} semantic folders`);
  } catch (error) {
    console.error('❌ Error loading semantic folders:', error);
    semanticFolders = [];
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
    background: #0f172a;
    border-right: 1px solid #1e293b;
    overflow-y: auto;
    overflow-x: hidden;
  `;
  
  // Render each tier
  renderTopHits(container);
  renderPinnedFolders(container);
  renderStandardFolders(container);
  renderSemanticFolders(container);
}

/**
 * Render Top Hits section
 */
function renderTopHits(container) {
  const section = createSection('Top Hits', '🔥', topHits.length);
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
  const section = createSection('Pinned', '📌', pinnedFolders.length);
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
 * Render Standard Folders section
 */
function renderStandardFolders(container) {
  const section = createSection('Standard Folders', '📁', standardFolders.length);
  container.appendChild(section.header);
  container.appendChild(section.content);
  
  if (standardFolders.length === 0) {
    section.content.innerHTML = '<div style="padding: 8px 12px; font-size: 11px; color: #64748b; font-style: italic;">No folders</div>';
    return;
  }
  
  standardFolders.forEach(folder => {
    const folderEl = createFolderItem(folder);
    section.content.appendChild(folderEl);
  });
}

/**
 * Render Semantic Folders section
 */
function renderSemanticFolders(container) {
  const section = createSection('Semantic Folders', '🧠', semanticFolders.length);
  container.appendChild(section.header);
  container.appendChild(section.content);
  
  if (semanticFolders.length === 0) {
    section.content.innerHTML = '<div style="padding: 8px 12px; font-size: 11px; color: #64748b; font-style: italic;">No semantic folders</div>';
    return;
  }
  
  semanticFolders.forEach(folder => {
    const folderEl = createFolderItem(folder, { showConfidence: true });
    section.content.appendChild(folderEl);
  });
}

/**
 * Create a collapsible section
 */
function createSection(title, icon, count) {
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');
  const isCollapsed = collapsedSections[sectionId] || false;
  
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    cursor: pointer;
    user-select: none;
  `;
  
  const leftSide = document.createElement('div');
  leftSide.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  
  const iconEl = document.createElement('span');
  iconEl.textContent = icon;
  iconEl.style.fontSize = '14px';
  
  const titleEl = document.createElement('span');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-size: 12px; font-weight: 600; color: #e2e8f0;';
  
  const countBadge = document.createElement('span');
  countBadge.textContent = count;
  countBadge.style.cssText = `
    font-size: 10px;
    color: #94a3b8;
    background: #334155;
    padding: 2px 6px;
    border-radius: 10px;
  `;
  
  leftSide.appendChild(iconEl);
  leftSide.appendChild(titleEl);
  leftSide.appendChild(countBadge);
  
  const chevron = document.createElement('span');
  chevron.textContent = isCollapsed ? '›' : '⌄';
  chevron.style.cssText = 'font-size: 14px; color: #94a3b8; transition: transform 0.2s;';
  
  header.appendChild(leftSide);
  header.appendChild(chevron);
  
  const content = document.createElement('div');
  content.style.cssText = `
    display: ${isCollapsed ? 'none' : 'block'};
    animation: ${isCollapsed ? 'none' : 'slideDown 0.2s ease-out'};
  `;
  
  header.onclick = () => {
    const newState = !isCollapsed;
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
    transition: background 0.2s;
    border-bottom: 1px solid #1e293b;
  `;
  
  item.onmouseover = () => item.style.background = '#1e293b';
  item.onmouseout = () => item.style.background = 'transparent';
  
  item.onclick = () => {
    bus.emit('documentSelected', { detail: { docId: doc.id, title: doc.title } });
  };
  
  // Icon
  const icon = document.createElement('span');
  icon.textContent = '📄';
  icon.style.fontSize = '14px';
  
  // Title
  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'flex: 1; overflow: hidden;';
  
  const title = document.createElement('div');
  title.textContent = doc.title;
  title.style.cssText = `
    font-size: 11px;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  
  titleEl.appendChild(title);
  
  // Score badge (optional)
  if (options.showScore && options.scoreLabel) {
    const score = document.createElement('span');
    score.textContent = options.scoreLabel;
    score.style.cssText = `
      font-size: 9px;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      padding: 2px 4px;
      border-radius: 4px;
    `;
    item.appendChild(icon);
    item.appendChild(titleEl);
    item.appendChild(score);
  } else {
    item.appendChild(icon);
    item.appendChild(titleEl);
  }
  
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
    transition: background 0.2s;
    border-bottom: 1px solid #1e293b;
  `;
  
  item.onmouseover = () => item.style.background = '#1e293b';
  item.onmouseout = () => item.style.background = 'transparent';
  
  item.onclick = () => {
    if (pin.type === 'document') {
      bus.emit('documentSelected', { detail: { docId: pin.target_id, title: pin.label } });
    } else {
      bus.emit('folderSelected', { detail: { folderId: pin.target_id, name: pin.label } });
    }
  };
  
  const icon = document.createElement('span');
  icon.textContent = pin.type === 'document' ? '📄' : '📁';
  icon.style.fontSize = '14px';
  
  const label = document.createElement('div');
  label.textContent = pin.label;
  label.style.cssText = `
    flex: 1;
    font-size: 11px;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  
  item.appendChild(icon);
  item.appendChild(label);
  
  return item;
}

/**
 * Create a folder item
 */
function createFolderItem(folder, options = {}) {
  const folderId = folder.folder_name.toLowerCase().replace(/\s+/g, '-');
  const isExpanded = !collapsedSections[`folder-${folderId}`];
  
  const container = document.createElement('div');
  
  // Folder header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.2s;
    border-bottom: 1px solid #1e293b;
  `;
  
  header.onmouseover = () => header.style.background = '#1e293b';
  header.onmouseout = () => header.style.background = 'transparent';
  
  const chevron = document.createElement('span');
  chevron.textContent = isExpanded ? '⌄' : '›';
  chevron.style.cssText = 'font-size: 12px; color: #94a3b8;';
  
  const icon = document.createElement('span');
  icon.textContent = '📁';
  icon.style.fontSize = '14px';
  
  const name = document.createElement('div');
  name.textContent = folder.folder_name;
  name.style.cssText = `
    flex: 1;
    font-size: 11px;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  
  const count = document.createElement('span');
  count.textContent = folder.items?.length || 0;
  count.style.cssText = `
    font-size: 9px;
    color: #94a3b8;
    background: #334155;
    padding: 2px 5px;
    border-radius: 8px;
  `;
  
  header.appendChild(chevron);
  header.appendChild(icon);
  header.appendChild(name);
  header.appendChild(count);
  
  // Folder content
  const content = document.createElement('div');
  content.style.cssText = `
    display: ${isExpanded ? 'block' : 'none'};
    padding-left: 24px;
    animation: ${isExpanded ? 'slideDown 0.2s ease-out' : 'none'};
  `;
  
  (folder.items || []).forEach(doc => {
    const docItem = createDocumentItem(doc, options);
    content.appendChild(docItem);
  });
  
  header.onclick = () => {
    const newState = !isExpanded;
    collapsedSections[`folder-${folderId}`] = !newState;
    saveCollapsedState();
    
    content.style.display = newState ? 'block' : 'none';
    chevron.textContent = newState ? '⌄' : '›';
  };
  
  container.appendChild(header);
  container.appendChild(content);
  
  return container;
}

/**
 * Load collapsed state from localStorage
 */
function loadCollapsedState() {
  try {
    const stored = localStorage.getItem('loomlite_collapsedSections');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('⚠️ Error loading collapsed state:', error);
    return {};
  }
}

/**
 * Save collapsed state to localStorage
 */
function saveCollapsedState() {
  try {
    localStorage.setItem('loomlite_collapsedSections', JSON.stringify(collapsedSections));
  } catch (error) {
    console.warn('⚠️ Error saving collapsed state:', error);
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      max-height: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      max-height: 2000px;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

