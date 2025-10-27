/**
 * Quadrant Focus Module v2
 * Focus Mode for: Solar System, Mind Map, Document Viewer
 * Sidebar auto-collapses like Manus.ai
 */

import { bus } from './eventBus.js';

// State
let focusedPanel = null;
let clickCount = 0;
let clickTimer = null;
let lastClickedPanel = null;

// Focusable panels (the 3 main views)
const FOCUSABLE_PANELS = {
  SOLAR: 'visualizer-top',
  MINDMAP: 'visualizer-bottom',
  SURFACE: 'surface-viewer'
};

/**
 * Initialize quadrant focus system
 */
export function initQuadrantFocus() {
  console.log('Initializing Quadrant Focus system...');
  
  // Add click handlers to focusable panels only
  Object.values(FOCUSABLE_PANELS).forEach(panelId => {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.addEventListener('click', (e) => handlePanelClick(panelId, e));
      // Add smooth transitions
      panel.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  });
  
  // Add transitions to sidebar and center container
  const sidebar = document.getElementById('sidebar');
  const center = document.getElementById('center');
  if (sidebar) sidebar.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  if (center) center.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  
  // Add escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && focusedPanel) {
      exitFocusMode();
    }
  });
  
  // Add click outside handler - single click to exit
  document.addEventListener('click', (e) => {
    if (focusedPanel) {
      // Check if click is outside the focused panel
      const clickedPanel = e.target.closest(`#${focusedPanel}`);
      if (!clickedPanel) {
        // Ignore clicks on toolbar, resize handles, and interactive elements
        if (!e.target.closest('#toolbar') && 
            !e.target.closest('.resize-handle') &&
            !e.target.closest('button') &&
            !e.target.closest('input')) {
          exitFocusMode();
        }
      }
    }
  });
  
  console.log('Quadrant Focus system initialized');
}

/**
 * Handle panel click with double/triple detection
 */
function handlePanelClick(panelId, event) {
  // Ignore clicks on interactive elements (buttons, links, etc.)
  if (event.target.closest('button, a, input, select, textarea')) {
    return;
  }
  
  // Track clicks for the same panel
  if (lastClickedPanel !== panelId) {
    clickCount = 0;
    lastClickedPanel = panelId;
  }
  
  clickCount++;
  clearTimeout(clickTimer);
  
  clickTimer = setTimeout(() => {
    if (clickCount === 2) {
      handleDoubleClick(panelId);
    } else if (clickCount >= 3) {
      handleTripleClick(panelId);
    }
    clickCount = 0;
  }, 300);
}

/**
 * Handle double-click: Enter focus mode
 */
function handleDoubleClick(panelId) {
  console.log(`Double-click detected on ${panelId}`);
  
  if (focusedPanel === panelId) {
    // Already focused, exit focus mode
    exitFocusMode();
  } else {
    // Enter focus mode
    enterFocusMode(panelId);
  }
}

/**
 * Handle triple-click: Semantic centering (Mind Map and Solar only)
 */
function handleTripleClick(panelId) {
  console.log(`Triple-click detected on ${panelId}`);
  
  // Only apply to Mind Map and Solar views
  if (panelId === FOCUSABLE_PANELS.MINDMAP) {
    centerMindMap();
  } else if (panelId === FOCUSABLE_PANELS.SOLAR) {
    centerSolarSystem();
  }
}

/**
 * Enter focus mode for a panel (90% screen)
 */
function enterFocusMode(panelId) {
  focusedPanel = panelId;
  const app = document.getElementById('app');
  
  console.log(`Entering focus mode for ${panelId}`);
  
  // Add focus mode class
  app.classList.add('focus-mode');
  app.dataset.focusedPanel = panelId;
  
  // Get elements
  const sidebar = document.getElementById('sidebar');
  const center = document.getElementById('center');
  const surface = document.getElementById('surface-viewer');
  const resizeHandles = document.querySelectorAll('.resize-handle');
  
  // Hide resize handles during focus mode
  resizeHandles.forEach(handle => {
    handle.style.opacity = '0';
    handle.style.pointerEvents = 'none';
  });
  
  // Collapse sidebar (Manus.ai style)
  if (sidebar) {
    sidebar.style.width = '0';
    sidebar.style.opacity = '0';
    sidebar.style.overflow = 'hidden';
  }
  
  // Apply focus based on which panel
  switch (panelId) {
    case FOCUSABLE_PANELS.SOLAR:
      // Solar System takes 90% of screen
      if (center) {
        center.style.flex = '1';
        center.style.width = '90%';
      }
      if (surface) {
        surface.style.width = '0';
        surface.style.opacity = '0';
        surface.style.overflow = 'hidden';
      }
      // Hide Mind Map, show Solar
      const mindmap = document.getElementById('visualizer-bottom');
      const resizeCenter = document.getElementById('resize-center');
      if (mindmap) {
        mindmap.style.display = 'none';
      }
      if (resizeCenter) {
        resizeCenter.style.display = 'none';
      }
      break;
      
    case FOCUSABLE_PANELS.MINDMAP:
      // Mind Map takes 90% of screen
      if (center) {
        center.style.flex = '1';
        center.style.width = '90%';
      }
      if (surface) {
        surface.style.width = '0';
        surface.style.opacity = '0';
        surface.style.overflow = 'hidden';
      }
      // Hide Solar, show Mind Map
      const solar = document.getElementById('visualizer-top');
      const resizeCenterMM = document.getElementById('resize-center');
      if (solar) {
        solar.style.display = 'none';
      }
      if (resizeCenterMM) {
        resizeCenterMM.style.display = 'none';
      }
      break;
      
    case FOCUSABLE_PANELS.SURFACE:
      // Document Viewer (Surface) takes 90% of screen
      if (center) {
        center.style.width = '0';
        center.style.opacity = '0';
        center.style.overflow = 'hidden';
      }
      if (surface) {
        surface.style.width = '90%';
        surface.style.flex = '1';
        surface.style.opacity = '1';
      }
      break;
  }
  
  // Add visual indicator (subtle glow)
  const focusedElement = document.getElementById(panelId);
  if (focusedElement) {
    focusedElement.style.boxShadow = '0 0 20px rgba(250, 214, 67, 0.2)';
  }
  
  // Emit focus event
  bus.emit('panelFocused', { panelId });
}

/**
 * Exit focus mode and restore normal layout
 */
function exitFocusMode() {
  if (!focusedPanel) return;
  
  console.log(`Exiting focus mode from ${focusedPanel}`);
  
  const app = document.getElementById('app');
  const sidebar = document.getElementById('sidebar');
  const center = document.getElementById('center');
  const surface = document.getElementById('surface-viewer');
  const resizeHandles = document.querySelectorAll('.resize-handle');
  
  // Remove focus mode class
  app.classList.remove('focus-mode');
  delete app.dataset.focusedPanel;
  
  // Restore sidebar (Manus.ai style expand)
  if (sidebar) {
    sidebar.style.width = '16rem';
    sidebar.style.opacity = '1';
    sidebar.style.overflow = 'auto';
  }
  
  // Restore center panel
  if (center) {
    center.style.flex = '1';
    center.style.width = 'auto';
    center.style.opacity = '1';
    center.style.overflow = 'visible';
  }
  
  // Restore surface viewer
  if (surface) {
    surface.style.width = '28rem';
    surface.style.flex = 'initial';
    surface.style.opacity = '1';
    surface.style.overflow = 'auto';
  }
  
  // Restore visibility of visualizers based on current view mode
  const solar = document.getElementById('visualizer-top');
  const mindmap = document.getElementById('visualizer-bottom');
  const resizeCenter = document.getElementById('resize-center');
  
  // Check current view mode
  if (app.classList.contains('split-mode')) {
    if (solar) solar.style.display = 'flex';
    if (mindmap) mindmap.style.display = 'flex';
    if (resizeCenter) resizeCenter.style.display = 'block';
  } else if (app.classList.contains('solar-only')) {
    if (solar) solar.style.display = 'flex';
    if (mindmap) mindmap.style.display = 'none';
    if (resizeCenter) resizeCenter.style.display = 'none';
  } else if (app.classList.contains('mind-only')) {
    if (solar) solar.style.display = 'none';
    if (mindmap) mindmap.style.display = 'flex';
    if (resizeCenter) resizeCenter.style.display = 'none';
  }
  
  // Show resize handles
  resizeHandles.forEach(handle => {
    handle.style.opacity = '1';
    handle.style.pointerEvents = 'auto';
  });
  
  // Remove glow
  const focusedElement = document.getElementById(focusedPanel);
  if (focusedElement) {
    focusedElement.style.boxShadow = 'none';
  }
  
  // Emit unfocus event
  bus.emit('panelUnfocused', { panelId: focusedPanel });
  
  focusedPanel = null;
}

/**
 * Center the Mind Map view on current concept
 */
function centerMindMap() {
  console.log('Centering Mind Map view...');
  
  // Emit event for Mind Map module to handle
  bus.emit('centerMindMap', {});
}

/**
 * Center the Solar System view on selected node
 */
function centerSolarSystem() {
  console.log('Centering Solar System view...');
  
  // Emit event for Solar System module to handle
  bus.emit('centerSolarSystem', {});
}

/**
 * Get current focus state
 */
export function getFocusedPanel() {
  return focusedPanel;
}

/**
 * Check if a panel is focused
 */
export function isPanelFocused(panelId) {
  return focusedPanel === panelId;
}

/**
 * Programmatically enter focus mode
 */
export function focusPanel(panelId) {
  if (Object.values(FOCUSABLE_PANELS).includes(panelId)) {
    enterFocusMode(panelId);
  }
}

/**
 * Programmatically exit focus mode
 */
export function unfocusPanel() {
  exitFocusMode();
}

