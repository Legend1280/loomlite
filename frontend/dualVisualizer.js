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
export async function drawDualVisualizer(docId) {
  try {
    // Fetch ontology data from API
    const response = await fetch(`https://loomlite-production.up.railway.app/doc/${docId}/ontology`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ontology: ${response.statusText}`);
    }
    const ontology = await response.json();
    
    // Get SVG containers
    const svgTop = d3.select('#visualizer-top svg');
    const svgBottom = d3.select('#visualizer-bottom svg');
    
    // Clear existing content
    svgTop.selectAll('*').remove();
    svgBottom.selectAll('*').remove();
    
    // Render force-directed graph in top panel
    renderForceGraph(svgTop, ontology);
    
    // Render mind map in bottom panel (placeholder for now)
    renderMindMapPlaceholder(svgBottom, ontology);
    
    console.log('✅ Dual Visualizer rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering dual visualizer:', error);
  }
}

/**
 * Render force-directed graph visualization
 * @param {d3.Selection} svg - D3 selection of SVG element
 * @param {Object} data - Ontology data with concepts and relations
 */
function renderForceGraph(svg, data) {
  const width = svg.node().parentElement.clientWidth;
  const height = svg.node().parentElement.clientHeight;
  
  svg.attr('width', width).attr('height', height);
  
  // Prepare data
  const concepts = data.concepts || [];
  
  // Transform relations: map 'src' -> 'source' and 'dst' -> 'target' for D3
  const relations = (data.relations || []).map(r => ({
    ...r,
    source: r.src,
    target: r.dst
  }));
  
  console.log(`📊 Rendering ${concepts.length} concepts and ${relations.length} relations`);
  
  // Create force simulation
  const simulation = d3.forceSimulation(concepts)
    .force('link', d3.forceLink(relations)
      .id(d => d.id)
      .distance(80))
    .force('charge', d3.forceManyBody().strength(-150))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(15));
  
  // Create container groups
  const g = svg.append('g');
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  
  svg.call(zoom);
  
  // Draw links
  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(relations)
    .enter()
    .append('line')
    .attr('stroke', '#475569')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.6);
  
  // Draw nodes
  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('circle')
    .data(concepts)
    .enter()
    .append('circle')
    .attr('r', 8)
    .attr('fill', d => typeColor(d.type))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      // Emit concept selected event via event bus
      bus.emit('conceptSelected', { 
        conceptId: d.id, 
        docId: d.doc_id,
        concept: d
      });
      
      // Update state
      setCurrentConceptId(d.id, d.doc_id);
      
      // Visual feedback
      node.attr('stroke', n => n.id === d.id ? '#fbbf24' : '#fff')
          .attr('stroke-width', n => n.id === d.id ? 3 : 1.5);
    })
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('stroke-width', 2.5);
      
      // Show tooltip
      showTooltip(event, d);
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .attr('stroke-width', n => n.id === d.id ? 3 : 1.5);
      
      hideTooltip();
    })
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));
  
  // Add labels
  const label = g.append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data(concepts)
    .enter()
    .append('text')
    .text(d => d.label)
    .attr('font-size', 11)
    .attr('fill', '#cbd5e1')
    .attr('text-anchor', 'middle')
    .attr('dy', 20)
    .style('pointer-events', 'none');
  
  // Update positions on tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    
    label
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  });
  
  // Drag functions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
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
 * Get color for concept type
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

// Listen for external concept selection events
bus.on('conceptSelected', (event) => {
  const { conceptId } = event.detail;
  
  // Highlight the selected node in the visualization
  const svg = d3.select('#visualizer-top svg');
  svg.selectAll('circle')
    .attr('stroke', d => d.id === conceptId ? '#fbbf24' : '#fff')
    .attr('stroke-width', d => d.id === conceptId ? 3 : 1.5);
  
  console.log(`🎯 Dual Visualizer: Highlighted concept ${conceptId}`);
});

// Export for global access
window.drawDualVisualizer = drawDualVisualizer;

