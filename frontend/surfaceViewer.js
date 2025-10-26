/**
 * Surface Viewer Module for Loom Lite v2.0
 * Manages right panel with dual-mode viewer (Ontology | Document)
 * 
 * LOOM-V2-004: Enhanced Surface Viewer Implementation
 */

import { bus, setCurrentConceptId } from './eventBus.js';

// Global state
let currentMode = 'document'; // 'ontology' or 'document' - default to document (Reader Mode)
let currentConcept = null;
let currentDocId = null;
let documentText = null;
let documentSpans = [];

/**
 * Initialize surface viewer
 */
export function initSurfaceViewer() {
  console.log('🔄 Initializing Enhanced Surface Viewer...');
  
  const surfaceViewer = document.getElementById('surface-viewer');
  if (!surfaceViewer) {
    console.warn('⚠️ Surface Viewer element not found');
    return;
  }
  
  // Render header with mode toggle
  renderHeader(surfaceViewer);
  
  // Render content area
  renderContentArea(surfaceViewer);
  
  // Listen for conceptSelected events via event bus
  bus.on('conceptSelected', (event) => {
    const { concept, conceptId } = event.detail;
    if (concept) {
      handleConceptSelection(concept);
    } else if (conceptId) {
      // Fetch concept details if only ID provided
      fetchAndDisplayConcept(conceptId);
    }
  });
  
  // Listen for documentFocus events to load document in Reader Mode
  bus.on('documentFocus', async (event) => {
    const { docId } = event.detail;
    currentDocId = docId;
    
    // Always start in Document Mode when loading a new document
    currentMode = 'document';
    if (typeof updateModeButtons === 'function') {
      updateModeButtons();
    }
    
    // Load document text
    await renderDocumentMode(docId);
  });
  
  console.log('✅ Enhanced Surface Viewer initialized');
}

/**
 * Render surface viewer header with mode toggle
 * @param {HTMLElement} container - Surface viewer container
 */
function renderHeader(container) {
  const header = document.createElement('div');
  header.id = 'surface-viewer-header';
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
  title.textContent = '📄 Surface Viewer';
  
  // Mode toggle buttons
  const modeToggle = document.createElement('div');
  modeToggle.style.cssText = `
    background: #334155;
    padding: 3px;
    border-radius: 6px;
    display: flex;
    gap: 4px;
  `;
  
  const ontologyBtn = createModeButton('Ontology', 'ontology', false);
  const documentBtn = createModeButton('Document', 'document', true);
  
  modeToggle.appendChild(ontologyBtn);
  modeToggle.appendChild(documentBtn);
  
  header.appendChild(title);
  header.appendChild(modeToggle);
  container.appendChild(header);
}

/**
 * Create mode toggle button
 * @param {string} label - Button label
 * @param {string} mode - Mode value
 * @param {boolean} active - Whether button is active
 * @returns {HTMLElement} Button element
 */
function createModeButton(label, mode, active) {
  const btn = document.createElement('button');
  btn.className = `mode-btn mode-btn-${mode}`;
  btn.dataset.mode = mode;
  btn.textContent = label;
  btn.style.cssText = `
    padding: 4px 10px;
    font-size: 11px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    ${active ? 'background: #3b82f6; color: white;' : 'background: transparent; color: #94a3b8;'}
  `;
  
  btn.addEventListener('click', () => {
    switchMode(mode);
  });
  
  btn.addEventListener('mouseenter', () => {
    if (currentMode !== mode) {
      btn.style.background = '#475569';
      btn.style.color = '#e2e8f0';
    }
  });
  
  btn.addEventListener('mouseleave', () => {
    if (currentMode !== mode) {
      btn.style.background = 'transparent';
      btn.style.color = '#94a3b8';
    }
  });
  
  return btn;
}

/**
 * Render content area
 * @param {HTMLElement} container - Surface viewer container
 */
function renderContentArea(container) {
  const content = document.createElement('div');
  content.id = 'surface-viewer-content';
  content.style.cssText = `
    padding: 16px;
    overflow-y: auto;
    height: calc(100% - 60px);
    color: #e2e8f0;
    font-size: 13px;
    line-height: 1.6;
  `;
  
  // Default message
  content.innerHTML = `
    <div style="color: #64748b; text-align: center; padding: 40px 20px;">
      <div style="font-size: 16px; margin-bottom: 8px;">Select a concept to view details</div>
      <div style="font-size: 12px;">Click on any node in the visualization</div>
    </div>
  `;
  
  container.appendChild(content);
}

/**
 * Switch between Ontology and Document modes
 * @param {string} mode - Mode to switch to ('ontology' or 'document')
 */
function switchMode(mode) {
  const startTime = performance.now();
  
  currentMode = mode;
  console.log(`🔄 Switching to ${mode} mode`);
  
  // Update button states
  document.querySelectorAll('.mode-btn').forEach(btn => {
    if (btn.dataset.mode === mode) {
      btn.style.background = '#3b82f6';
      btn.style.color = 'white';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = '#94a3b8';
    }
  });
  
  // Smooth fade transition (200ms)
  const content = document.getElementById('surface-viewer-content');
  if (content) {
    content.style.opacity = '0';
    content.style.transition = 'opacity 0.2s';
    
    setTimeout(() => {
      // Re-render content based on mode
      if (mode === 'ontology' && currentConcept) {
        renderOntologyMode(currentConcept);
      } else if (mode === 'document' && currentDocId) {
        renderDocumentMode(currentDocId);
      }
      
      // Fade in
      setTimeout(() => {
        content.style.opacity = '1';
      }, 50);
    }, 200);
  }
  
  const endTime = performance.now();
  const switchTime = endTime - startTime;
  console.log(`⚡ Mode switch completed in ${switchTime.toFixed(2)}ms`);
  
  if (switchTime > 100) {
    console.warn(`⚠️ Mode switch exceeded target (${switchTime.toFixed(2)}ms > 100ms)`);
  }
}

/**
 * Handle concept selection
 * @param {Object} concept - Selected concept data
 */
async function handleConceptSelection(concept) {
  console.log(`🎯 Concept selected: ${concept.label}`);
  
  currentConcept = concept;
  currentDocId = concept.doc_id || window.getActiveDocId?.();
  
  if (currentMode === 'ontology') {
    renderOntologyMode(concept);
  } else if (currentMode === 'document') {
    await renderDocumentMode(currentDocId);
    // Scroll to concept mention if available
    scrollToConceptMention(concept.id);
  }
}

/**
 * Render ontology mode (concept metadata)
 * @param {Object} concept - Concept data
 */
function renderOntologyMode(concept) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Check if this is a cluster/refinement node (hierarchy_level 1 or 2) or has a summary
  const isClusterOrRefinement = concept.hierarchy_level === 1 || concept.hierarchy_level === 2;
  const hasSummary = concept.summary && concept.summary.trim().length > 0;
  
  // If it's a cluster/refinement with a summary, display the summary prominently
  if (isClusterOrRefinement && hasSummary) {
    content.innerHTML = `
      <div style="padding: 0;">
        <h3 style="font-size: 16px; margin-bottom: 16px; color: #e2e8f0;">${concept.label}</h3>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">TYPE</div>
          <div style="color: #e2e8f0;">${concept.type || (concept.hierarchy_level === 1 ? 'Cluster' : 'Refinement')}</div>
        </div>
        
        <div style="margin-bottom: 16px; padding: 16px; background: #0f172a; border-radius: 8px; border-left: 3px solid #3b82f6;">
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">📝 SUMMARY</div>
          <div style="color: #e2e8f0; line-height: 1.6;">${concept.summary}</div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">HIERARCHY LEVEL</div>
          <div style="color: #e2e8f0;">${concept.hierarchy_level === 1 ? 'Level 1 (Cluster)' : 'Level 2 (Refinement)'}</div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">METADATA</div>
          <div style="font-family: monospace; font-size: 11px; color: #cbd5e1;">
            ID: ${concept.id}
          </div>
        </div>
      </div>
    `;
  } else {
    // Regular concept view
    content.innerHTML = `
      <div style="padding: 0;">
        <h3 style="font-size: 16px; margin-bottom: 16px; color: #e2e8f0;">${concept.label}</h3>
        
        ${hasSummary ? `
          <div style="margin-bottom: 16px; padding: 16px; background: #0f172a; border-radius: 8px; border-left: 3px solid #3b82f6;">
            <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">📝 SUMMARY</div>
            <div style="color: #e2e8f0; line-height: 1.6;">${concept.summary}</div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 12px;">
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">TYPE</div>
          <div style="color: #e2e8f0;">${concept.type}</div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">CONFIDENCE</div>
          <div style="color: #e2e8f0;">${Math.round((concept.confidence || 0) * 100)}%</div>
        </div>
        
        ${concept.aliases && concept.aliases.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">ALIASES</div>
            <div style="color: #e2e8f0;">${Array.isArray(concept.aliases) ? concept.aliases.join(', ') : concept.aliases}</div>
          </div>
        ` : ''}
        
        ${concept.tags && concept.tags.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">TAGS</div>
            <div style="color: #e2e8f0;">${Array.isArray(concept.tags) ? concept.tags.join(', ') : concept.tags}</div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 12px;">
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">METADATA</div>
          <div style="font-family: monospace; font-size: 11px; color: #cbd5e1;">
            ${concept.model_name ? `Model: ${concept.model_name}<br>` : ''}
            ID: ${concept.id}
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 12px; background: #0f172a; border-radius: 6px; border: 1px solid #334155;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">💡 TIP</div>
          <div style="font-size: 11px; color: #94a3b8;">
            Switch to Document mode to see this concept highlighted in the original text.
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Render document mode (text with highlighting)
 * @param {string} docId - Document ID
 */
async function renderDocumentMode(docId) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Show loading state
  content.innerHTML = `
    <div style="color: #64748b; text-align: center; padding: 40px 20px;">
      <div style="font-size: 14px;">Loading document text...</div>
    </div>
  `;
  
  try {
    // Fetch document text from backend
    const response = await fetch(`https://loomlite-production.up.railway.app/doc/${docId}/text`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch document text: ${response.statusText}`);
    }
    
    const data = await response.json();
    documentText = data.text;
    documentSpans = data.spans || [];
    
    console.log(`📄 Loaded document text (${documentText?.length || 0} characters)`);
    
    // Render text with highlighting
    renderHighlightedText(documentText, documentSpans);
    
  } catch (error) {
    console.error('❌ Error loading document text:', error);
    
    // Show error or fallback message
    content.innerHTML = `
      <div style="color: #ef4444; padding: 16px; background: #1e1b1b; border-radius: 6px; border: 1px solid #7f1d1d;">
        <div style="font-weight: 600; margin-bottom: 8px;">Document Text Not Available</div>
        <div style="font-size: 12px; color: #fca5a5;">
          ${error.message}
        </div>
        <div style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
          The document text may not be stored in the database. This feature requires the original document text to be preserved during upload.
        </div>
      </div>
    `;
  }
}

/**
 * Render highlighted text with concept mentions
 * @param {string} text - Document text
 * @param {Array} spans - Evidence spans
 */
function renderHighlightedText(text, spans) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  if (!text) {
    content.innerHTML = `
      <div style="color: #64748b; text-align: center; padding: 40px 20px;">
        <div style="font-size: 14px;">No text content available</div>
      </div>
    `;
    return;
  }
  
  // Create highlighted HTML
  let highlightedHTML = '';
  let lastIndex = 0;
  
  // Sort spans by start position
  const sortedSpans = [...spans].sort((a, b) => a.start - b.start);
  
  sortedSpans.forEach(span => {
    // Add text before span
    if (span.start > lastIndex) {
      highlightedHTML += escapeHtml(text.substring(lastIndex, span.start));
    }
    
    // Add highlighted span with subtle Reader Mode styling
    const spanText = text.substring(span.start, span.end);
    highlightedHTML += `<mark class="evidence-span" data-concept-id="${span.concept_id}" style="background: rgba(59,130,246,0.15); color: #e2e8f0; padding: 2px 4px; border-radius: 3px; cursor: pointer; border-bottom: 1px solid rgba(59,130,246,0.4); transition: all 0.2s;">${escapeHtml(spanText)}</mark>`;
    
    lastIndex = span.end;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    highlightedHTML += escapeHtml(text.substring(lastIndex));
  }
  
  // Render with Reader Mode styling
  content.innerHTML = `
    <article style="
      max-width: 720px;
      margin: 0 auto;
      padding: 3rem 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 17px;
      line-height: 1.7;
      color: #e2e8f0;
      word-wrap: break-word;
    ">
      ${highlightedHTML}
    </article>
  `;
  
  // Add click handlers to highlighted spans
  content.querySelectorAll('.evidence-span').forEach(span => {
    span.addEventListener('click', () => {
      const conceptId = span.dataset.conceptId;
      handleMentionClick(conceptId);
    });
    
    span.addEventListener('mouseenter', () => {
      span.style.background = 'rgba(59,130,246,0.3)';
      span.style.borderBottom = '1px solid rgba(59,130,246,0.7)';
    });
    
    span.addEventListener('mouseleave', () => {
      span.style.background = 'rgba(59,130,246,0.15)';
      span.style.borderBottom = '1px solid rgba(59,130,246,0.4)';
    });
  });
}

/**
 * Handle click on concept mention
 * @param {string} conceptId - Concept ID
 */
function handleMentionClick(conceptId) {
  console.log(`🔗 Mention clicked: ${conceptId}`);
  
  // Switch to ontology mode
  currentMode = 'ontology';
  switchMode('ontology');
  
  // Emit concept selected event via event bus
  bus.emit('conceptSelected', { conceptId, docId: currentDocId });
  setCurrentConceptId(conceptId, currentDocId);
}

/**
 * Scroll to concept mention in document text
 * @param {string} conceptId - Concept ID
 */
function scrollToConceptMention(conceptId) {
  const mention = document.querySelector(`.evidence-span[data-concept-id="${conceptId}"]`);
  if (mention) {
    mention.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Flash highlight
    mention.style.background = '#f59e0b';
    setTimeout(() => {
      mention.style.background = '#fbbf24';
    }, 500);
  }
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for global access
window.initSurfaceViewer = initSurfaceViewer;
window.handleConceptSelection = handleConceptSelection;

