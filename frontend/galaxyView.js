/**
 * Galaxy View Module for Loom Lite v2.0
 * Visualizes all documents as interconnected solar systems
 * 
 * Hierarchy:
 * - Galaxy = All documents (this view)
 * - Solar System = One document's concepts
 * - Moon = Sub-concepts/details
 * - Surface = Evidence/text spans
 */

import { bus } from './eventBus.js';

const API_BASE = 'https://loomlite-production.up.railway.app';

let svg, g, simulation;
let documents = [];
let sharedConcepts = [];

/**
 * Initialize Galaxy View
 */
export async function initGalaxyView() {
  console.log('Initializing Galaxy View...');
  
  const container = document.getElementById('galaxyContainer');
  if (!container) {
    console.error('Galaxy container not found');
    return;
  }
  
  // Load all documents
  await loadDocuments();
  
  // Create visualization
  createGalaxyVisualization(container);
  
  // Listen for search results
  bus.on('searchResults', (event) => {
    const { results } = event.detail;
    highlightSearchResults(results);
  });
  
  console.log('Galaxy View initialized');
}

/**
 * Load all documents from API
 */
async function loadDocuments() {
  try {
    const response = await fetch(`${API_BASE}/tree`);
    documents = await response.json();
    
    // Load concept data for each document to find shared concepts
    await analyzeSharedConcepts();
    
    console.log(`Loaded ${documents.length} documents`);
  } catch (error) {
    console.error('Failed to load documents:', error);
  }
}

/**
 * Analyze shared concepts between documents
 */
async function analyzeSharedConcepts() {
  const conceptsByLabel = new Map();
  
  // Load ontology for each document
  for (const doc of documents) {
    try {
      const response = await fetch(`${API_BASE}/doc/${doc.id}/ontology`);
      const ontology = await response.json();
      
      // Store concept count for sizing
      doc.conceptCount = ontology.concepts?.length || 0;
      
      // Track concepts by label to find shared ones
      ontology.concepts?.forEach(concept => {
        const label = concept.label.toLowerCase().trim();
        if (!conceptsByLabel.has(label)) {
          conceptsByLabel.set(label, []);
        }
        conceptsByLabel.get(label).push({
          docId: doc.id,
          conceptId: concept.id,
          type: concept.type
        });
      });
    } catch (error) {
      console.error(`Failed to load ontology for ${doc.id}:`, error);
      doc.conceptCount = 0;
    }
  }
  
  // Find shared concepts (appearing in multiple documents)
  sharedConcepts = [];
  conceptsByLabel.forEach((instances, label) => {
    if (instances.length > 1) {
      sharedConcepts.push({
        label,
        instances,
        strength: instances.length
      });
    }
  });
  
  console.log(`🔗 Found ${sharedConcepts.length} shared concepts`);
}

/**
 * Create Galaxy visualization
 */
function createGalaxyVisualization(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Clear existing
  container.innerHTML = '';
  
  // Create SVG
  svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', '#0a0e1a');
  
  // Add starfield background
  createStarfield(svg, width, height);
  
  // Create zoom group
  g = svg.append('g');
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  
  svg.call(zoom);
  
  // Prepare nodes and links
  const nodes = documents.map(doc => ({
    id: doc.id,
    title: doc.title,
    conceptCount: doc.conceptCount || 0,
    type: 'document'
  }));
  
  const links = [];
  
  // Create links based on shared concepts
  sharedConcepts.forEach(shared => {
    const docIds = shared.instances.map(inst => inst.docId);
    for (let i = 0; i < docIds.length; i++) {
      for (let j = i + 1; j < docIds.length; j++) {
        links.push({
          source: docIds[i],
          target: docIds[j],
          sharedConcept: shared.label,
          strength: shared.strength
        });
      }
    }
  });
  
  console.log(`Galaxy: ${nodes.length} documents, ${links.length} connections`);
  
  // Create force simulation with moderate clustering
  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(120)       // Moderate spacing
      .strength(0.3))      // Moderate bond strength
    .force('charge', d3.forceManyBody()
      .strength(-200))     // Moderate repulsion
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide()
      .radius(12));        // Moderate collision radius
  
  // Draw links
  const link = g.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', '#3b82f6')
    .attr('stroke-opacity', 0.5)  // Increased for visibility through auras
    .attr('stroke-width', d => Math.sqrt(d.strength));
  
  // Draw nodes (solar systems)
  const node = g.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('cursor', 'pointer')
    .call(drag(simulation))
    .on('click', (event, d) => {
      event.stopPropagation();
      drillDownToSolarSystem(d);
    });
  
  // Draw each node as a galaxy sprite
  node.each(function(d) {
    drawGalaxySpriteNode(d, d3.select(this));
  });
  
  // Add document title
  node.append('text')
    .attr('dy', d => getNodeRadius(d) + 20)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e2e8f0')
    .attr('font-size', '12px')
    .attr('font-weight', '600')
    .text(d => truncateTitle(d.title, 30));
  
  // Add concept count
  node.append('text')
    .attr('dy', d => getNodeRadius(d) + 35)
    .attr('text-anchor', 'middle')
    .attr('fill', '#94a3b8')
    .attr('font-size', '10px')
    .text(d => `${d.conceptCount} concepts`);
  
  // Add gradients
  addGradients(svg);
  
  // Update positions on tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

/**
 * Create starfield background
 */
function createStarfield(svg, width, height) {
  const stars = d3.range(200).map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.5
  }));
  
  svg.append('g')
    .selectAll('circle')
    .data(stars)
    .join('circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', d => d.r)
    .attr('fill', '#ffffff')
    .attr('opacity', d => 0.3 + Math.random() * 0.7);
}

/**
 * Add SVG gradients, filters, and sprite symbol for galaxy nodes
 */
function addGradients(svg) {
  const defs = svg.append('defs');
  
  // Simple gradient for nodes
  const nodeGradient = defs.append('radialGradient')
    .attr('id', 'node-glow');
  
  nodeGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', '#fbbf24')
    .attr('stop-opacity', 1);
  
  nodeGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', '#f59e0b')
    .attr('stop-opacity', 0.8);
  
  // Minimal blur filter
  const glowFilter = defs.append('filter')
    .attr('id', 'node-blur')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');
  
  glowFilter.append('feGaussianBlur')
    .attr('stdDeviation', '2');
  
  // Simple node sprite (small, clean)
  const sprite = defs.append('symbol')
    .attr('id', 'star-sprite')
    .attr('viewBox', '-10 -10 20 20');
  
  // Subtle glow layer
  sprite.append('circle')
    .attr('r', 6)
    .attr('fill', 'url(#node-glow)')
    .attr('opacity', 0.4)
    .attr('filter', 'url(#node-blur)')
    .attr('class', 'node-glow');
  
  // Core circle
  sprite.append('circle')
    .attr('r', 3)
    .attr('fill', 'url(#node-glow)')
    .attr('class', 'node-core');
}

/**
 * Get node radius based on concept count
 */
function getNodeRadius(node) {
  const minRadius = 20;
  const maxRadius = 50;
  const maxConcepts = Math.max(...documents.map(d => d.conceptCount || 0));
  
  if (maxConcepts === 0) return minRadius;
  
  return minRadius + (node.conceptCount / maxConcepts) * (maxRadius - minRadius);
}

/**
 * Draw a stardust star sprite node (tiny, subtle, breathing)
 * @param {Object} d - Node data
 * @param {d3.Selection} g - D3 selection of the node group
 */
function drawGalaxySpriteNode(d, g) {
  // Calculate semantic brightness (0.65 to 1.0 range for subtle effect)
  const maxConcepts = Math.max(...documents.map(doc => doc.conceptCount || 0));
  const coherence = maxConcepts > 0 ? d.conceptCount / maxConcepts : 0.5;
  const brightness = 0.65 + coherence * 0.35;
  
  // Add sprite instance at native size (no transform scaling)
  g.append('use')
    .attr('href', '#star-sprite')
    .attr('class', 'star-node')
    .style('--brightness', brightness);
}



/**
 * Truncate title to max length
 */
function truncateTitle(title, maxLength) {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + '...';
}

/**
 * Drill down to Solar System view
 */
function drillDownToSolarSystem(node) {
  console.log(`🔭 Drilling down to Solar System: ${node.title}`);
  
  // Auto-switch to Split mode (Solar + Document)
  bus.emit('viewModeChanged', { mode: 'split' });
  
  // Emit event to load document
  bus.emit('documentFocus', { docId: node.id });
}

/**
 * Drag behavior
 */
function drag(simulation) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }
  
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
  
  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}

/**
 * Resize handler
 */
export function resizeGalaxyView() {
  const container = document.getElementById('galaxyContainer');
  if (!container || !svg) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  svg.attr('width', width).attr('height', height);
  
  if (simulation) {
    simulation.force('center', d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart();
  }
}

/**
 * Highlight documents that contain search results
 * @param {Array} results - Search results with doc_id
 */
function highlightSearchResults(results) {
  if (!g) return;
  
  // Get unique document IDs from search results
  const matchedDocIds = new Set(results.map(r => r.doc_id).filter(Boolean));
  
  console.log(`Highlighting ${matchedDocIds.size} documents in Galaxy View`);
  
  // Update node styles (only document node groups, not nested groups)
  g.selectAll('g')
    .filter(function() {
      // Only select top-level node groups that have data bound
      return this.parentNode === g.node() && this.__data__;
    })
    .transition()
    .duration(300)
    .style('opacity', d => {
      // Defensive check for data
      if (!d || !d.id) return 1;
      return matchedDocIds.has(d.id) ? 1 : 0.3;
    });
  
  // Update star sprite nodes (highlight matched documents)
  g.selectAll('.star-node')
    .transition()
    .duration(300)
    .style('filter', function() {
      // Get parent node data
      const parentNode = d3.select(this.parentNode);
      const d = parentNode.datum();
      
      if (!d || !d.id) return 'brightness(1)';
      
      // Boost brightness for matched documents
      const maxConcepts = Math.max(...documents.map(doc => doc.conceptCount || 0));
      const coherence = maxConcepts > 0 ? d.conceptCount / maxConcepts : 0.5;
      const baseBrightness = 0.8 + coherence * 0.4;
      const matchBoost = matchedDocIds.has(d.id) ? 0.4 : 0; // Higher boost for visibility
      
      return `brightness(${baseBrightness + matchBoost})`;
    })
    .style('--match-color', function() {
      const parentNode = d3.select(this.parentNode);
      const d = parentNode.datum();
      
      if (!d || !d.id) return '#fad643';
      return matchedDocIds.has(d.id) ? '#10b981' : '#fad643';
    });
  
  // Pulse effect for matched documents (opacity pulse instead of scale)
  if (matchedDocIds.size > 0) {
    g.selectAll('.star-node')
      .filter(function() {
        const parentNode = d3.select(this.parentNode);
        const d = parentNode.datum();
        return d && d.id && matchedDocIds.has(d.id);
      })
      .transition()
      .duration(500)
      .style('opacity', 1)
      .transition()
      .duration(500)
      .style('opacity', 0.8);
  }
}

/**
 * Clear search highlights
 */
function clearSearchHighlights() {
  if (!g) return;
  
  // Restore all node opacity
  g.selectAll('g')
    .filter(function() {
      return this.parentNode === g.node() && this.__data__;
    })
    .transition()
    .duration(300)
    .style('opacity', 1);
  
  // Restore star sprite default styling
  g.selectAll('.star-node')
    .transition()
    .duration(300)
    .style('filter', function() {
      const parentNode = d3.select(this.parentNode);
      const d = parentNode.datum();
      
      if (!d) return 'brightness(1)';
      
      // Restore semantic brightness (subtle range)
      const maxConcepts = Math.max(...documents.map(doc => doc.conceptCount || 0));
      const coherence = maxConcepts > 0 ? d.conceptCount / maxConcepts : 0.5;
      const brightness = 0.65 + coherence * 0.35;
      
      return `brightness(${brightness})`;
    })
    .style('--match-color', '#fad643');
}

// Export for global access
window.initGalaxyView = initGalaxyView;
window.resizeGalaxyView = resizeGalaxyView;
window.highlightSearchResults = highlightSearchResults;
window.clearSearchHighlights = clearSearchHighlights;

