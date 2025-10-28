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
  
  // Mode definitions
  const modes = [
    {
      id: 'standard',
      label: 'Standard',
      icon: '📁',
      tooltip: 'File organization (Recent, PDF, etc.)'
    },
    {
      id: 'meaning',
      label: 'Meaning',
      icon: '🧠',
      tooltip: 'Ontology-based clusters (Projects, Concepts, etc.)'
    },
    {
      id: 'time',
      label: 'Time',
      icon: '🕓',
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
  
  // Icon
  const icon = document.createElement('span');
  icon.textContent = mode.icon;
  icon.style.cssText = `
    font-size: 18px;
    line-height: 1;
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

