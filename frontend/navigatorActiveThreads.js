/**
 * Navigator Active Threads
 * Sticky section showing persistent project contexts
 * 
 * Part of Dynamic Navigator (v1.6)
 */

import { bus } from './eventBus.js';

const BACKEND_URL = 'http://127.0.0.1:8000';

// State
let threads = [];
let activeThreadId = null;
let container = null;

/**
 * Initialize Active Threads section
 */
export function initActiveThreads(parentContainer) {
  container = parentContainer;
  
  // Load saved active thread
  const savedThread = localStorage.getItem('navigator_active_thread');
  if (savedThread) {
    activeThreadId = savedThread;
  }
  
  // Load threads from backend
  loadThreads();
}

/**
 * Load thread definitions from backend
 */
async function loadThreads() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/threads`);
    const data = await response.json();
    threads = data.threads || [];
    
    console.log(`Loaded ${threads.length} active threads`);
    
    // Render threads
    renderThreads();
  } catch (error) {
    console.error('Error loading threads:', error);
    threads = [];
  }
}

/**
 * Render Active Threads section
 */
function renderThreads() {
  if (!container) return;
  
  // Clear container
  container.innerHTML = '';
  
  // Create section header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 12px 8px 12px;
    font-size: 11px;
    font-weight: 500;
    color: #9a9a9a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(42, 42, 42, 0.4);
    background: #0c0c0c;
  `;
  header.textContent = 'ACTIVE THREADS';
  container.appendChild(header);
  
  // Create threads container
  const threadsContainer = document.createElement('div');
  threadsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 0;
  `;
  
  // Render each thread
  threads.forEach(thread => {
    const threadEl = createThreadItem(thread);
    threadsContainer.appendChild(threadEl);
  });
  
  container.appendChild(threadsContainer);
}

/**
 * Create thread item
 */
function createThreadItem(thread) {
  const isActive = activeThreadId === thread.id;
  
  const item = document.createElement('div');
  item.setAttribute('data-thread-id', thread.id);
  item.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    border-left: 3px solid ${isActive ? thread.color : 'transparent'};
    background: ${isActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent'};
    border-bottom: 1px solid rgba(42, 42, 42, 0.4);
  `;
  
  // Thread icon/indicator
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${thread.color};
    flex-shrink: 0;
  `;
  
  // Thread info
  const info = document.createElement('div');
  info.style.cssText = 'flex: 1; min-width: 0;';
  
  const title = document.createElement('div');
  title.textContent = thread.title;
  title.style.cssText = `
    font-size: 12px;
    font-weight: 500;
    color: ${isActive ? '#ffffff' : '#e6e6e6'};
    margin-bottom: 2px;
  `;
  
  const description = document.createElement('div');
  description.textContent = thread.description;
  description.style.cssText = `
    font-size: 10px;
    color: #9a9a9a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  
  info.appendChild(title);
  info.appendChild(description);
  
  // Document count badge
  const countBadge = document.createElement('div');
  countBadge.textContent = thread.docCount;
  countBadge.style.cssText = `
    font-size: 10px;
    font-weight: 500;
    color: ${thread.color};
    background: ${thread.color}22;
    padding: 3px 7px;
    border-radius: 10px;
    flex-shrink: 0;
  `;
  
  item.appendChild(indicator);
  item.appendChild(info);
  item.appendChild(countBadge);
  
  // Hover effects
  item.onmouseover = () => {
    if (!isActive) {
      item.style.background = 'rgba(255, 255, 255, 0.05)';
      item.style.borderLeft = `3px solid ${thread.color}66`;
    }
  };
  
  item.onmouseout = () => {
    if (!isActive) {
      item.style.background = 'transparent';
      item.style.borderLeft = '3px solid transparent';
    }
  };
  
  // Click handler
  item.onclick = async () => {
    // Toggle thread selection
    if (activeThreadId === thread.id) {
      // Deselect
      activeThreadId = null;
      localStorage.removeItem('navigator_active_thread');
      
      // Emit thread deselected
      bus.emit('threadSelected', { 
        threadId: null,
        documents: [],
        title: null
      });
    } else {
      // Select new thread
      activeThreadId = thread.id;
      localStorage.setItem('navigator_active_thread', thread.id);
      
      // Load thread documents
      const documents = await loadThreadDocuments(thread.id);
      
      // Emit thread selected
      bus.emit('threadSelected', { 
        threadId: thread.id,
        documents: documents,
        title: thread.title,
        color: thread.color
      });
    }
    
    // Update UI
    updateThreadItems();
  };
  
  return item;
}

/**
 * Load documents for a thread
 */
async function loadThreadDocuments(threadId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/threads/${threadId}/documents`);
    const data = await response.json();
    
    // Extract document IDs
    const docIds = (data.documents || []).map(doc => doc.id);
    
    console.log(`Loaded ${docIds.length} documents for thread: ${threadId}`);
    
    return docIds;
  } catch (error) {
    console.error(`Error loading documents for thread ${threadId}:`, error);
    return [];
  }
}

/**
 * Update thread item states
 */
function updateThreadItems() {
  const items = document.querySelectorAll('[data-thread-id]');
  
  items.forEach(item => {
    const threadId = item.getAttribute('data-thread-id');
    const isActive = activeThreadId === threadId;
    
    // Find thread data
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    
    // Update styles
    item.style.borderLeft = `3px solid ${isActive ? thread.color : 'transparent'}`;
    item.style.background = isActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent';
    
    // Update title color
    const title = item.querySelector('div:nth-child(2) > div:first-child');
    if (title) {
      title.style.color = isActive ? '#ffffff' : '#e6e6e6';
    }
  });
}

/**
 * Get active thread ID
 */
export function getActiveThread() {
  return activeThreadId;
}

/**
 * Clear active thread
 */
export function clearActiveThread() {
  activeThreadId = null;
  localStorage.removeItem('navigator_active_thread');
  
  bus.emit('threadSelected', { 
    threadId: null,
    documents: [],
    title: null
  });
  
  updateThreadItems();
}

/**
 * Refresh threads from backend
 */
export async function refreshThreads() {
  await loadThreads();
}

