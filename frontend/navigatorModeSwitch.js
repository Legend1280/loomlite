/**
 * Navigator Mode Switch Bar
 * Three-mode toggle: Standard / Meaning / Time
 * 
 * Part of Dynamic Navigator (v1.6)
 */

import { bus } from './eventBus.js';

// State
let currentMode = 'meaning';  // Default to Meaning (current semantic folders)

/**
 * Initialize Mode Switch Bar
 */
export function initModeSwitch(container) {
  // Load saved mode from localStorage
  const savedMode = localStorage.getItem('navigator_mode');
  if (savedMode && ['standard', 'meaning', 'time'].includes(savedMode)) {
    currentMode = savedMode;
  }
  
  // Render mode switch bar
  const modeSwitchBar = createModeSwitchBar();
  container.appendChild(modeSwitchBar);
  
  // Emit initial mode
  bus.emit('navigatorModeChanged', { 
    mode: currentMode,
    previousMode: null
  });
}

/**
 * Create Mode Switch Bar UI
 */
function createModeSwitchBar() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 12px 8px;
    background: #111111;
    border-bottom: 1px solid rgba(42, 42, 42, 0.4);
    gap: 4px;
  `;
  
  // Mode definitions with SVG icons
  const modes = [
    {
      id: 'standard',
      label: 'Standard',
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
      tooltip: 'File organization (Recent, PDF, etc.)'
    },
    {
      id: 'meaning',
      label: 'Meaning',
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
      tooltip: 'Ontology-based clusters (Projects, Concepts, etc.)'
    },
    {
      id: 'time',
      label: 'Time',
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      tooltip: 'Chronological groups (Today, This Week, etc.)'
    }
  ];
  
  // Create mode buttons
  modes.forEach(mode => {
    const button = createModeButton(mode);
    bar.appendChild(button);
  });
  
  return bar;
}

/**
 * Create individual mode button
 */
function createModeButton(mode) {
  const isActive = currentMode === mode.id;
  
  const button = document.createElement('button');
  button.setAttribute('data-mode', mode.id);
  button.setAttribute('title', mode.tooltip);
  button.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 4px;
    background: ${isActive ? 'rgba(34, 197, 94, 0.1)' : 'transparent'};
    border: 1px solid ${isActive ? '#22c55e' : 'rgba(42, 42, 42, 0.6)'};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  // Icon (SVG)
  const icon = document.createElement('div');
  icon.innerHTML = mode.iconSvg;
  icon.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${isActive ? '#22c55e' : '#9a9a9a'};
  `;
  
  // Label
  const label = document.createElement('span');
  label.textContent = mode.label;
  label.style.cssText = `
    font-size: 10px;
    font-weight: 500;
    color: ${isActive ? '#22c55e' : '#9a9a9a'};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  
  button.appendChild(icon);
  button.appendChild(label);
  
  // Hover effects
  button.onmouseover = () => {
    if (!isActive) {
      button.style.background = 'rgba(255, 255, 255, 0.05)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.12)';
    }
  };
  
  button.onmouseout = () => {
    if (!isActive) {
      button.style.background = 'transparent';
      button.style.borderColor = 'rgba(42, 42, 42, 0.6)';
    }
  };
  
  // Click handler
  button.onclick = () => {
    if (currentMode !== mode.id) {
      const previousMode = currentMode;
      currentMode = mode.id;
      
      // Save to localStorage
      localStorage.setItem('navigator_mode', currentMode);
      
      // Emit mode change event
      bus.emit('navigatorModeChanged', { 
        mode: currentMode,
        previousMode: previousMode
      });
      
      // Update UI
      updateModeButtons();
    }
  };
  
  return button;
}

/**
 * Update mode button states
 */
function updateModeButtons() {
  const buttons = document.querySelectorAll('[data-mode]');
  
  buttons.forEach(button => {
    const modeId = button.getAttribute('data-mode');
    const isActive = currentMode === modeId;
    const label = button.querySelector('span:last-child');
    
    // Update styles
    button.style.background = isActive ? 'rgba(34, 197, 94, 0.1)' : 'transparent';
    button.style.borderColor = isActive ? '#22c55e' : 'rgba(42, 42, 42, 0.6)';
    
    if (label) {
      label.style.color = isActive ? '#22c55e' : '#9a9a9a';
    }
  });
}

/**
 * Get current mode
 */
export function getCurrentMode() {
  return currentMode;
}

/**
 * Set mode programmatically
 */
export function setMode(mode) {
  if (['standard', 'meaning', 'time'].includes(mode)) {
    const previousMode = currentMode;
    currentMode = mode;
    localStorage.setItem('navigator_mode', currentMode);
    
    bus.emit('navigatorModeChanged', { 
      mode: currentMode,
      previousMode: previousMode
    });
    
    updateModeButtons();
  }
}

