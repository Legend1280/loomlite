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
let currentMode = 'document'; // 'ontology' or 'document'
let currentConcept = null;
let currentDocId = null;
let documentText = null;
let documentSpans = [];
let selectedConceptId = null;
let allConcepts = []; // Store all concepts for hierarchy queries

/**
 * Initialize surface viewer
 */
export function initSurfaceViewer() {
  console.log('🔄 Initializing Enhanced Surface Viewer v3.0b...');
  
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
  
  console.log('✅ Enhanced Surface Viewer v3.0b initialized');
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
      btn.style.color = '#cbd5e1';
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
 * Render document mode with paragraph and list formatting
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
    
    console.log(`📄 Loaded document (${documentText?.length || 0} chars, ${documentSpans.length} spans, ${allConcepts.length} concepts)`);
    
    // Render text with structure preservation
    renderStructuredTextWithHighlighting(documentText, documentSpans);
    
  } catch (error) {
    console.error('❌ Error loading document:', error);
    
    content.innerHTML = `
      <div style="padding: 24px; background: #0f172a;">
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
      <div style="color: #64748b; text-align: center; padding: 60px 20px; background: #0f172a;">
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
        
        return `<li style="margin-bottom: 0.5em; color: #cbd5e1;">${lineHTML}</li>`;
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
        color: #cbd5e1;
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
      background: #0f172a;
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
        color: #cbd5e1;
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
    console.warn(`⚠️ Concept ${conceptId} not found`);
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
    span.style.color = '#cbd5e1';
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
      span.style.color = '#fbbf24';
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

console.log('✅ Surface Viewer v3.0b module loaded');

