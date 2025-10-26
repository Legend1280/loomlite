/**
 * Surface Viewer Module for Loom Lite v2.0
 * Manages right panel with dual-mode viewer (Ontology | Document)
 * 
 * Status: Placeholder - Full implementation in LOOM-V2-004
 */

/**
 * Initialize surface viewer
 */
export function initSurfaceViewer() {
  console.log('📋 Surface Viewer placeholder initialized - awaiting LOOM-V2-004 implementation');
  
  const surfaceViewer = document.getElementById('surface-viewer');
  if (!surfaceViewer) {
    console.warn('⚠️ Surface Viewer element not found');
    return;
  }
  
  surfaceViewer.innerHTML = `
    <div style="padding: 16px; color: #64748b; font-size: 13px;">
      <div style="font-weight: 600; margin-bottom: 8px;">📄 Surface Viewer</div>
      <div style="font-size: 12px;">Dual-mode viewer - Coming in LOOM-V2-004</div>
      <div style="margin-top: 12px; font-size: 11px; line-height: 1.6;">
        Will support:<br>
        • Ontology metadata display<br>
        • Document text with evidence highlighting<br>
        • Click-to-navigate concept mentions<br>
        • Scroll synchronization
      </div>
    </div>
  `;
  
  // Listen for selectNode events
  window.addEventListener('selectNode', (event) => {
    const concept = event.detail;
    updateSurfaceViewer(concept);
  });
}

/**
 * Update surface viewer with concept details
 * @param {Object} concept - Selected concept data
 */
function updateSurfaceViewer(concept) {
  const surfaceViewer = document.getElementById('surface-viewer');
  if (!surfaceViewer) return;
  
  surfaceViewer.innerHTML = `
    <div style="padding: 16px; color: #e2e8f0; font-size: 13px;">
      <h3 style="font-size: 16px; margin-bottom: 16px;">${concept.label}</h3>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">TYPE</div>
        <div>${concept.type}</div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">CONFIDENCE</div>
        <div>${Math.round((concept.confidence || 0) * 100)}%</div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">ID</div>
        <div style="font-family: monospace; font-size: 11px;">${concept.id}</div>
      </div>
      
      <div style="margin-top: 20px; padding: 12px; background: #0f172a; border-radius: 6px; font-size: 11px; color: #64748b;">
        Enhanced Surface Viewer coming in LOOM-V2-004
      </div>
    </div>
  `;
}

// Export for global access
window.initSurfaceViewer = initSurfaceViewer;
window.updateSurfaceViewer = updateSurfaceViewer;

