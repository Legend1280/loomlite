/**
 * System Status Dashboard
 * Shows real-time status of all Loom Lite v2.0 components
 */


let statusPanel = null;
let isMinimized = true;

const componentStatus = {
  // Core Libraries
  d3: false,
  eventBus: false,
  
  // Modules
  galaxyView: false,
  dualVisualizer: false,
  sidebar: false,
  surfaceViewer: false,
  searchBar: false,
  mindMap: false,
  
  // API Connectivity
  backendAPI: false,
  documentsLoaded: false,
  containerHealth: false,
  chromaDB: false,
  databaseConnection: false,
  
  // UI Elements
  toolbar: false,
  panels: false,
  
  // Data
  documentCount: 0,
  conceptCount: 0,
  apiResponseTime: 0
};

/**
 * Initialize the system status dashboard
 */
export function initSystemStatus() {
  console.log('🔧 Initializing System Status Dashboard...');
  
  createStatusPanel();
  checkAllComponents();
  
  // Update status every 5 seconds
  setInterval(checkAllComponents, 5000);
  
  console.log('System Status Dashboard initialized');
}

/**
 * Create the status panel UI
 */
function createStatusPanel() {
  statusPanel = document.createElement('div');
  statusPanel.id = 'systemStatus';
  statusPanel.innerHTML = `
    <div class="status-header">
      <span class="status-title">🔧 System Status</span>
      <button class="status-toggle" onclick="window.toggleSystemStatus()">−</button>
    </div>
    <div class="status-content">
      <div class="status-section">
        <div class="status-section-title">Core Libraries</div>
        <div class="status-item" data-component="d3">
          <span class="status-icon">⏳</span>
          <span class="status-label">D3.js</span>
        </div>
        <div class="status-item" data-component="eventBus">
          <span class="status-icon">⏳</span>
          <span class="status-label">Event Bus</span>
        </div>
      </div>
      
      <div class="status-section">
        <div class="status-section-title">Modules</div>
        <div class="status-item" data-component="galaxyView">
          <span class="status-icon">⏳</span>
          <span class="status-label">Galaxy View</span>
        </div>
        <div class="status-item" data-component="dualVisualizer">
          <span class="status-icon">⏳</span>
          <span class="status-label">Solar System</span>
        </div>
        <div class="status-item" data-component="sidebar">
          <span class="status-icon">⏳</span>
          <span class="status-label">File Navigator</span>
        </div>
        <div class="status-item" data-component="surfaceViewer">
          <span class="status-icon">⏳</span>
          <span class="status-label">Surface Viewer</span>
        </div>
        <div class="status-item" data-component="searchBar">
          <span class="status-icon">⏳</span>
          <span class="status-label">Search Bar</span>
        </div>
        <div class="status-item" data-component="mindMap">
          <span class="status-icon">⏳</span>
          <span class="status-label">Mind Map</span>
        </div>
      </div>
      
      <div class="status-section">
        <div class="status-section-title">Backend</div>
        <div class="status-item" data-component="containerHealth">
          <span class="status-icon">⏳</span>
          <span class="status-label">Docker Container</span>
        </div>
        <div class="status-item" data-component="backendAPI">
          <span class="status-icon">⏳</span>
          <span class="status-label">Railway API</span>
          <span class="status-value" id="apiTime">0ms</span>
        </div>
        <div class="status-item" data-component="chromaDB">
          <span class="status-icon">⏳</span>
          <span class="status-label">ChromaDB</span>
        </div>
        <div class="status-item" data-component="databaseConnection">
          <span class="status-icon">⏳</span>
          <span class="status-label">Database</span>
        </div>
        <div class="status-item" data-component="documentsLoaded">
          <span class="status-icon">⏳</span>
          <span class="status-label">Documents</span>
          <span class="status-value" id="docCount">0</span>
        </div>
      </div>
      
      <div class="status-section">
        <div class="status-section-title">Vector Database</div>
        <div class="status-item">
          <span class="status-icon">🔢</span>
          <span class="status-label">Model</span>
          <span class="status-value" id="vectorModel">-</span>
        </div>
        <div class="status-item">
          <span class="status-icon">📐</span>
          <span class="status-label">Dimension</span>
          <span class="status-value" id="vectorDim">-</span>
        </div>
        <div class="status-item">
          <span class="status-icon">📄</span>
          <span class="status-label">Doc Vectors</span>
          <span class="status-value" id="docVectors">0</span>
        </div>
        <div class="status-item">
          <span class="status-icon">💡</span>
          <span class="status-label">Concept Vectors</span>
          <span class="status-value" id="conceptVectors">0</span>
        </div>
      </div>
      
      <div class="status-section">
        <div class="status-section-title">UI Components</div>
        <div class="status-item" data-component="toolbar">
          <span class="status-icon">⏳</span>
          <span class="status-label">Toolbar</span>
        </div>
        <div class="status-item" data-component="panels">
          <span class="status-icon">⏳</span>
          <span class="status-label">Three-Panel Layout</span>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(statusPanel);
  
  // Make toggle function global
  window.toggleSystemStatus = toggleSystemStatus;
  
  // Start collapsed
  const content = statusPanel.querySelector('.status-content');
  const toggle = statusPanel.querySelector('.status-toggle');
  content.style.display = 'none';
  toggle.textContent = '+';
}

/**
 * Toggle minimize/expand
 */
function toggleSystemStatus() {
  isMinimized = !isMinimized;
  const content = statusPanel.querySelector('.status-content');
  const toggle = statusPanel.querySelector('.status-toggle');
  
  if (isMinimized) {
    content.style.display = 'none';
    toggle.textContent = '+';
    statusPanel.style.height = 'auto';
  } else {
    content.style.display = 'block';
    toggle.textContent = '−';
    statusPanel.style.height = 'auto';
  }
}

/**
 * Check all component statuses
 */
async function checkAllComponents() {
  // Core Libraries
  componentStatus.d3 = typeof d3 !== 'undefined';
  componentStatus.eventBus = typeof window.bus !== 'undefined';
  
  // Modules (check if functions exist)
  componentStatus.galaxyView = document.getElementById('galaxyContainer') !== null;
  componentStatus.dualVisualizer = typeof window.drawDualVisualizer === 'function';
  componentStatus.sidebar = document.getElementById('file-system-sidebar') !== null;
  componentStatus.surfaceViewer = document.getElementById('surface-viewer') !== null;
  componentStatus.searchBar = document.getElementById('search-container') !== null;
  componentStatus.mindMap = document.getElementById('visualizer-bottom') !== null;
  
  // UI Elements
  componentStatus.toolbar = document.getElementById('toolbar') !== null;
  componentStatus.panels = document.getElementById('app') !== null;
  
  // Backend API
  try {
    const startTime = performance.now();
    const treeResponse = await fetch(`${API_BASE}/tree`);
    const endTime = performance.now();
    componentStatus.apiResponseTime = Math.round(endTime - startTime);
    componentStatus.backendAPI = treeResponse.ok;
    componentStatus.containerHealth = treeResponse.ok; // If API responds, container is healthy
    
    if (treeResponse.ok) {
      const docs = await treeResponse.json();
      componentStatus.documentCount = docs.length;
      componentStatus.documentsLoaded = docs.length > 0;
      componentStatus.databaseConnection = docs.length >= 0; // If we can query docs, DB is connected
    }
  } catch (error) {
    componentStatus.backendAPI = false;
    componentStatus.documentsLoaded = false;
    componentStatus.containerHealth = false;
    componentStatus.databaseConnection = false;
  }
  
  // Check ChromaDB status and fetch vector stats
  try {
    const chromaResponse = await fetch(`${API_BASE}/api/embeddings/stats`);
    componentStatus.chromaDB = chromaResponse.ok;
    
    if (chromaResponse.ok) {
      const data = await chromaResponse.json();
      if (data.stats) {
        // Update vector statistics
        const modelEl = document.getElementById('vectorModel');
        const dimEl = document.getElementById('vectorDim');
        const docVectorsEl = document.getElementById('docVectors');
        const conceptVectorsEl = document.getElementById('conceptVectors');
        
        if (modelEl) modelEl.textContent = data.stats.model || 'MiniLM';
        if (dimEl) dimEl.textContent = data.stats.dimension || '384';
        if (docVectorsEl) docVectorsEl.textContent = data.stats.documents || '0';
        if (conceptVectorsEl) conceptVectorsEl.textContent = data.stats.concepts || '0';
      }
    }
  } catch (error) {
    componentStatus.chromaDB = false;
  }
  
  updateStatusUI();
}

/**
 * Update the status UI with current component states
 */
function updateStatusUI() {
  if (!statusPanel) return;
  
  Object.keys(componentStatus).forEach(component => {
    const item = statusPanel.querySelector(`[data-component="${component}"]`);
    if (!item) return;
    
    const icon = item.querySelector('.status-icon');
    const status = componentStatus[component];
    
    if (typeof status === 'boolean') {
      icon.innerHTML = status ? '<div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>' : '<div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></div>';
      item.style.opacity = status ? '1' : '0.5';
    }
  });
  
  // Update document count
  const docCount = statusPanel.querySelector('#docCount');
  if (docCount) {
    docCount.textContent = componentStatus.documentCount;
  }
  
  // Update API response time
  const apiTime = statusPanel.querySelector('#apiTime');
  if (apiTime) {
    const time = componentStatus.apiResponseTime;
    apiTime.textContent = `${time}ms`;
    // Color code by performance
    if (time < 100) {
      apiTime.style.color = '#10b981'; // Green - fast
    } else if (time < 500) {
      apiTime.style.color = '#f59e0b'; // Amber - medium
    } else {
      apiTime.style.color = '#ef4444'; // Red - slow
    }
  }
}

/**
 * Update a specific component status
 */
export function updateComponentStatus(component, status) {
  if (componentStatus.hasOwnProperty(component)) {
    componentStatus[component] = status;
    updateStatusUI();
  }
}

