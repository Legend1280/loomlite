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
import { createListenerManager, registerManager } from './eventListenerManager.js';

const API_BASE = 'https://loomlite-production.up.railway.app';

let svg, g, simulation;
let documents = [];
let sharedConcepts = [];
const listeners = createListenerManager(); // Event listener manager

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
  
  // Cleanup previous listeners
  listeners.cleanup();
  
  // Listen for search results
  listeners.add('searchResults', (event) => {
    const { results } = event.detail;
    highlightSearchResults(results);
  });
  
  // Listen for search cleared
  listeners.add('searchCleared', () => {
    resetSearchHighlight();
  });
  
  // Listen for thread selection
  listeners.add('threadSelected', ({ threadId, documents }) => {
    if (threadId && documents && documents.length > 0) {
      console.log(`Galaxy View: Filtering to thread "${threadId}" with ${documents.length} documents`);
      highlightThreadDocuments(documents);
    } else {
      console.log('Galaxy View: Clearing thread filter');
      resetThreadHighlight();
    }
  });
  
  // Register for global cleanup
  registerManager(listeners);
  
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
  
  // Create force simulation
  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(200))
    .force('charge', d3.forceManyBody().strength(-800))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 20));
  
  // Draw links (simple lines, no glow)
  const link = g.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'thread')
    .attr('stroke', '#666666')
    .attr('stroke-opacity', 0.3)
    .attr('stroke-width', 1);
  
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
  
  // Add simple circle node (no glow, no gradient)
  node.append('circle')
    .attr('r', d => getNodeRadius(d))
    .attr('fill', '#ffffff')
    .attr('stroke', '#666666')
    .attr('stroke-width', 1.5);
  
  // Add document title
  node.append('text')
    .attr('dy', d => getNodeRadius(d) + 20)
    .attr('text-anchor', 'middle')
    .attr('fill', '#cccccc')
    .attr('font-size', '11px')
    .attr('font-weight', '400')
    .text(d => truncateTitle(d.title, 30));
  
  // No gradients needed for minimal design
  
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
 * Create starfield background (disabled for performance)
 */
function createStarfield(svg, width, height) {
  // Starfield disabled for performance
}

/**
 * Add SVG gradients (disabled for performance)
 */
function addGradients(svg) {
  // Gradients disabled for performance
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
  
  console.log(`Filtering ${matchedDocIds.size} documents in Galaxy View (v1.6)`);
  
  // Update node styles (only document node groups, not nested groups)
  g.selectAll('g')
    .filter(function() {
      // Only select top-level node groups that have data bound
      return this.parentNode === g.node() && this.__data__;
    })
    .transition()
    .duration(400)  // Smooth 400ms transition
    .style('opacity', d => {
      // Defensive check for data
      if (!d || !d.id) return 1;
      // Fade non-matching to 0.05, keep matching at 1.0
      return matchedDocIds.has(d.id) ? 1.0 : 0.05;
    });  // Update node circles (simplified, no pulse)
  g.selectAll('circle')
    .filter(function() {
      return this.parentNode.tagName === 'g' && this.__data__;
    })
    .transition()
    .duration(200)
    .attr('stroke', d => {
      if (!d || !d.id) return '#666666';
      return matchedDocIds.has(d.id) ? '#000000' : '#666666';
    })
    .attr('stroke-width', d => {
      if (!d || !d.id) return 1.5;
      return matchedDocIds.has(d.id) ? 2.5 : 1.5;
    });
}

/**
 * Highlight documents in a thread (v1.6)
 */
function highlightThreadDocuments(docIds) {
  if (!g) return;
  
  const docIdSet = new Set(docIds);
  
  console.log(`Highlighting ${docIds.length} thread documents in Galaxy View`);
  
  g.selectAll('g')
    .transition()
    .duration(400)
    .style('opacity', d => docIdSet.has(d.id) ? 1 : 0.05);
  
  g.selectAll('circle')
    .transition()
    .duration(400)
    .attr('stroke', d => docIdSet.has(d.id) ? '#22c55e' : 'rgba(250, 214, 67, 0.3)')
    .attr('stroke-width', d => docIdSet.has(d.id) ? 3 : 1.5);
}

/**
 * Reset thread highlight (v1.6)
 */
function resetThreadHighlight() {
  if (!g) return;
  
  console.log('Resetting Galaxy View thread filter');
  
  g.selectAll('g')
    .transition()
    .duration(400)
    .style('opacity', 1);
  
  g.selectAll('circle')
    .transition()
    .duration(400)
    .attr('stroke', 'rgba(250, 214, 67, 0.3)')
    .attr('stroke-width', 1.5);
}

/**
 * Reset search highlight (v1.6)
 */
function resetSearchHighlight() {
  if (!g) return;
  
  console.log('Resetting Galaxy View search filter');
  
  g.selectAll('g')
    .transition()
    .duration(400)
    .style('opacity', 1);
  
  g.selectAll('circle')
    .filter(function() {
      return this.parentNode.tagName === 'g';
    })
    .transition()
    .duration(300)
    .attr('stroke', '#f59e0b')
    .attr('stroke-width', 2);
}

// Export for global access
window.initGalaxyView = initGalaxyView;
window.resizeGalaxyView = resizeGalaxyView;
window.highlightSearchResults = highlightSearchResults;
window.resetSearchHighlight = resetSearchHighlight;

