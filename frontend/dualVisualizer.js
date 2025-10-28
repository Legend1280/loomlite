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
  
  // Different tilt configurations for each hierarchy level
  const orbitConfigs = [
    { tilt: 15, rotation: 0, flatten: 0.3 },    // Level 1: slight tilt
    { tilt: 35, rotation: 45, flatten: 0.4 },   // Level 2: medium tilt, rotated
    { tilt: 55, rotation: 90, flatten: 0.5 },   // Level 3: steep tilt, perpendicular
    { tilt: 70, rotation: 135, flatten: 0.6 }   // Level 4: very steep, diagonal
  ];
  
  console.log('🌌 Orbit levels:', Array.from(orbitLevels.keys()));
  
  let configIndex = 0;
  orbitLevels.forEach((nodes, level) => {
    if (level === 0) return; // Skip sun
    
    const radius = nodes[0].orbitRadius; // All nodes at same level have same orbit
    const config = orbitConfigs[configIndex % orbitConfigs.length];
    configIndex++;
    
    // Create ellipse with 3D perspective tilt
    console.log(`🛸 Creating orbit at level ${level}, radius ${radius}, tilt ${config.tilt}°, rotation ${config.rotation}°`);
    
    const ellipseGroup = orbitRings.append('g')
      .attr('transform', `translate(${centerX}, ${centerY}) rotate(${config.rotation})`);
    
    ellipseGroup.append('ellipse')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('rx', radius)
      .attr('ry', radius * config.flatten) // Variable flattening for depth
      .attr('fill', 'none')
      .attr('stroke', '#4a4a4a')  // Lighter gray for visibility
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.5);  // Increased opacity
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
    .attr('fill', d => d.hierarchy_level === 0 ? '#ffd700' : 'none')  // Sun is solid gold
    .attr('stroke', d => d.hierarchy_level === 0 ? 'none' : solarTypeColor(d.type))
    .attr('stroke-width', d => d.hierarchy_level === 0 ? 0 : 1.5)
    .style('cursor', 'pointer')
    .each(function(d) {
      // Store original data for animation
      d3.select(this).datum().element = this;
    })
    .on('click', (event, d) => {
      bus.emit('conceptSelected', { 
        conceptId: d.id, 
        docId: d.doc_id,
        concept: d
      });
      setCurrentConceptId(d.id, d.doc_id);
      
      // Visual feedback
      node.attr('stroke', n => n.id === d.id ? '#4a90e2' : (n.hierarchy_level === 0 ? 'none' : solarTypeColor(n.type)))
          .attr('stroke-width', n => n.id === d.id ? 2.5 : (n.hierarchy_level === 0 ? 0 : 1.5));
    })
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('stroke-width', d.hierarchy_level === 0 ? 0 : 2.5)
        .attr('stroke-opacity', 1.0);
      
      showTooltip(event, d);
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .attr('stroke-width', d.hierarchy_level === 0 ? 0 : 1.5)
        .attr('stroke-opacity', 1.0);
      
      hideTooltip();
    });
  
  // Add labels (only for sun and on hover for others)
  const label = g.append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data(layoutData.nodes.filter(d => d.hierarchy_level === 0))
    .join('text')
    .text(d => d.label)
    .attr('x', d => d.x)
    .attr('y', d => d.y + 35)
    .attr('font-size', 14)
    .attr('font-weight', 'bold')
    .attr('fill', '#e6e6e6')
    .attr('text-anchor', 'middle')
    .style('pointer-events', 'none');
  
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
      
      // Elliptical orbit parameters
      const rx = node.orbitRadius;
      const ry = node.orbitRadius * config.flatten;
      const rotation = (config.rotation * Math.PI) / 180;
      
      // Calculate position on ellipse
      const localX = rx * Math.cos(currentAngle);
      const localY = ry * Math.sin(currentAngle);
      
      // Rotate the ellipse
      const rotatedX = localX * Math.cos(rotation) - localY * Math.sin(rotation);
      const rotatedY = localX * Math.sin(rotation) + localY * Math.cos(rotation);
      
      // Final position
      const x = centerX + rotatedX;
      const y = centerY + rotatedY;
      
      // Calculate depth (z-position) for perspective
      // Nodes on far side (negative y in local space) are "behind"
      const depth = Math.sin(currentAngle) * config.flatten;
      const scale = 1 - (depth * 0.3); // Shrink nodes on far side
      const opacity = 0.5 + (depth * 0.5); // Fade nodes on far side
      
      // Update node position and appearance
      if (node.element) {
        d3.select(node.element)
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', node.nodeSize * scale)
          .style('opacity', node.hierarchy_level === 0 ? 1 : opacity);
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
  const baseSize = 4;
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
          nodeSize: 20,
          connections: 0
        });
      });
    } else {
      // Planets, moons, asteroids on orbits
      const angleStep = (2 * Math.PI) / group.length;
      
      group.forEach((node, i) => {
        const confidence = node.confidence || 0.7;
        const orbitRadius = baseRadius * level * (1 / confidence);
        const angle = i * angleStep;
        
        // Count connections for this node
        const connections = concepts.filter(other => 
          concepts.some(r => (r.src === node.id && r.dst === other.id) || (r.src === other.id && r.dst === node.id))
        ).length;
        
        const nodeSize = baseSize + (connections / maxConnections) * 6;
        
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
    .html(`
      <strong>${d.label}</strong><br>
      <span style="color: #94a3b8;">Type: ${d.type}</span><br>
      <span style="color: #94a3b8;">Confidence: ${Math.round((d.confidence || 0) * 100)}%</span>
    `);
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

