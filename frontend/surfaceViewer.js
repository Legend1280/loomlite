/**
 * Surface Viewer Module for Loom Lite v3.0b
 * Enhanced with List Rendering + Selective Concept Highlighting
 * 
 * v3-t02b-c: Paragraph Formatting + Selective Highlighting Fix
 * - List and table structure preservation
 * - Selective highlighting (only selected concept + descendants)
 * - Semantic heatmap (opacity based on hierarchy depth)
 */

import { bus, setCurrentConceptId } from './eventBus.js';

// Global state
let currentMode = 'ontology'; // 'ontology' or 'document' - default to ontology to show summaries
let currentConcept = null;
let currentDocId = null;
let documentText = null;
let documentSpans = [];
let selectedConceptId = null;
let allConcepts = []; // Store all concepts for hierarchy queries
let allRelations = []; // Store all relations

// Analytics state
let analyticsVisible = false;
let currentFolder = null;
let viewStartTime = null;
const BACKEND_URL = 'https://loomlite-production.up.railway.app';

/**
 * Initialize surface viewer
 */
export function initSurfaceViewer() {
  console.log('Initializing Enhanced Surface Viewer v3.0b...');
  
  const surfaceViewer = document.getElementById('surface-viewer');
  if (!surfaceViewer) {
    console.warn('Surface Viewer element not found');
    return;
  }
  
  // Render header with mode toggle
  renderHeader(surfaceViewer);
  
  // Render content area
  renderContentArea(surfaceViewer);
  
  // Listen for conceptSelected events via event bus
  bus.on('conceptSelected', (event) => {
    const { concept, conceptId, nodeType, hierarchyLevel, summary } = event.detail;
    
    console.log(`Surface Viewer received selection:`, { conceptId, nodeType, hierarchyLevel });
    
    // Handle different node types
    if (nodeType === 'document') {
      // Document root clicked - show document summary
      handleDocumentSelection(event.detail);
    } else if (nodeType === 'cluster' || hierarchyLevel === 1) {
      // Cluster clicked - show cluster summary + highlight all concepts in cluster
      handleClusterSelection(event.detail);
    } else if (nodeType === 'refinement' || hierarchyLevel === 2) {
      // Refinement clicked - show refinement summary + highlight concepts
      handleRefinementSelection(event.detail);
    } else if (concept) {
      // Regular concept clicked
      handleConceptSelection(concept);
    } else if (conceptId) {
      // Fetch concept details if only ID provided
      fetchAndDisplayConcept(conceptId);
    }
  });
  
  // Listen for folderSelected events from Dynamic Folders Panel
  bus.on('folderSelected', (event) => {
    const { folder, document, doc_id, title, score } = event.detail;
    
    console.log(`📁 Folder selection received:`, { folder, title, score });
    
    // Track dwell time for previous document
    if (viewStartTime && currentDocId && currentFolder) {
      const dwellSeconds = Math.floor((Date.now() - viewStartTime) / 1000);
      trackDwellTime(currentFolder, currentDocId, dwellSeconds);
    }
    
    // Load the document in Surface Viewer
    currentDocId = doc_id;
    currentFolder = folder;
    viewStartTime = Date.now();
    
    // Track view event
    trackView(folder, doc_id);
    
    // Show folder context in ontology mode
    handleFolderSelection(event.detail);
  });
  
  // Listen for documentFocus events to load document
  bus.on('documentFocus', async (event) => {
    const { docId, doc_id } = event.detail;
    currentDocId = docId || doc_id;
    
    console.log(`📄 Document focused: ${currentDocId}`);
    
    // Load full ontology data for this document
    await loadDocumentOntology(currentDocId);
    
    // Update content based on current mode
    updateContent();
  });
  
  console.log('Enhanced Surface Viewer v3.0b initialized');
}

/**
 * Render surface viewer header with mode toggle - CLEAN VERSION
 */
function renderHeader(container) {
  // Remove any existing header
  const existingHeader = container.querySelector('.surface-viewer-header-wrapper');
  if (existingHeader) {
    existingHeader.remove();
  }
  
  // Create header wrapper with label
  const headerWrapper = document.createElement('div');
  headerWrapper.className = 'surface-viewer-header-wrapper';
  headerWrapper.style.cssText = `
    background: #0c0c0c;
    border-bottom: 1px solid rgba(42, 42, 42, 0.4);
  `;
  
  // Add SURFACE VIEWER label
  const label = document.createElement('div');
  label.style.cssText = `
    padding: 12px 16px 8px 16px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
    color: #9a9a9a;
    text-transform: uppercase;
  `;
  label.textContent = 'SURFACE VIEWER';
  headerWrapper.appendChild(label);
  
  // Create tabs container
  const tabsContainer = document.createElement('div');
  tabsContainer.style.cssText = `
    display: flex;
    align-items: stretch;
    gap: 0;
  `;
  
  // Define tabs
  const tabs = [
    { id: 'ontology', label: 'Ontology', icon: createShareIcon() },
    { id: 'document', label: 'Document', icon: createBookIcon() },
    { id: 'analytics', label: 'Analytics', icon: createChartIcon() }
  ];
  
  tabs.forEach(tab => {
    const tabBtn = document.createElement('button');
    const isActive = (currentMode === tab.id);
    
    tabBtn.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: ${isActive ? '#181818' : '#0c0c0c'};
      border: none;
      border-bottom: ${isActive ? '2px solid #fad643' : '1px solid rgba(42, 42, 42, 0.4)'};
      color: ${isActive ? '#fad643' : '#9a9a9a'};
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.25s ease-in-out;
      padding: 12px 16px;
    `;
    
    // Add icon
    tab.icon.style.cssText = `
      width: 16px;
      height: 16px;
      stroke: ${isActive ? '#fad643' : '#e6e6e6'};
      stroke-width: 2;
      fill: none;
    `;
    
    tabBtn.appendChild(tab.icon);
    tabBtn.appendChild(document.createTextNode(tab.label));
    
    // Hover effect
    tabBtn.addEventListener('mouseenter', () => {
      if (!isActive) {
        tabBtn.style.background = '#181818';
        tabBtn.style.color = '#e6e6e6';
      }
    });
    
    tabBtn.addEventListener('mouseleave', () => {
      if (!isActive) {
        tabBtn.style.background = '#0c0c0c';
        tabBtn.style.color = '#9a9a9a';
      }
    });
    
    // Click handler - simple mode switch
    tabBtn.addEventListener('click', () => {
      if (currentMode !== tab.id) {
        currentMode = tab.id;
        updateContent();
        renderHeader(container); // Re-render tabs to update active state
      }
    });
    
    tabsContainer.appendChild(tabBtn);
  });
  
  headerWrapper.appendChild(tabsContainer);
  container.insertBefore(headerWrapper, container.firstChild);
}

/**
 * Create SVG icons (Lucide-style)
 */
function createShareIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13');
  svg.appendChild(path);
  return svg;
}

function createBookIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z');
  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path2.setAttribute('d', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z');
  svg.appendChild(path1);
  svg.appendChild(path2);
  return svg;
}

function createChartIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M18 20V10');
  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path2.setAttribute('d', 'M12 20V4');
  const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path3.setAttribute('d', 'M6 20v-6');
  svg.appendChild(path1);
  svg.appendChild(path2);
  svg.appendChild(path3);
  return svg;
}

// Deprecated: createModeButton and updateModeButtons removed in v2.3
// Tabs are now rendered directly in renderHeader()

/**
 * Render content area
 */
function renderContentArea(container) {
  const content = document.createElement('div');
  content.id = 'surface-viewer-content';
  content.style.cssText = `
    padding: 0;
    overflow-y: auto;
    height: calc(100% - 80px);
    background: linear-gradient(180deg, #0c0c0c 0%, #111111 100%);
  `;
  
  // Default message
  content.innerHTML = `
    <div style="color: #9a9a9a; text-align: center; padding: 60px 20px;">
      <div style="font-size: 14px; margin-bottom: 8px; color: #e6e6e6;">Select a concept to view details</div>
      <div style="font-size: 12px; color: #9a9a9a;">Click on any node in the visualization</div>
    </div>
  `;
  
  container.appendChild(content);
}

/**
 * Update content based on current mode
 */
function updateContent() {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Fade out
  content.style.opacity = '0';
  content.style.transition = 'opacity 0.2s';
  
  setTimeout(() => {
    // Render based on mode
    if (currentMode === 'ontology') {
      if (currentConcept) {
        // Show specific concept details
        renderOntologyMode(currentConcept);
      } else if (currentDocId && allConcepts.length > 0) {
        // Show full document ontology
        renderFullOntology(currentDocId, { concepts: allConcepts, relations: allRelations });
      } else {
        // Show default message
        content.innerHTML = `
          <div style="color: #9a9a9a; text-align: center; padding: 60px 20px;">
            <div style="font-size: 14px; margin-bottom: 8px; color: #e6e6e6;">Select a document to view ontology</div>
            <div style="font-size: 12px; color: #9a9a9a;">Click on any file in the Navigator or Galaxy View</div>
          </div>
        `;
      }
    } else if (currentMode === 'document' && currentDocId) {
      renderDocumentMode(currentDocId);
    } else if (currentMode === 'analytics' && currentDocId) {
      renderAnalyticsMode(currentDocId);
    } else {
      // Show default message
      content.innerHTML = `
        <div style="color: #9a9a9a; text-align: center; padding: 60px 20px;">
          <div style="font-size: 14px; margin-bottom: 8px; color: #e6e6e6;">Select a document</div>
          <div style="font-size: 12px; color: #9a9a9a;">Click on any file in the Navigator or Galaxy View</div>
        </div>
      `;
    }
    
    // Fade in
    setTimeout(() => {
      content.style.opacity = '1';
    }, 50);
  }, 200);
}

/**
 * DEPRECATED - Use updateContent() instead
 */
function switchMode(mode) {
  currentMode = mode;
  updateContent();
}

/**
 * Load full document ontology data
 */
async function loadDocumentOntology(docId) {
  if (!docId) return;
  
  try {
    console.log(`Loading full ontology for document: ${docId}`);
    
    const response = await fetch(`${BACKEND_URL}/doc/${docId}/ontology`);
    if (!response.ok) {
      throw new Error(`Failed to load ontology: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Store in global state
    allConcepts = data.concepts || [];
    allRelations = data.relations || [];
    
    // If in ontology mode and no specific concept selected, show full ontology
    if (currentMode === 'ontology' && !currentConcept) {
      renderFullOntology(docId, data);
    }
    
    console.log(`Loaded ${allConcepts.length} concepts and ${data.relations?.length || 0} relations`);
    
  } catch (error) {
    console.error('Error loading document ontology:', error);
  }
}

/**
 * Render full document ontology in human-readable format
 */
function renderFullOntology(docId, ontologyData) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  const { concepts = [], relations = [] } = ontologyData;
  
  // Group concepts by type
  const conceptsByType = {};
  concepts.forEach(concept => {
    const type = concept.type || 'Unknown';
    if (!conceptsByType[type]) {
      conceptsByType[type] = [];
    }
    conceptsByType[type].push(concept);
  });
  
  // Count relations by verb
  const relationsByVerb = {};
  relations.forEach(rel => {
    const verb = rel.verb || 'unknown';
    relationsByVerb[verb] = (relationsByVerb[verb] || 0) + 1;
  });
  
  // Helper: Convert hierarchy level to human-readable
  const hierarchyLabel = (level) => {
    if (level === 0) return 'Document Root';
    if (level === 1) return 'Top-level Cluster';
    if (level === 2) return 'Refinement';
    if (level === 3) return 'Concept';
    return `Level ${level}`;
  };
  
  // Helper: Format verb to human-readable
  const formatVerb = (verb) => {
    const verbMap = {
      'contains': 'contains',
      'defines': 'defines',
      'develops': 'develops',
      'manages': 'manages',
      'leads': 'leads',
      'uses': 'uses',
      'creates': 'creates'
    };
    return verbMap[verb] || verb;
  };
  
  // Build HTML
  let html = `
    <div style="padding: 24px; background: #111111; height: 100%; overflow-y: auto;">
      <h3 style="font-size: 18px; margin-bottom: 8px; color: #fad643; font-weight: 600;">
        Document Ontology
      </h3>
      <p style="font-size: 12px; color: #9a9a9a; margin-bottom: 20px; line-height: 1.6;">
        This is the complete semantic structure extracted from the document, showing all concepts, their types, and how they relate to each other.
      </p>
      
      <!-- Summary Stats -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="background: #181818; padding: 16px; border-radius: 8px; border-left: 3px solid #fad643;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">Total Concepts</div>
          <div style="color: #fad643; font-size: 24px; font-weight: 600;">${concepts.length}</div>
        </div>
        <div style="background: #181818; padding: 16px; border-radius: 8px; border-left: 3px solid #fad643;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">Total Relations</div>
          <div style="color: #fad643; font-size: 24px; font-weight: 600;">${relations.length}</div>
        </div>
      </div>
      
      <!-- Concept Types -->
      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 14px; color: #e6e6e6; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Concept Types
        </h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${Object.entries(conceptsByType).map(([type, items]) => `
            <div style="background: #181818; padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(250, 214, 67, 0.2);">
              <span style="color: #fad643; font-size: 12px; font-weight: 500;">${type}</span>
              <span style="color: #9a9a9a; font-size: 11px; margin-left: 6px;">${items.length}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Relation Types -->
      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 14px; color: #e6e6e6; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Relation Types
        </h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${Object.entries(relationsByVerb).map(([verb, count]) => `
            <div style="background: #181818; padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(250, 214, 67, 0.2);">
              <span style="color: #c5c5c5; font-size: 12px;">${verb}</span>
              <span style="color: #9a9a9a; font-size: 11px; margin-left: 6px;">${count}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- All Concepts List -->
      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 14px; color: #e6e6e6; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          All Concepts (${concepts.length})
        </h4>
        <div style="background: #181818; border-radius: 8px; overflow: hidden;">
          ${Object.entries(conceptsByType).map(([type, items]) => `
            <div style="margin-bottom: 16px;">
              <div style="background: #0c0c0c; padding: 10px 16px; border-left: 3px solid #fad643;">
                <span style="color: #fad643; font-size: 12px; font-weight: 600; text-transform: uppercase;">${type}</span>
                <span style="color: #9a9a9a; font-size: 11px; margin-left: 8px;">(${items.length})</span>
              </div>
              <div style="padding: 12px 16px;">
                ${items.map((concept, idx) => `
                  <div style="padding: 8px 0; border-bottom: ${idx < items.length - 1 ? '1px solid rgba(42, 42, 42, 0.4)' : 'none'};">
                    <div style="color: #e6e6e6; font-size: 13px; margin-bottom: 4px; font-weight: 500;">${concept.label}</div>
                    <div style="display: flex; gap: 12px; font-size: 11px; color: #9a9a9a;">
                      ${concept.confidence ? `<span>${(concept.confidence * 100).toFixed(0)}% confident</span>` : ''}
                      ${concept.hierarchy_level !== undefined ? `<span>${hierarchyLabel(concept.hierarchy_level)}</span>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Relations List -->
      <div>
        <h4 style="font-size: 14px; color: #e6e6e6; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          How Concepts Relate (${relations.length} connections)
        </h4>
        <p style="font-size: 11px; color: #9a9a9a; margin-bottom: 12px; line-height: 1.5;">
          These are the semantic relationships between concepts, showing how they connect and interact.
        </p>
        <div style="background: #181818; border-radius: 8px; padding: 16px;">
          ${relations.slice(0, 50).map((rel, idx) => {
            const srcConcept = concepts.find(c => c.id === rel.src);
            const dstConcept = concepts.find(c => c.id === rel.dst);
            const srcLabel = srcConcept?.label || rel.src.substring(0, 8) + '...';
            const dstLabel = dstConcept?.label || rel.dst.substring(0, 8) + '...';
            return `
              <div style="padding: 8px 0; border-bottom: ${idx < Math.min(relations.length, 50) - 1 ? '1px solid rgba(42, 42, 42, 0.4)' : 'none'};">
                <div style="font-size: 13px; color: #e6e6e6; line-height: 1.6;">
                  <span style="color: #e6e6e6; font-weight: 500;">${srcLabel}</span>
                  <span style="color: #fad643; margin: 0 6px; font-weight: 600;">${formatVerb(rel.verb)}</span>
                  <span style="color: #e6e6e6; font-weight: 500;">${dstLabel}</span>
                </div>
              </div>
            `;
          }).join('')}
          ${relations.length > 50 ? `
            <div style="padding: 12px 0; text-align: center; color: #9a9a9a; font-size: 11px;">
              ... and ${relations.length - 50} more relations
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
}


/**
 * Handle document root selection
 */
async function handleDocumentSelection(eventDetail) {
  const { docId, concept, summary } = eventDetail;
  console.log(`Document root selected: ${concept?.title || docId}`);
  
  currentDocId = docId;
  currentConcept = null; // Clear concept to show full ontology
  selectedConceptId = null;
  
  // Load full ontology for this document
  await loadDocumentOntology(docId);
  
  // Update content based on current mode
  if (currentMode === 'document') {
    await renderDocumentMode(docId);
  }
}

/**
 * Handle folder selection from Dynamic Folders Panel
 */
async function handleFolderSelection(eventDetail) {
  const { folder, document, doc_id, title, score } = eventDetail;
  console.log(`Folder selection: ${title} from ${folder}`);
  
  currentDocId = doc_id;
  selectedConceptId = null;
  
  // Switch to ontology mode to show folder context
  currentMode = 'ontology';
  updateModeButtons();
  
  // Show document info with folder context
  const content = document.getElementById('surface-viewer-content');
  if (content) {
    content.innerHTML = `
      <div style="padding: 24px; background: #111111;">
        <div style="margin-bottom: 20px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">📁 FOLDER</div>
          <div style="color: #fad643; font-size: 16px; font-weight: 600; margin-bottom: 8px;">${folder}</div>
        </div>
        
        <h3 style="font-size: 18px; margin-bottom: 16px; color: #e6e6e6; font-weight: 600;">${title}</h3>
        
        <div style="margin-bottom: 20px; padding: 20px; background: #181818; border-radius: 8px; border-left: 3px solid #fad643;">
          <div style="color: #fad643; font-size: 11px; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">SEMANTIC SCORE</div>
          <div style="color: #e6e6e6; line-height: 1.7; font-size: 14px;">This document has a semantic relevance score of <strong>${score}</strong> within the "${folder}" folder.</div>
          <div style="color: #9a9a9a; font-size: 12px; margin-top: 8px;">Score is calculated based on concept confidence, recency, relations, and hierarchy.</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">DOCUMENT ID</div>
          <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #c5c5c5;">${doc_id}</div>
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: #181818; border-radius: 6px;">
          <div style="color: #9a9a9a; font-size: 11px; margin-bottom: 8px;">💡 Tip</div>
          <div style="color: #c5c5c5; font-size: 12px; line-height: 1.6;">
            Switch to <strong>Paragraph</strong> mode to read the full document text, or explore the <strong>Mind Map</strong> to see this document's concepts.
          </div>
        </div>
      </div>
    `;
  }
  
  // Load the document's ontology to enable Mind Map navigation
  try {
    const response = await fetch(`https://loomlite-production.up.railway.app/doc/${doc_id}/ontology`);
    if (response.ok) {
      const ontology = await response.json();
      // Emit event to update Mind Map
      bus.emit('ontologyLoaded', { docId: doc_id, ontology });
    }
  } catch (error) {
    console.error('Error loading ontology:', error);
  }
}

/**
 * Handle cluster selection
 */
async function handleClusterSelection(eventDetail) {
  const { conceptId, concept, summary, docId } = eventDetail;
  console.log(`Cluster selected: ${concept?.label || conceptId}`);
  
  currentConcept = concept;
  currentDocId = docId || currentDocId;
  selectedConceptId = conceptId;
  
  if (currentMode === 'ontology') {
    // Show cluster summary
    renderOntologyMode(concept || { id: conceptId, label: concept?.label || 'Cluster', summary, hierarchy_level: 1 });
  } else if (currentMode === 'document') {
    await renderDocumentMode(currentDocId);
    // Highlight all concepts in this cluster
    await highlightCluster(conceptId);
  }
}

/**
 * Handle refinement selection
 */
async function handleRefinementSelection(eventDetail) {
  const { conceptId, concept, summary, docId } = eventDetail;
  console.log(`🔹 Refinement selected: ${concept?.label || conceptId}`);
  
  currentConcept = concept;
  currentDocId = docId || currentDocId;
  selectedConceptId = conceptId;
  
  if (currentMode === 'ontology') {
    // Show refinement summary
    renderOntologyMode(concept || { id: conceptId, label: concept?.label || 'Refinement', summary, hierarchy_level: 2 });
  } else if (currentMode === 'document') {
    await renderDocumentMode(currentDocId);
    // Highlight all concepts under this refinement
    await highlightRefinement(conceptId);
  }
}

/**
 * Handle concept selection
 */
async function handleConceptSelection(concept) {
  console.log(`Concept selected: ${concept.label}`);
  
  currentConcept = concept;
  currentDocId = concept.doc_id || window.getActiveDocId?.();
  selectedConceptId = concept.id;
  
  if (currentMode === 'ontology') {
    renderOntologyMode(concept);
  } else if (currentMode === 'document') {
    await renderDocumentMode(currentDocId);
    // Highlight only this concept and its descendants
    await highlightConceptWithDescendants(concept.id);
  }
}

/**
 * Render ontology mode (concept metadata)
 */
function renderOntologyMode(concept) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Check if this is a cluster/refinement node or has a summary
  const isClusterOrRefinement = concept.hierarchy_level === 1 || concept.hierarchy_level === 2;
  const hasSummary = concept.summary && concept.summary.trim().length > 0;
  
  // Perplexity-style theme
  if (isClusterOrRefinement && hasSummary) {
    content.innerHTML = `
      <div style="padding: 24px; background: #111111;">
        <h3 style="font-size: 18px; margin-bottom: 16px; color: #fad643; font-weight: 600;">${concept.label}</h3>
        
        <div style="margin-bottom: 20px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">TYPE</div>
          <div style="color: #c5c5c5; font-size: 14px;">${concept.type || (concept.hierarchy_level === 1 ? 'Cluster' : 'Refinement')}</div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 20px; background: #181818; border-radius: 8px; border-left: 3px solid #fad643;">
          <div style="color: #fad643; font-size: 11px; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">📝 SUMMARY</div>
          <div style="color: #e6e6e6; line-height: 1.7; font-size: 14px;">${concept.summary}</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">HIERARCHY LEVEL</div>
          <div style="color: #c5c5c5; font-size: 14px;">${concept.hierarchy_level === 1 ? 'Level 1 (Cluster)' : 'Level 2 (Refinement)'}</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">METADATA</div>
          <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #c5c5c5;">
            ID: ${concept.id}
          </div>
        </div>
      </div>
    `;
  } else {
    // Regular concept view
    content.innerHTML = `
      <div style="padding: 24px; background: #111111;">
        <h3 style="font-size: 18px; margin-bottom: 16px; color: #fad643; font-weight: 600;">${concept.label}</h3>
        
        ${hasSummary ? `
          <div style="margin-bottom: 20px; padding: 20px; background: #181818; border-radius: 8px; border-left: 3px solid #fad643;">
            <div style="color: #fad643; font-size: 11px; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">📝 SUMMARY</div>
            <div style="color: #e6e6e6; line-height: 1.7; font-size: 14px;">${concept.summary}</div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 16px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">TYPE</div>
          <div style="color: #c5c5c5; font-size: 14px;">${concept.type}</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">CONFIDENCE</div>
          <div style="color: #c5c5c5; font-size: 14px;">${Math.round((concept.confidence || 0) * 100)}%</div>
        </div>
        
        ${concept.aliases && concept.aliases.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">ALIASES</div>
            <div style="color: #c5c5c5; font-size: 14px;">${Array.isArray(concept.aliases) ? concept.aliases.join(', ') : concept.aliases}</div>
          </div>
        ` : ''}
        
        ${concept.tags && concept.tags.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">TAGS</div>
            <div style="color: #c5c5c5; font-size: 14px;">${Array.isArray(concept.tags) ? concept.tags.join(', ') : concept.tags}</div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 16px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">METADATA</div>
          <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #c5c5c5;">
            ${concept.model_name ? `Model: ${concept.model_name}<br>` : ''}
            ID: ${concept.id}
          </div>
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: #181818; border-radius: 6px; border: 1px solid rgba(42, 42, 42, 0.5);">
          <div style="font-size: 11px; color: #9a9a9a; margin-bottom: 8px;">💡 TIP</div>
          <div style="font-size: 12px; color: #c5c5c5; line-height: 1.6;">
            Switch to Paragraph mode to see this concept highlighted in the original text.
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Render document mode with paragraph and list formatting
 */
async function renderDocumentMode(docId) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Show loading state
  content.innerHTML = `
    <div style="color: #9a9a9a; text-align: center; padding: 60px 20px; background: #111111;">
      <div style="font-size: 14px;">Loading document text...</div>
    </div>
  `;
  
  try {
    // Fetch document text, spans, and ontology
    const [textResponse, ontologyResponse] = await Promise.all([
      fetch(`https://loomlite-production.up.railway.app/doc/${docId}/text`),
      fetch(`https://loomlite-production.up.railway.app/doc/${docId}/ontology`)
    ]);
    
    if (!textResponse.ok || !ontologyResponse.ok) {
      throw new Error('Failed to fetch document data');
    }
    
    const textData = await textResponse.json();
    const ontologyData = await ontologyResponse.json();
    
    documentText = textData.text;
    documentSpans = textData.spans || [];
    allConcepts = ontologyData.concepts || [];
    
    console.log(`Loaded document (${documentText?.length || 0} chars, ${documentSpans.length} spans, ${allConcepts.length} concepts)`);
    
    // Render text with structure preservation
    renderStructuredTextWithHighlighting(documentText, documentSpans);
    
  } catch (error) {
    console.error('Error loading document:', error);
    
    content.innerHTML = `
      <div style="padding: 24px; background: #111111;">
        <div style="color: #ef4444; padding: 20px; background: #1e1b1b; border-radius: 8px; border: 1px solid #7f1d1d;">
          <div style="font-weight: 600; margin-bottom: 10px; font-size: 14px;">Document Text Not Available</div>
          <div style="font-size: 13px; color: #fca5a5; line-height: 1.6;">
            ${error.message}
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Parse text into structured elements (paragraphs, lists, tables) and render with highlighting
 */
function renderStructuredTextWithHighlighting(text, spans) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  if (!text) {
    content.innerHTML = `
      <div style="color: #9a9a9a; text-align: center; padding: 60px 20px; background: #111111;">
        <div style="font-size: 14px;">No text content available</div>
      </div>
    `;
    return;
  }
  
  // Parse text into paragraphs (split by double newline)
  const paragraphs = text.split(/\n\n+/);
  
  // Sort spans by start position
  const sortedSpans = [...spans].sort((a, b) => a.start - b.start);
  
  // Build structured HTML
  let currentOffset = 0;
  const elementsHTML = paragraphs.map((para, paraIndex) => {
    const paraStart = currentOffset;
    const paraEnd = paraStart + para.length;
    
    // Detect if this is a list
    const lines = para.split('\n');
    const isListBlock = lines.length > 1 && lines.every(line => 
      line.trim().startsWith('-') || line.trim().match(/^\d+\./)
    );
    
    if (isListBlock) {
      // Render as list
      const listItems = lines.map(line => {
        const lineStart = paraStart + para.indexOf(line);
        const lineEnd = lineStart + line.length;
        
        // Find spans in this line
        const lineSpans = sortedSpans.filter(span => 
          span.start >= lineStart && span.end <= lineEnd
        );
        
        // Build highlighted line HTML
        let lineHTML = buildHighlightedHTML(line, lineSpans, lineStart);
        
        // Remove list marker from HTML (already in <li>)
        lineHTML = lineHTML.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '');
        
        return `<li style="margin-bottom: 0.5em; color: #c5c5c5;">${lineHTML}</li>`;
      }).join('');
      
      currentOffset = paraEnd + 2; // Account for \n\n
      
      return `<ul style="
        margin-bottom: 1.5em;
        padding-left: 1.5em;
        list-style-type: disc;
      ">${listItems}</ul>`;
    } else {
      // Render as paragraph
      const paraSpans = sortedSpans.filter(span => 
        span.start < paraEnd && span.end > paraStart
      );
      
      const paraHTML = buildHighlightedHTML(para, paraSpans, paraStart);
      
      currentOffset = paraEnd + 2; // Account for \n\n
      
      return `<p style="
        margin-bottom: 1.5em;
        line-height: 1.8;
        color: #c5c5c5;
        font-size: 15px;
      " data-para-index="${paraIndex}">${paraHTML}</p>`;
    }
  }).join('');
  
  // Render with Perplexity-style container
  content.innerHTML = `
    <article id="document-text-container" style="
      max-width: 780px;
      margin: 0 auto;
      padding: 3rem 2.5rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #111111;
    ">
      ${elementsHTML}
    </article>
  `;
  
  // Add click handlers to concept spans
  content.querySelectorAll('.concept-span').forEach(span => {
    span.addEventListener('click', (e) => {
      e.stopPropagation();
      const conceptId = span.dataset.conceptId;
      handleConceptSpanClick(conceptId);
    });
    
    span.addEventListener('mouseenter', () => {
      if (!span.classList.contains('selected')) {
        span.style.background = 'rgba(251, 191, 36, 0.25)';
        span.style.borderBottom = '2px solid rgba(251, 191, 36, 0.6)';
      }
    });
    
    span.addEventListener('mouseleave', () => {
      if (!span.classList.contains('selected')) {
        const opacity = parseFloat(span.dataset.opacity || '0.15');
        span.style.background = `rgba(251, 191, 36, ${opacity})`;
        span.style.borderBottom = `2px solid rgba(251, 191, 36, ${opacity * 2})`;
      }
    });
  });
  
  // If a concept is already selected, highlight it and descendants
  if (selectedConceptId) {
    highlightConceptWithDescendants(selectedConceptId);
  }
}

/**
 * Build highlighted HTML for a text segment
 */
function buildHighlightedHTML(text, spans, textOffset) {
  let html = '';
  let lastIndex = 0;
  
  spans.forEach(span => {
    // Adjust span positions relative to text segment
    const relStart = span.start - textOffset;
    const relEnd = span.end - textOffset;
    
    // Add text before span
    if (relStart > lastIndex) {
      html += escapeHtml(text.substring(lastIndex, relStart));
    }
    
    // Add highlighted span (default: no highlight, will be set by selective highlighting)
    const spanText = text.substring(relStart, relEnd);
    html += `<span 
      class="concept-span" 
      data-concept-id="${span.concept_id}"
      data-opacity="0"
      style="
        background: transparent;
        color: #c5c5c5;
        padding: 0;
        border-bottom: none;
        cursor: pointer;
        transition: all 0.2s;
      ">${escapeHtml(spanText)}</span>`;
    
    lastIndex = relEnd;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    html += escapeHtml(text.substring(lastIndex));
  }
  
  return html;
}

/**
 * Handle click on concept span in document
 */
function handleConceptSpanClick(conceptId) {
  console.log(`🔗 Concept span clicked: ${conceptId}`);
  
  // Update selected concept
  selectedConceptId = conceptId;
  
  // Emit event to update other views
  bus.emit('conceptSelected', { conceptId, docId: currentDocId });
  setCurrentConceptId(conceptId, currentDocId);
  
  // Highlight this concept and its descendants
  highlightConceptWithDescendants(conceptId);
}

/**
 * Highlight selected concept and its descendants with semantic heatmap
 */
async function highlightConceptWithDescendants(conceptId) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Find the selected concept
  const selectedConcept = allConcepts.find(c => c.id === conceptId);
  if (!selectedConcept) {
    console.warn(`Concept ${conceptId} not found`);
    return;
  }
  
  // Find descendants based on hierarchy
  const descendants = findDescendants(conceptId, allConcepts);
  const descendantIds = new Set(descendants.map(c => c.id));
  descendantIds.add(conceptId); // Include selected concept
  
  console.log(`🎨 Highlighting concept ${conceptId} + ${descendants.length} descendants`);
  
  // Reset all spans to transparent
  content.querySelectorAll('.concept-span').forEach(span => {
    span.classList.remove('selected');
    span.style.background = 'transparent';
    span.style.borderBottom = 'none';
    span.style.fontWeight = '400';
    span.style.color = '#c5c5c5';
    span.dataset.opacity = '0';
  });
  
  // Highlight selected and descendants with semantic heatmap
  descendantIds.forEach(id => {
    const concept = allConcepts.find(c => c.id === id);
    if (!concept) return;
    
    // Calculate opacity based on hierarchy level (deeper = more prominent)
    let opacity = 0.15;
    if (id === conceptId) {
      opacity = 0.3; // Selected concept: most prominent
    } else if (concept.hierarchy_level === 3) {
      opacity = 0.25; // Atomic concepts: prominent
    } else if (concept.hierarchy_level === 2) {
      opacity = 0.2; // Refinements: medium
    } else if (concept.hierarchy_level === 1) {
      opacity = 0.1; // Clusters: subtle
    }
    
    const spans = content.querySelectorAll(`.concept-span[data-concept-id="${id}"]`);
    spans.forEach(span => {
      if (id === conceptId) {
        span.classList.add('selected');
      }
      span.style.background = `rgba(251, 191, 36, ${opacity})`;
      span.style.borderBottom = `2px solid rgba(251, 191, 36, ${opacity * 2})`;
      span.style.fontWeight = id === conceptId ? '600' : '500';
      span.style.color = '#fad643';
      span.dataset.opacity = opacity.toString();
    });
  });
  
  // Scroll to first occurrence of selected concept
  const firstSpan = content.querySelector(`.concept-span[data-concept-id="${conceptId}"]`);
  if (firstSpan) {
    firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Highlight all concepts in a cluster (for cluster selection)
 */
async function highlightCluster(clusterId) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Find all concepts that belong to this cluster
  const clusterConcepts = allConcepts.filter(c => 
    c.parent_cluster_id === clusterId || c.id === clusterId
  );
  
  const clusterConceptIds = new Set(clusterConcepts.map(c => c.id));
  
  console.log(`🎨 Highlighting cluster ${clusterId} with ${clusterConcepts.length} concepts`);
  
  // Reset all spans
  content.querySelectorAll('.concept-span').forEach(span => {
    span.classList.remove('selected');
    span.style.background = 'transparent';
    span.style.borderBottom = 'none';
    span.style.fontWeight = '400';
    span.style.color = '#c5c5c5';
    span.dataset.opacity = '0';
  });
  
  // Highlight cluster concepts with soft glow (25% opacity)
  clusterConceptIds.forEach(id => {
    const spans = content.querySelectorAll(`.concept-span[data-concept-id="${id}"]`);
    spans.forEach(span => {
      span.style.background = `rgba(251, 191, 36, 0.25)`;
      span.style.borderBottom = `2px solid rgba(251, 191, 36, 0.5)`;
      span.style.fontWeight = '500';
      span.style.color = '#fad643';
      span.dataset.opacity = '0.25';
    });
  });
  
  // Scroll to first occurrence
  const firstSpan = content.querySelector(`.concept-span[data-concept-id]`);
  if (firstSpan) {
    firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Highlight all concepts under a refinement (for refinement selection)
 */
async function highlightRefinement(refinementId) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Find all concepts that belong to this refinement
  const refinementConcepts = allConcepts.filter(c => 
    c.parent_concept_id === refinementId || c.id === refinementId
  );
  
  const refinementConceptIds = new Set(refinementConcepts.map(c => c.id));
  
  console.log(`🎨 Highlighting refinement ${refinementId} with ${refinementConcepts.length} concepts`);
  
  // Reset all spans
  content.querySelectorAll('.concept-span').forEach(span => {
    span.classList.remove('selected');
    span.style.background = 'transparent';
    span.style.borderBottom = 'none';
    span.style.fontWeight = '400';
    span.style.color = '#c5c5c5';
    span.dataset.opacity = '0';
  });
  
  // Highlight refinement concepts with medium glow (30% opacity)
  refinementConceptIds.forEach(id => {
    const spans = content.querySelectorAll(`.concept-span[data-concept-id="${id}"]`);
    spans.forEach(span => {
      span.style.background = `rgba(251, 191, 36, 0.3)`;
      span.style.borderBottom = `2px solid rgba(251, 191, 36, 0.6)`;
      span.style.fontWeight = '500';
      span.style.color = '#fad643';
      span.dataset.opacity = '0.3';
    });
  });
  
  // Scroll to first occurrence
  const firstSpan = content.querySelector(`.concept-span[data-concept-id]`);
  if (firstSpan) {
    firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Find all descendants of a concept in the hierarchy
 */
function findDescendants(conceptId, concepts) {
  const descendants = [];
  
  // Find direct children
  const children = concepts.filter(c => 
    c.parent_cluster_id === conceptId || c.parent_concept_id === conceptId
  );
  
  descendants.push(...children);
  
  // Recursively find descendants of children
  children.forEach(child => {
    const childDescendants = findDescendants(child.id, concepts);
    descendants.push(...childDescendants);
  });
  
  return descendants;
}

/**
 * Fetch concept details and display
 */
async function fetchAndDisplayConcept(conceptId) {
  try {
    const response = await fetch(`https://loomlite-production.up.railway.app/doc/${currentDocId}/ontology`);
    const data = await response.json();
    
    allConcepts = data.concepts || [];
    const concept = allConcepts.find(c => c.id === conceptId);
    
    if (concept) {
      handleConceptSelection(concept);
    }
  } catch (error) {
    console.error('Error fetching concept:', error);
  }
}

/**
 * Track view event
 */
async function trackView(folderName, docId) {
  try {
    await fetch(`${BACKEND_URL}/analytics/track-view?folder_name=${encodeURIComponent(folderName)}&doc_id=${encodeURIComponent(docId)}`, {
      method: 'POST'
    });
    console.log('View tracked:', { folderName, docId });
  } catch (error) {
    console.error('Error tracking view:', error);
  }
}

/**
 * Track dwell time
 */
async function trackDwellTime(folderName, docId, seconds) {
  if (seconds < 1) return; // Don't track very short views
  
  try {
    await fetch(`${BACKEND_URL}/analytics/track-dwell?folder_name=${encodeURIComponent(folderName)}&doc_id=${encodeURIComponent(docId)}&seconds=${seconds}`, {
      method: 'POST'
    });
    console.log('Dwell time tracked:', { folderName, docId, seconds });
  } catch (error) {
    console.error('Error tracking dwell time:', error);
  }
}

/**
 * Render analytics mode inline (not as overlay)
 */
async function renderAnalyticsMode(docId) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  try {
    const response = await fetch(`${BACKEND_URL}/document-stats/${docId}`);
    const stats = await response.json();
    
    // Calculate relative time
    const lastOpened = stats.last_opened ? getRelativeTime(stats.last_opened) : 'Never';
    
    content.innerHTML = `
      <div style="padding: 24px; background: #111111;">
        <h3 style="font-size: 18px; color: #e6e6e6; margin-bottom: 24px; font-weight: 600;">Document Analytics</h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: #181818; padding: 20px; border-radius: 8px; border-left: 3px solid #fad643;">
            <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">TOTAL VIEWS</div>
            <div style="color: #e6e6e6; font-size: 28px; font-weight: 600;">${stats.total_views}</div>
          </div>
          
          <div style="background: #181818; padding: 20px; border-radius: 8px; border-left: 3px solid #fad643;">
            <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">PINS</div>
            <div style="color: #e6e6e6; font-size: 28px; font-weight: 600;">${stats.total_pins}</div>
          </div>
          
          <div style="background: #181818; padding: 20px; border-radius: 8px; border-left: 3px solid #fad643;">
            <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">AVG DWELL TIME</div>
            <div style="color: #e6e6e6; font-size: 28px; font-weight: 600;">${formatDwellTime(stats.avg_dwell_time)}</div>
          </div>
        </div>
        
        <div style="background: #181818; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">LAST OPENED</div>
          <div style="color: #e6e6e6; font-size: 14px;">${lastOpened}</div>
        </div>
        
        <div style="background: #181818; padding: 20px; border-radius: 8px;">
          <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">FOLDERS</div>
          <div style="color: #e6e6e6; font-size: 14px; margin-bottom: 16px;">${stats.folder_count} folder(s)</div>
          
          ${stats.folders && stats.folders.length > 0 ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(42, 42, 42, 0.5);">
              <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">FOLDER BREAKDOWN</div>
              ${stats.folders.map(f => `
                <div style="margin-bottom: 12px; padding: 12px; background: #111111; border-radius: 6px; border-left: 2px solid #fad643;">
                  <div style="color: #e6e6e6; font-size: 13px; font-weight: 500; margin-bottom: 6px;">${f.folder_name}</div>
                  <div style="color: #9a9a9a; font-size: 11px; display: flex; gap: 12px;">
                    <span>${f.view_count} views</span>
                    <span>•</span>
                    <span>${f.pin_count} pins</span>
                    <span>•</span>
                    <span>${Math.floor(f.dwell_time / 60)}m dwell</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading analytics:', error);
    content.innerHTML = `
      <div style="padding: 24px; background: #111111;">
        <div style="color: #ef4444; padding: 20px; background: #1e1b1b; border-radius: 8px; border: 1px solid #7f1d1d;">
          <div style="font-weight: 600; margin-bottom: 8px;">Error Loading Analytics</div>
          <div style="font-size: 12px; color: #fca5a5;">${error.message}</div>
        </div>
      </div>
    `;
  }
}

/**
 * OLD OVERLAY CODE - DEPRECATED
 */
function renderAnalyticsOverlay_DEPRECATED(stats) {
  let overlay = document.getElementById('analytics-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'analytics-overlay';
    overlay.style.cssText = `
      position: fixed;
      right: 0;
      top: 60px;
      width: 300px;
      max-height: calc(100vh - 80px);
      background: #181818;
      border-left: 1px solid rgba(42, 42, 42, 0.5);
      padding: 20px;
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      z-index: 1000;
    `;
    document.body.appendChild(overlay);
  }
  
  // Calculate relative time
  const lastOpened = stats.last_opened ? getRelativeTime(stats.last_opened) : 'Never';
  
  overlay.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <h3 style="font-size: 16px; color: #e6e6e6; margin: 0;">Analytics</h3>
      <button id="close-analytics" style="
        background: transparent;
        border: none;
        color: #9a9a9a;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      ">×</button>
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">TOTAL VIEWS</div>
      <div style="color: #e6e6e6; font-size: 24px; font-weight: 600;">${stats.total_views}</div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">PINS</div>
      <div style="color: #e6e6e6; font-size: 24px; font-weight: 600;">${stats.total_pins}</div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">AVG DWELL TIME</div>
      <div style="color: #e6e6e6; font-size: 24px; font-weight: 600;">${formatDwellTime(stats.avg_dwell_time)}</div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">LAST OPENED</div>
      <div style="color: #e6e6e6; font-size: 14px;">${lastOpened}</div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">FOLDERS</div>
      <div style="color: #e6e6e6; font-size: 14px;">${stats.folder_count} folder(s)</div>
    </div>
    
    ${stats.folders && stats.folders.length > 0 ? `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(42, 42, 42, 0.5);">
        <div style="color: #9a9a9a; font-size: 11px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">FOLDER BREAKDOWN</div>
        ${stats.folders.map(f => `
          <div style="margin-bottom: 12px; padding: 8px; background: #111111; border-radius: 4px;">
            <div style="color: #e6e6e6; font-size: 12px; font-weight: 500; margin-bottom: 4px;">${f.folder_name}</div>
            <div style="color: #9a9a9a; font-size: 11px;">
              ${f.view_count} views • ${f.pin_count} pins • ${Math.floor(f.dwell_time / 60)}m
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
  
  // Show overlay
  setTimeout(() => {
    overlay.style.transform = 'translateX(0)';
  }, 10);
  
  analyticsVisible = true;
  
  // Add close button handler
  document.getElementById('close-analytics').onclick = () => {
    overlay.style.transform = 'translateX(100%)';
    analyticsVisible = false;
  };
}

/**
 * Format dwell time in human-readable format
 */
function formatDwellTime(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/**
 * Get relative time string
 */
function getRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for global access
window.initSurfaceViewer = initSurfaceViewer;
window.handleConceptSelection = handleConceptSelection;

console.log('Surface Viewer v3.0b module loaded');

