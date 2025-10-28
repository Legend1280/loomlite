/**
 * Dual Visualizer Module for Loom Lite v2.0
 * Manages the split-panel visualization with force-directed graph (top) and mind map (bottom)
 */

import { bus, setCurrentDocId, setCurrentConceptId } from './eventBus.js';
// import { drawMindMap } from './mindMap.js';

/**
 * Main function to draw the dual visualizer
 * @param {string} docId - Document ID to visualize
 */
// Store current visualization state
let currentSvg = null;
let currentOntology = null;

export async function drawDualVisualizer(docId) {
  try {
    // Fetch ontology data from API
    const response = await fetch(`https://loomlite-production.up.railway.app/doc/${docId}/ontology`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ontology: ${response.statusText}`);
    }
    const ontology = await response.json();
    currentOntology = ontology;
    
    // Get SVG containers
    const svgTop = d3.select('#visualizer-top svg');
    const svgBottom = d3.select('#visualizer-bottom svg');
    currentSvg = svgTop;
    
    // Clear existing content
    svgTop.selectAll('*').remove();
    svgBottom.selectAll('*').remove();
    
    // Render force-directed graph in top panel
    renderSolarSystem(svgTop, ontology);
    
    // Render mind map in bottom panel (placeholder for now)
    renderMindMapPlaceholder(svgBottom, ontology);
    
    // Listen for search results
    bus.on('searchResults', (event) => {
      const { results } = event.detail;
      highlightSearchResultsInSolar(results);
    });
    
    // Listen for search cleared
    bus.on('searchCleared', () => {
      resetSolarSearchHighlight();
    });
    
    // Listen for center command (triple-click)
    bus.on('centerSolarSystem', () => {
      centerSolarView();
    });
    
    console.log('Dual Visualizer rendered successfully');
  } catch (error) {
    console.error('Error rendering dual visualizer:', error);
  }
}

/**
 * Render Solar System visualization with orbital hierarchy
 * @param {d3.Selection} svg - D3 selection of SVG element
 * @param {Object} data - Ontology data with concepts and relations
 */
function renderSolarSystem(svg, data) {
  // Clear ALL previous elements completely
  svg.selectAll('*').remove();
  
  const width = svg.node().parentElement.clientWidth;
  const height = svg.node().parentElement.clientHeight;
  
  svg.attr('width', width).attr('height', height);
  
  // Prepare data
  const concepts = data.concepts || [];
  const relations = data.relations || [];
  const document = data.doc || data.document || {};
  
  console.log(`Rendering Solar System: ${concepts.length} concepts, ${relations.length} relations`);
  console.log('Document:', document);
  
  // Calculate center point
  const centerX = width / 2;
  const centerY = height / 2;
  
  console.log('📐 SVG size:', width, 'x', height);
  console.log('🎯 Transform center:', centerX, centerY);
  
  // Create document summary node for center
  const documentNode = {
    id: 'doc-' + (document.id || 'root'),
    label: document.title || document.filename || 'Document',
    summary: document.summary || 'Document summary',
    type: 'Document',
    hierarchy_level: 0,
    confidence: 1.0,
    doc_id: document.id
  };
  
  // Apply polar layout (includes document node)
  const layoutData = calculatePolarLayout([documentNode, ...concepts], centerX, centerY);
  
  console.log('📊 Layout nodes:', layoutData.nodes.length);
  console.log('☀️ Document node:', layoutData.nodes.find(n => n.hierarchy_level === 0));
  console.log('🪐 Planet nodes:', layoutData.nodes.filter(n => n.hierarchy_level > 0).length);
  
  // Group by hierarchy for orbit rings
  const orbitLevels = d3.group(layoutData.nodes, d => d.hierarchy_level ?? 4);
  
  // Create container groups
  const g = svg.append('g');
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.3, 3])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  
  svg.call(zoom);
  
  // Create node lookup for relations
  const nodeById = new Map(layoutData.nodes.map(n => [n.id, n]));
  
  // Draw orbit rings (bottom layer) - tilted ellipses for 3D effect
  const orbitRings = g.append('g').attr('class', 'orbit-rings');
  
  // Orbit configurations - completely flat horizontal ellipses (no tilt)
  const orbitConfigs = [
    { tilt: 0, rotation: 0, flatten: 0.35 },      // Level 1: flat, moderately elliptical
    { tilt: 0, rotation: 0, flatten: 0.30 },      // Level 2: flat, more elliptical
    { tilt: 0, rotation: 0, flatten: 0.25 },      // Level 3: flat, very elliptical
    { tilt: 0, rotation: 0, flatten: 0.20 }       // Level 4: flat, extremely elliptical
  ];
  
  console.log('🌌 Orbit levels:', Array.from(orbitLevels.keys()));
  
  let configIndex = 0;
  orbitLevels.forEach((nodes, level) => {
    if (level === 0) return; // Skip sun
    
    const radius = nodes[0].orbitRadius; // All nodes at same level have same orbit
    const config = orbitConfigs[configIndex % orbitConfigs.length];
    configIndex++;
    
    // Create ellipse with subtle planetary tilt
    console.log(`🛸 Creating orbit at level ${level}, radius ${radius}, tilt ${config.tilt}°, rotation ${config.rotation}°`);
    
    // Draw flat horizontal ellipse (no rotation or tilt)
    const ellipseGroup = orbitRings.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);
    
    ellipseGroup.append('ellipse')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('rx', radius)
      .attr('ry', radius * config.flatten) // Variable flattening for depth
      .attr('fill', 'none')
      .attr('stroke', '#444444')  // Light gray for minimal aesthetic
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.4);
  });
  
  // Debug: Check if ellipses were actually created
  console.log('🔍 Ellipses created:', g.selectAll('ellipse').size());
  g.selectAll('ellipse').each(function(d, i) {
    const el = d3.select(this);
    const parent = d3.select(this.parentNode);
    console.log(`  Ellipse ${i}: rx=${el.attr('rx')}, ry=${el.attr('ry')}, parent transform=${parent.attr('transform')}`);
  });
  
  // Draw relation lines (middle layer)
  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(relations.filter(r => r.confidence >= 0.3))
    .join('line')
    .attr('x1', d => nodeById.get(d.src)?.x || centerX)
    .attr('y1', d => nodeById.get(d.src)?.y || centerY)
    .attr('x2', d => nodeById.get(d.dst)?.x || centerX)
    .attr('y2', d => nodeById.get(d.dst)?.y || centerY)
    .attr('stroke', '#3a3a3a')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', d => d.confidence * 0.4);
  
  // Draw nodes (top layer)
  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('circle')
    .data(layoutData.nodes)
    .join('circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', d => d.nodeSize)
    .attr('fill', 'transparent')  // Transparent fill makes entire circle clickable
    .attr('stroke', d => d.hierarchy_level === 0 ? '#ffd700' : '#ffffff')  // Gold sun, white nodes
    .attr('stroke-width', d => d.hierarchy_level === 0 ? 3 : 1.5)
    .style('cursor', 'pointer')
    .style('pointer-events', 'all')  // Ensure entire circle responds to events
    .each(function(d) {
      // Store element reference for animation
      d.element = this;
    })
    .on('click', (event, d) => {
      bus.emit('conceptSelected', { 
        conceptId: d.id, 
        docId: d.doc_id,
        concept: d
      });
      setCurrentConceptId(d.id, d.doc_id);
      
      // Visual feedback with cyan highlight
      node.attr('stroke', n => n.id === d.id ? '#00ffcc' : '#ffffff')
          .attr('stroke-width', n => n.id === d.id ? 3 : (n.hierarchy_level === 0 ? 3 : 1.5));
    })
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('stroke', '#00ffcc')
        .attr('stroke-width', d.hierarchy_level === 0 ? 3 : 2.5)
        .attr('stroke-opacity', 1.0);
      
      showTooltip(event, d);
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', d.hierarchy_level === 0 ? 3 : 1.5)
        .attr('stroke-opacity', 1.0);
      
      hideTooltip();
    });
  
  // Add labels for all nodes (will be updated in animation)
  const label = g.append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data(layoutData.nodes)
    .join('text')
    .text(d => d.label)
    .attr('x', d => d.x)
    .attr('y', d => d.y + (d.hierarchy_level === 0 ? 35 : 20))
    .attr('font-size', d => d.hierarchy_level === 0 ? 12 : 10)
    .attr('font-weight', d => d.hierarchy_level === 0 ? 'bold' : 'normal')
    .attr('fill', '#ffffff')
    .attr('text-anchor', 'middle')
    .style('pointer-events', 'none')
    .style('opacity', 0.8)
    .each(function(d) {
      // Store label element reference for animation
      d.labelElement = this;
    });
  
  // Store references for search highlighting
  svg.selectAll('.node').data(layoutData.nodes);
  svg.selectAll('.link').data(relations);
  
  // Start orbital animation
  startOrbitalAnimation(layoutData.nodes, centerX, centerY, orbitConfigs);
}

/**
 * Animate nodes along elliptical orbits
 * @param {Array} nodes - Array of node objects with orbital data
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {Array} orbitConfigs - Orbit configuration array
 */
function startOrbitalAnimation(nodes, centerX, centerY, orbitConfigs) {
  let animationId = null;
  let startTime = Date.now();
  
  function animate() {
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    
    nodes.forEach((node, i) => {
      if (node.hierarchy_level === 0) return; // Skip sun
      
      // Get orbit configuration for this node's level
      const configIndex = Math.min(node.hierarchy_level - 1, orbitConfigs.length - 1);
      const config = orbitConfigs[configIndex];
      
      // Calculate orbital speed (inner orbits faster)
      const baseSpeed = 0.02; // radians per second (slower, more contemplative)
      const speed = baseSpeed / Math.sqrt(node.orbitRadius / 150); // Kepler's 3rd law approximation
      
      // Calculate current angle
      const currentAngle = (node.angle || 0) + (elapsed * speed);
      
      // Elliptical orbit parameters - flat horizontal ellipse
      const rx = node.orbitRadius;
      const ry = node.orbitRadius * config.flatten;
      
      // Calculate position on flat horizontal ellipse
      const rotatedX = rx * Math.cos(currentAngle);
      const rotatedY = ry * Math.sin(currentAngle);
      
      // Final position
      const x = centerX + rotatedX;
      const y = centerY + rotatedY;
      
      // Calculate depth for flat ellipse (top is far, bottom is near)
      const yPosition = Math.sin(currentAngle); // -1 (top/far) to +1 (bottom/near)
      const scale = 0.8 + (yPosition * 0.2); // Scale from 0.8 to 1.0
      const opacity = 0.7 + (yPosition * 0.3); // Opacity from 0.7 to 1.0
      
      // Update node position and appearance
      if (node.element) {
        d3.select(node.element)
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', node.nodeSize * scale)
          .style('opacity', node.hierarchy_level === 0 ? 1 : opacity);
      }
      
      // Update label position to follow node
      if (node.labelElement) {
        d3.select(node.labelElement)
          .attr('x', x)
          .attr('y', y + (node.hierarchy_level === 0 ? 35 : 20))
          .style('opacity', node.hierarchy_level === 0 ? 1 : opacity * 0.8);
      }
    });
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Start animation
  animate();
  
  // Store animation ID for cleanup
  if (typeof window !== 'undefined') {
    window.solarAnimationId = animationId;
  }
}

/**
 * Render mind map placeholder (will be replaced with actual mind map)
 * @param {d3.Selection} svg - D3 selection of SVG element
 * @param {Object} data - Ontology data
 */
function renderMindMapPlaceholder(svg, data) {
  const width = svg.node().parentElement.clientWidth;
  const height = svg.node().parentElement.clientHeight;
  
  svg.attr('width', width).attr('height', height);
  
  // Add placeholder text
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2)
    .attr('text-anchor', 'middle')
    .attr('font-size', 16)
    .attr('fill', '#64748b')
    .text('Mind Map View - Coming Soon');
  
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2 + 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .attr('fill', '#64748b')
    .text(`${data.concepts?.length || 0} concepts ready for hierarchical visualization`);
}

/**
 * Calculate polar layout for solar system visualization
 * @param {Array} concepts - Array of concept objects
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @returns {Object} Layout data with positioned nodes
 */
function calculatePolarLayout(concepts, centerX, centerY) {
  const baseRadius = 150;
  const baseSize = 12;  // Increased to 12 for better visibility
  const maxConnections = Math.max(...concepts.map(c => 
    concepts.filter(other => 
      concepts.some(r => (r.src === c.id && r.dst === other.id) || (r.src === other.id && r.dst === c.id))
    ).length
  ), 1);
  
  // Group by hierarchy level
  const grouped = d3.group(concepts, d => d.hierarchy_level ?? 4);
  
  const nodes = [];
  
  grouped.forEach((group, level) => {
    if (level === 0) {
      // Sun at center
      group.forEach(node => {
        nodes.push({
          ...node,
          x: centerX,
          y: centerY,
          orbitRadius: 0,
          nodeSize: 20,  // Sun size
          connections: 0
        });
      });
    } else {
      // Planets, moons, asteroids on orbits
      const angleStep = (2 * Math.PI) / group.length;
      
      group.forEach((node, i) => {
        const confidence = node.confidence || 0.7;
        
        // Count connections for this node FIRST
        const connections = concepts.filter(other => 
          concepts.some(r => (r.src === node.id && r.dst === other.id) || (r.src === other.id && r.dst === node.id))
        ).length;
        
        // Base radius for this hierarchy level
        const levelRadius = baseRadius * level;
        
        // Add variance based on confidence and connections (±12% total)
        const confidenceVariance = (1 - confidence) * 0.08; // 0 to 0.08
        const connectionVariance = (connections / maxConnections) * 0.08; // 0 to 0.08
        const randomVariance = (Math.random() - 0.5) * 0.12; // -0.06 to +0.06
        
        // Final radius with variance (can be ±12% from base)
        const radiusMultiplier = 1 + confidenceVariance - connectionVariance + randomVariance;
        const orbitRadius = levelRadius * radiusMultiplier;
        
        const angle = i * angleStep;
        
        const nodeSize = baseSize * (1 + 0.3 * (connections / maxConnections));  // Scale with connections
        
        nodes.push({
          ...node,
          x: centerX + orbitRadius * Math.cos(angle),
          y: centerY + orbitRadius * Math.sin(angle),
          orbitRadius: orbitRadius,
          nodeSize: nodeSize,
          connections: connections,
          angle: angle
        });
      });
    }
  });
  
  return { nodes };
}

/**
 * Get desaturated color for solar system concept type
 * @param {string} type - Concept type
 * @returns {string} Color hex code
 */
function solarTypeColor(type) {
  const colors = {
    Topic: '#8ab4f8',      // Soft blue
    Feature: '#81c995',    // Soft green
    Technology: '#c58af9', // Soft purple
    Project: '#f28b82',    // Soft red
    Financial: '#fdd663',  // Soft yellow
    Research: '#78d9c8',   // Soft teal
    Person: '#f1b4f8',     // Soft pink
    Date: '#a8dab5',       // Soft mint
    Metric: '#91c3fd',     // Soft sky blue
    Process: '#f5a97f',    // Soft orange
    Team: '#a5a8f9'        // Soft lavender
  };
  return colors[type] || '#9aa0a6'; // Soft gray
}

/**
 * Get color for concept type (Galaxy View - solid colors)
 * @param {string} type - Concept type
 * @returns {string} Color hex code
 */
function typeColor(type) {
  const colors = {
    Person: '#8b5cf6',      // purple
    Project: '#f59e0b',     // orange
    Date: '#10b981',        // green
    Metric: '#3b82f6',      // blue
    Technology: '#06b6d4',  // cyan
    Feature: '#ec4899',     // pink
    Process: '#f97316',     // orange-red
    Topic: '#84cc16',       // lime
    Team: '#6366f1'         // indigo
  };
  return colors[type] || '#94a3b8'; // default gray
}

/**
 * Show tooltip for node
 * @param {Event} event - Mouse event
 * @param {Object} d - Node data
 */
function showTooltip(event, d) {
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'node-tooltip')
    .style('position', 'absolute')
    .style('background', '#1e293b')
    .style('color', '#e2e8f0')
    .style('padding', '8px 12px')
    .style('border-radius', '6px')
    .style('border', '1px solid #334155')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('left', `${event.pageX + 10}px`)
    .style('top', `${event.pageY + 10}px`)
    .html(() => {
      // Show document summary for sun (hierarchy_level 0)
      if (d.hierarchy_level === 0) {
        return `
          <strong>${d.label}</strong><br>
          <span style="color: #94a3b8;">Document Summary</span><br>
          <div style="margin-top: 6px; max-width: 300px; line-height: 1.4;">
            ${d.summary || 'No summary available'}
          </div>
        `;
      }
      // Regular concept tooltip
      return `
        <strong>${d.label}</strong><br>
        <span style="color: #94a3b8;">Type: ${d.type}</span><br>
        <span style="color: #94a3b8;">Confidence: ${Math.round((d.confidence || 0) * 100)}%</span>
      `;
    });
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  d3.selectAll('.node-tooltip').remove();
}

/**
 * Highlight concepts in Solar System view based on search results
 * @param {Array} results - Search results array
 */
function highlightSearchResultsInSolar(results) {
  if (!currentSvg || !currentOntology) return;
  
  // Extract concept IDs from new v1.6 response format
  const matchedConceptIds = new Set();
  
  // Handle new format: results is array of documents with concepts
  if (results && results.length > 0 && results[0].concepts) {
    results.forEach(doc => {
      doc.concepts?.forEach(concept => {
        if (currentOntology.concepts.some(c => c.id === concept.id)) {
          matchedConceptIds.add(concept.id);
        }
      });
    });
  } else {
    // Legacy format: results is array of concepts
    results
      .filter(r => currentOntology.concepts.some(c => c.id === r.id))
      .forEach(r => matchedConceptIds.add(r.id));
  }
  
  console.log(`Filtering ${matchedConceptIds.size} concepts in Solar System View (v1.6)`);
  
  if (matchedConceptIds.size === 0) {
    // No matches in current document, fade all to 0.1
    currentSvg.selectAll('circle')
      .transition()
      .duration(400)
      .style('opacity', 0.1);
    
    // Also fade links
    currentSvg.selectAll('line')
      .transition()
      .duration(400)
      .style('opacity', 0.05);
    return;
  }
  
  // Filter matching concepts (fade non-matching to 0.1)
  currentSvg.selectAll('circle')
    .transition()
    .duration(400)
    .style('opacity', d => matchedConceptIds.has(d.id) ? 1.0 : 0.1)
    .attr('stroke', d => matchedConceptIds.has(d.id) ? '#10b981' : '#fff')
    .attr('stroke-width', d => matchedConceptIds.has(d.id) ? 3 : 1.5);
  
  // Fade links connected to non-matching concepts
  currentSvg.selectAll('line')
    .transition()
    .duration(400)
    .style('opacity', d => {
      const sourceMatch = matchedConceptIds.has(d.source.id);
      const targetMatch = matchedConceptIds.has(d.target.id);
      return (sourceMatch || targetMatch) ? 0.6 : 0.05;
    });
  
  // Pulse effect for matched concepts
  currentSvg.selectAll('circle')
    .filter(d => matchedConceptIds.has(d.id))
    .transition()
    .duration(500)
    .attr('r', 12)
    .transition()
    .duration(500)
    .attr('r', 8);
}

/**
 * Reset search highlight in Solar System view (v1.6)
 */
function resetSolarSearchHighlight() {
  if (!currentSvg) return;
  
  console.log('Resetting Solar System View search filter');
  
  currentSvg.selectAll('circle')
    .transition()
    .duration(400)
    .style('opacity', 1)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);
  
  currentSvg.selectAll('line')
    .transition()
    .duration(400)
    .style('opacity', 0.6);
}

// Listen for external concept selection events
bus.on('conceptSelected', (event) => {
  const { conceptId } = event.detail;
  
  // Highlight the selected node in the visualization
  const svg = d3.select('#visualizer-top svg');
  svg.selectAll('circle')
    .attr('stroke', d => d.id === conceptId ? '#fbbf24' : '#fff')
    .attr('stroke-width', d => d.id === conceptId ? 3 : 1.5);
  
  console.log(`Dual Visualizer: Highlighted concept ${conceptId}`);
});

/**
 * Center the Solar System view
 */
function centerSolarView() {
  console.log('Centering Solar System view...');
  
  const svg = d3.select('#visualizer-top svg');
  if (svg.empty()) return;
  
  const container = document.getElementById('visualizer-top');
  if (!container) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Get the main group element
  const g = svg.select('g');
  if (g.empty()) return;
  
  // Calculate center position
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Reset zoom and pan to center with smooth transition
  svg.transition()
    .duration(600)
    .ease(d3.easeCubicInOut)
    .call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(0, 0).scale(1)
    );
}

// Export for global access
window.drawDualVisualizer = drawDualVisualizer;
window.highlightSearchResultsInSolar = highlightSearchResultsInSolar;
window.resetSolarSearchHighlight = resetSolarSearchHighlight;

