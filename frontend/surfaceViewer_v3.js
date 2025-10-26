/**
 * Surface Viewer Module for Loom Lite v3.0
 * Enhanced Document Viewer with Paragraph Formatting & Concept Highlighting
 * 
 * v3-t02a: Surface Viewer Formatting & Document Viewer Upgrade
 * - Paragraph-based rendering
 * - Inline concept span mapping with provenance
 * - Bidirectional event synchronization
 * - Perplexity-style dark theme
 */

import { bus, setCurrentConceptId } from './eventBus.js';

// Global state
let currentMode = 'document'; // 'ontology' or 'document'
let currentConcept = null;
let currentDocId = null;
let documentText = null;
let documentSpans = [];
let selectedConceptId = null;

/**
 * Initialize surface viewer
 */
export function initSurfaceViewer() {
  console.log('🔄 Initializing Enhanced Surface Viewer v3.0...');
  
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
    updateModeButtons();
    
    // Load document text
    await renderDocumentMode(docId);
  });
  
  console.log('✅ Enhanced Surface Viewer v3.0 initialized');
}

/**
 * Render surface viewer header with mode toggle
 */
function renderHeader(container) {
  const header = document.createElement('div');
  header.id = 'surface-viewer-header';
  header.style.cssText = `
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    color: #818cf8;
  `;
  title.textContent = '📄 Surface Viewer';
  
  // Mode toggle buttons
  const modeToggle = document.createElement('div');
  modeToggle.style.cssText = `
    background: #1e293b;
    padding: 3px;
    border-radius: 6px;
    display: flex;
    gap: 4px;
  `;
  
  const ontologyBtn = createModeButton('Ontology', 'ontology', false);
  const documentBtn = createModeButton('Paragraph', 'document', true);
  
  modeToggle.appendChild(ontologyBtn);
  modeToggle.appendChild(documentBtn);
  
  header.appendChild(title);
  header.appendChild(modeToggle);
  container.appendChild(header);
}

/**
 * Create mode toggle button
 */
function createModeButton(label, mode, active) {
  const btn = document.createElement('button');
  btn.className = `mode-btn mode-btn-${mode}`;
  btn.dataset.mode = mode;
  btn.textContent = label;
  btn.style.cssText = `
    padding: 6px 12px;
    font-size: 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
    ${active ? 'background: #4f46e5; color: white;' : 'background: transparent; color: #64748b;'}
  `;
  
  btn.addEventListener('click', () => {
    switchMode(mode);
  });
  
  btn.addEventListener('mouseenter', () => {
    if (currentMode !== mode) {
      btn.style.background = '#334155';
      btn.style.color = #cbd5e1';
    }
  });
  
  btn.addEventListener('mouseleave', () => {
    if (currentMode !== mode) {
      btn.style.background = 'transparent';
      btn.style.color = '#64748b';
    }
  });
  
  return btn;
}

/**
 * Update mode button states
 */
function updateModeButtons() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    if (btn.dataset.mode === currentMode) {
      btn.style.background = '#4f46e5';
      btn.style.color = 'white';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = '#64748b';
    }
  });
}

/**
 * Render content area
 */
function renderContentArea(container) {
  const content = document.createElement('div');
  content.id = 'surface-viewer-content';
  content.style.cssText = `
    padding: 0;
    overflow-y: auto;
    height: calc(100% - 60px);
    background: #0f172a;
  `;
  
  // Default message
  content.innerHTML = `
    <div style="color: #475569; text-align: center; padding: 60px 20px;">
      <div style="font-size: 16px; margin-bottom: 8px; color: #64748b;">Select a concept to view details</div>
      <div style="font-size: 13px; color: #475569;">Click on any node in the visualization</div>
    </div>
  `;
  
  container.appendChild(content);
}

/**
 * Switch between Ontology and Document modes
 */
function switchMode(mode) {
  currentMode = mode;
  console.log(`🔄 Switching to ${mode} mode`);
  
  updateModeButtons();
  
  // Smooth fade transition
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
}

/**
 * Handle concept selection
 */
async function handleConceptSelection(concept) {
  console.log(`🎯 Concept selected: ${concept.label}`);
  
  currentConcept = concept;
  currentDocId = concept.doc_id || window.getActiveDocId?.();
  selectedConceptId = concept.id;
  
  if (currentMode === 'ontology') {
    renderOntologyMode(concept);
  } else if (currentMode === 'document') {
    await renderDocumentMode(currentDocId);
    // Highlight and scroll to concept mentions
    highlightConceptInDocument(concept.id);
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
      <div style="padding: 24px; background: #0f172a;">
        <h3 style="font-size: 18px; margin-bottom: 16px; color: #818cf8; font-weight: 600;">${concept.label}</h3>
        
        <div style="margin-bottom: 20px;">
          <div style="color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">TYPE</div>
          <div style="color: #cbd5e1; font-size: 14px;">${concept.type || (concept.hierarchy_level === 1 ? 'Cluster' : 'Refinement')}</div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 20px; background: #1e293b; border-radius: 8px; border-left: 3px solid #4f46e5;">
          <div style="color: #818cf8; font-size: 11px; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">📝 SUMMARY</div>
          <div style="color: #e2e8f0; line-height: 1.7; font-size: 14px;">${concept.summary}</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">HIERARCHY LEVEL</div>
          <div style="color: #cbd5e1; font-size: 14px;">${concept.hierarchy_level === 1 ? 'Level 1 (Cluster)' : 'Level 2 (Refinement)'}</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">METADATA</div>
          <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #94a3b8;">
            ID: ${concept.id}
          </div>
        </div>
      </div>
    `;
  } else {
    // Regular concept view
    content.innerHTML = `
      <div style="padding: 24px; background: #0f172a;">
        <h3 style="font-size: 18px; margin-bottom: 16px; color: #818cf8; font-weight: 600;">${concept.label}</h3>
        
        ${hasSummary ? `
          <div style="margin-bottom: 20px; padding: 20px; background: #1e293b; border-radius: 8px; border-left: 3px solid #4f46e5;">
            <div style="color: #818cf8; font-size: 11px; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">📝 SUMMARY</div>
            <div style="color: #e2e8f0; line-height: 1.7; font-size: 14px;">${concept.summary}</div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 16px;">
          <div style="color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">TYPE</div>
          <div style="color: #cbd5e1; font-size: 14px;">${concept.type}</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">CONFIDENCE</div>
          <div style="color: #cbd5e1; font-size: 14px;">${Math.round((concept.confidence || 0) * 100)}%</div>
        </div>
        
        ${concept.aliases && concept.aliases.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <div style="color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">ALIASES</div>
            <div style="color: #cbd5e1; font-size: 14px;">${Array.isArray(concept.aliases) ? concept.aliases.join(', ') : concept.aliases}</div>
          </div>
        ` : ''}
        
        ${concept.tags && concept.tags.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <div style="color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">TAGS</div>
            <div style="color: #cbd5e1; font-size: 14px;">${Array.isArray(concept.tags) ? concept.tags.join(', ') : concept.tags}</div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 16px;">
          <div style="color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">METADATA</div>
          <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #94a3b8;">
            ${concept.model_name ? `Model: ${concept.model_name}<br>` : ''}
            ID: ${concept.id}
          </div>
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: #1e293b; border-radius: 6px; border: 1px solid #334155;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">💡 TIP</div>
          <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
            Switch to Paragraph mode to see this concept highlighted in the original text.
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Render document mode with paragraph formatting
 */
async function renderDocumentMode(docId) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Show loading state
  content.innerHTML = `
    <div style="color: #64748b; text-align: center; padding: 60px 20px; background: #0f172a;">
      <div style="font-size: 14px;">Loading document text...</div>
    </div>
  `;
  
  try {
    // Fetch document text and spans from backend
    const response = await fetch(`https://loomlite-production.up.railway.app/doc/${docId}/text`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch document text: ${response.statusText}`);
    }
    
    const data = await response.json();
    documentText = data.text;
    documentSpans = data.spans || [];
    
    console.log(`📄 Loaded document text (${documentText?.length || 0} characters, ${documentSpans.length} spans)`);
    
    // Render text with paragraph formatting and highlighting
    renderParagraphsWithHighlighting(documentText, documentSpans);
    
  } catch (error) {
    console.error('❌ Error loading document text:', error);
    
    content.innerHTML = `
      <div style="padding: 24px; background: #0f172a;">
        <div style="color: #ef4444; padding: 20px; background: #1e1b1b; border-radius: 8px; border: 1px solid #7f1d1d;">
          <div style="font-weight: 600; margin-bottom: 10px; font-size: 14px;">Document Text Not Available</div>
          <div style="font-size: 13px; color: #fca5a5; line-height: 1.6;">
            ${error.message}
          </div>
          <div style="margin-top: 16px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            The document text may not be stored in the database. This feature requires the original document text to be preserved during upload.
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Parse text into paragraphs and render with concept highlighting
 */
function renderParagraphsWithHighlighting(text, spans) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  if (!text) {
    content.innerHTML = `
      <div style="color: #64748b; text-align: center; padding: 60px 20px; background: #0f172a;">
        <div style="font-size: 14px;">No text content available</div>
      </div>
    `;
    return;
  }
  
  // Parse text into paragraphs (split by double newline)
  const paragraphs = text.split(/\n\n+/);
  
  // Sort spans by start position for efficient processing
  const sortedSpans = [...spans].sort((a, b) => a.start - b.start);
  
  // Build paragraph HTML with inline concept spans
  let currentOffset = 0;
  const paragraphsHTML = paragraphs.map((para, paraIndex) => {
    const paraStart = currentOffset;
    const paraEnd = paraStart + para.length;
    
    // Find spans that overlap with this paragraph
    const paraSpans = sortedSpans.filter(span => 
      span.start < paraEnd && span.end > paraStart
    );
    
    // Build highlighted paragraph HTML
    let paraHTML = '';
    let lastIndex = paraStart;
    
    paraSpans.forEach(span => {
      // Add text before span
      if (span.start > lastIndex) {
        const beforeText = text.substring(lastIndex, span.start);
        paraHTML += escapeHtml(beforeText);
      }
      
      // Add highlighted span with Perplexity-style yellow highlight
      const spanText = text.substring(span.start, span.end);
      const isSelected = selectedConceptId && span.concept_id === selectedConceptId;
      
      paraHTML += `<span 
        class="concept-span" 
        data-concept-id="${span.concept_id}"
        data-span-index="${span.span_index || ''}"
        style="
          background: ${isSelected ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.15)'};
          color: #fbbf24;
          padding: 2px 4px;
          border-radius: 3px;
          cursor: pointer;
          border-bottom: 2px solid ${isSelected ? 'rgba(251, 191, 36, 0.8)' : 'rgba(251, 191, 36, 0.4)'};
          transition: all 0.2s;
          font-weight: ${isSelected ? '600' : '500'};
        ">${escapeHtml(spanText)}</span>`;
      
      lastIndex = span.end;
    });
    
    // Add remaining text in paragraph
    if (lastIndex < paraEnd) {
      const remainingText = text.substring(lastIndex, paraEnd);
      paraHTML += escapeHtml(remainingText);
    }
    
    // Update offset for next paragraph (add paragraph length + newlines)
    currentOffset = paraEnd + 2; // Account for \n\n
    
    // Return formatted paragraph
    return `<p style="
      margin-bottom: 1.5em;
      line-height: 1.8;
      color: #cbd5e1;
      font-size: 15px;
    " data-para-index="${paraIndex}">${paraHTML}</p>`;
  }).join('');
  
  // Render with Perplexity-style container
  content.innerHTML = `
    <article id="document-text-container" style="
      max-width: 780px;
      margin: 0 auto;
      padding: 3rem 2.5rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0f172a;
    ">
      ${paragraphsHTML}
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
      if (span.dataset.conceptId !== selectedConceptId) {
        span.style.background = 'rgba(251, 191, 36, 0.25)';
        span.style.borderBottom = '2px solid rgba(251, 191, 36, 0.6)';
      }
    });
    
    span.addEventListener('mouseleave', () => {
      if (span.dataset.conceptId !== selectedConceptId) {
        span.style.background = 'rgba(251, 191, 36, 0.15)';
        span.style.borderBottom = '2px solid rgba(251, 191, 36, 0.4)';
      }
    });
  });
  
  // If a concept is already selected, scroll to it
  if (selectedConceptId) {
    highlightConceptInDocument(selectedConceptId);
  }
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
  
  // Highlight all spans of this concept
  highlightConceptInDocument(conceptId);
}

/**
 * Highlight all spans of a concept and scroll to first occurrence
 */
function highlightConceptInDocument(conceptId) {
  const content = document.getElementById('surface-viewer-content');
  if (!content) return;
  
  // Reset all spans
  content.querySelectorAll('.concept-span').forEach(span => {
    span.style.background = 'rgba(251, 191, 36, 0.15)';
    span.style.borderBottom = '2px solid rgba(251, 191, 36, 0.4)';
    span.style.fontWeight = '500';
  });
  
  // Highlight selected concept spans
  const selectedSpans = content.querySelectorAll(`.concept-span[data-concept-id="${conceptId}"]`);
  selectedSpans.forEach(span => {
    span.style.background = 'rgba(251, 191, 36, 0.3)';
    span.style.borderBottom = '2px solid rgba(251, 191, 36, 0.8)';
    span.style.fontWeight = '600';
  });
  
  // Scroll to first occurrence
  if (selectedSpans.length > 0) {
    selectedSpans[0].scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  }
}

/**
 * Fetch concept details and display
 */
async function fetchAndDisplayConcept(conceptId) {
  try {
    const response = await fetch(`https://loomlite-production.up.railway.app/doc/${currentDocId}/ontology`);
    const data = await response.json();
    
    const concept = data.concepts.find(c => c.id === conceptId);
    if (concept) {
      handleConceptSelection(concept);
    }
  } catch (error) {
    console.error('❌ Error fetching concept:', error);
  }
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

console.log('✅ Surface Viewer v3.0 module loaded');

