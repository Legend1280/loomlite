/**
 * Planet View Module for Loom Lite v4.0
 * Hierarchical tree visualization of document ontology
 * 
 * Displays concepts in a clean, expandable tree structure
 * Root node styled as a planet, with left-to-right curved Bézier connections
 */

import { bus } from './eventBus.js';

const API_BASE = 'https://loomlite-production.up.railway.app';

let svg, g, tree, root;
let currentDocId = null;
let currentOntology = null;

// Configuration
const NODE_WIDTH = 240;
const NODE_HEIGHT = 40;
const BASE_VERTICAL_SPACING = 50;
const BASE_HORIZONTAL_SPACING = 280;
const ANIMATION_DURATION = 400;

// Dynamic spacing calculation
function calculateDynamicSpacing(nodeCount) {
  // Vertical spacing scales with node count to prevent overlap
  const verticalSpacing = BASE_VERTICAL_SPACING;
  
  // Horizontal spacing increases slightly with more nodes for visual balance
  // Formula from spec: baseDistance + (numNodes * 0.05 * baseDistance)
  const horizontalSpacing = BASE_HORIZONTAL_SPACING + (nodeCount * 0.05 * BASE_HORIZONTAL_SPACING);
  
  return { verticalSpacing, horizontalSpacing };
}

/**
 * Initialize Planet View
 */
export async function initPlanetView(docId) {
  
  currentDocId = docId;
  
  const container = document.getElementById('visualizer-bottom');
  if (!container) {
    console.error('Planet View container not found');
    return;
  }
  
  // Load document ontology
  await loadOntology(docId);
  
  // Create visualization
  createMindMapVisualization(container);
  
  // Listen for events
  setupEventListeners();
  
  // Planet View initialized
}

/**
 * Load ontology data from API
 */
async function loadOntology(docId) {
  try {
    const response = await fetch(`${API_BASE}/doc/${docId}/ontology`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ontology: ${response.statusText}`);
    }
    currentOntology = await response.json();
    // Ontology loaded
  } catch (error) {
    console.error('Failed to load ontology:', error);
    currentOntology = { concepts: [], relations: [] };
  }
}

/**
 * Build semantic hierarchy using parent_cluster_id (v2.3)
 */
function buildSemanticHierarchy(rootNode, concepts, relations) {
  // Create concept lookup (use 'id' field from backend)
  const conceptMap = {};
  concepts.forEach(c => {
    conceptMap[c.id] = c;
  });
  
  // Separate concepts by hierarchy level (ONTOLOGY_STANDARD v1.3 - 4 levels: 0=doc, 1=cluster, 2=refinement, 3=concept)
  const clusters = concepts.filter(c => c.hierarchy_level === 1);
  const refinements = concepts.filter(c => c.hierarchy_level === 2);
  const atomicConcepts = concepts.filter(c => c.hierarchy_level === 3);
  
  // Build tree: root → clusters → refinements → concepts
  clusters.forEach(cluster => {
    const clusterNode = {
      name: cluster.label,
      id: cluster.id,
      type: 'cluster',
      hierarchyLevel: 2,
      concept: cluster,
      summary: cluster.summary || null,  // Include cluster summary
      children: [],
      _children: null,
      expanded: false  // Start collapsed
    };
    
    // Find refinement nodes under this cluster
    const clusterRefinements = refinements.filter(r => 
      r.parent_cluster_id === cluster.id
    );
    
    if (clusterRefinements.length > 0) {
      // Build 3-tier structure: cluster → refinement → concepts
      clusterRefinements.forEach(refinement => {
        const refinementNode = {
          name: refinement.label,
          id: refinement.id,
          type: 'refinement',
          hierarchyLevel: 3,
          concept: refinement,
          summary: refinement.summary || null,  // Include refinement summary
          children: [],
          _children: null,
          expanded: false  // Start collapsed
        };
        
        // Find concepts under this refinement
        const refinementConcepts = atomicConcepts.filter(c => 
          c.parent_concept_id === refinement.id
        );
        
        refinementConcepts.forEach(concept => {
          refinementNode.children.push({
            name: concept.label,
            id: concept.id,
            type: concept.type,
            hierarchyLevel: 4,
            confidence: concept.confidence,
            concept: concept,
            children: null  // Leaf nodes have null children
          });
        });
        
        clusterNode.children.push(refinementNode);
      });
    }
    
    // Add concepts directly under cluster (no refinement parent)
    const directConcepts = atomicConcepts.filter(c => 
      c.parent_cluster_id === cluster.id &&
      !c.parent_concept_id
    );
    
    directConcepts.forEach(concept => {
      clusterNode.children.push({
        name: concept.label,
        id: concept.id,
        type: concept.type,
        hierarchyLevel: 4,
        confidence: concept.confidence,
        concept: concept,
        children: null  // Leaf nodes have null children
      });
    });
    
    // Keep children visible - collapse will happen AFTER d3.hierarchy()
    // Cluster created with children
    
    rootNode.children.push(clusterNode);
  });
  
  // Add orphan concepts (no parent cluster)
  const orphans = atomicConcepts.filter(c => !c.parent_cluster_id);
  if (orphans.length > 0) {
    const orphanNode = {
      name: 'Uncategorized',
      id: 'orphans',
      type: 'category',
      hierarchyLevel: 1,
      children: [],
      _children: null,
      expanded: true
    };
    
    orphans.forEach(concept => {
      orphanNode.children.push({
        name: concept.label,
        id: concept.id,
        type: concept.type,
        hierarchyLevel: 3,
        confidence: concept.confidence,
        concept: concept,
        children: null  // Leaf nodes have null children
      });
    });
    
    rootNode.children.push(orphanNode);
  }
  
  return rootNode;
}

/**
 * Build hierarchical tree structure from ontology
 * Now supports parent_cluster_id and hierarchy_level (v2.3)
 */
function buildHierarchy() {
  if (!currentOntology || !currentOntology.concepts) {
    return { name: 'No Data', children: [] };
  }
  
  const concepts = currentOntology.concepts;
  const relations = currentOntology.relations || [];
  
  // Create root node (document) - use title from document object
  // Handle both 'doc' (MicroOntology) and 'document' (fallback) field names
  const docData = currentOntology.doc || currentOntology.document || {};
  const docTitle = docData.title || currentOntology.doc_id || 'Document';
  const docSummary = docData.summary || null;
  
  const rootNode = {
    name: docTitle.replace('.pdf', '').replace('.docx', '').replace(/_/g, ' '),
    id: 'root',
    type: 'document',
    hierarchyLevel: 0,
    summary: docSummary,  // Include document summary
    concept: docData,  // Include full document data
    children: [],
    _children: null,
    expanded: false  // Start collapsed - user clicks planet to expand
  };
  
  // Build hierarchy using parent_cluster_id
  if (concepts.some(c => c.parent_cluster_id || c.hierarchy_level !== undefined)) {
    // New hierarchical structure (v2.3)
    const hierarchyTree = buildSemanticHierarchy(rootNode, concepts, relations);
    // Hierarchy built
    return hierarchyTree;
  }
  
  // Fallback: Group concepts by type (legacy flat structure)
  const conceptsByType = {};
  concepts.forEach(concept => {
    const type = concept.type || 'Other';
    if (!conceptsByType[type]) {
      conceptsByType[type] = [];
    }
    conceptsByType[type].push(concept);
  });
  
  // Create type category nodes
  Object.keys(conceptsByType).sort().forEach(type => {
    const typeNode = {
      name: type,
      id: `type_${type}`,
      type: 'category',
      children: [],
      _children: null,
      expanded: false,
      count: conceptsByType[type].length
    };
    
    // Add concepts as children
    conceptsByType[type].forEach(concept => {
      const conceptNode = {
        name: concept.label,
        id: concept.id,
        type: concept.type,
        confidence: concept.confidence,
        concept: concept,
        children: [],
        _children: null,
        expanded: false
      };
      
      // Find related concepts (children)
      const childRelations = relations.filter(r => 
        r.src === concept.id && 
        ['contains', 'defines', 'develops', 'supports'].includes(r.verb)
      );
      
      if (childRelations.length > 0) {
        childRelations.forEach(rel => {
          const childConcept = concepts.find(c => c.id === rel.dst);
          if (childConcept) {
            conceptNode.children.push({
              name: childConcept.label,
              id: childConcept.id,
              type: childConcept.type,
              confidence: childConcept.confidence,
              concept: childConcept,
              children: [],
              _children: null
            });
          }
        });
      }
      
      typeNode.children.push(conceptNode);
    });
    
    rootNode.children.push(typeNode);
  });
  
  return rootNode;
}

/**
 * Create Planet View visualization
 */
function createMindMapVisualization(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Clear existing
  const existingSvg = container.querySelector('svg');
  if (existingSvg) {
    existingSvg.remove();
  }
  
  // Create SVG
  svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', 'linear-gradient(135deg, #0c0c0c 0%, #111111 100%)');
  
  // Add planet gradient definition
  const defs = svg.append('defs');
  const planetGradient = defs.append('radialGradient')
    .attr('id', 'planet-gradient');
  
  planetGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', '#fef3c7')
    .attr('stop-opacity', 1);
  
  planetGradient.append('stop')
    .attr('offset', '50%')
    .attr('stop-color', '#fbbf24')
    .attr('stop-opacity', 1);
  
  planetGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', '#f59e0b')
    .attr('stop-opacity', 1);
  
  // Create zoom group - center planet initially
  const initialX = width * 0.25;  // 25% from left edge (gives room to expand right)
  const initialY = height / 2;    // Vertically centered
  
  g = svg.append('g')
    .attr('transform', `translate(${initialX}, ${initialY})`);
  
  // Add zoom behavior with bounded panning
  const zoom = d3.zoom()
    .scaleExtent([0.3, 1.5])  // Tighter zoom range for better control
    .translateExtent([[-width * 2, -height * 2], [width * 3, height * 3]])  // Prevent dragging too far off-screen
    .extent([[0, 0], [width, height]])  // Viewport bounds
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  
  svg.call(zoom)
    .on('dblclick.zoom', null);  // Disable double-click zoom for cleaner UX
  
  // Create tree layout with dynamic spacing
  // Calculate spacing based on total visible nodes
  const visibleNodeCount = root ? root.descendants().filter(d => !d._children).length : 10;
  const spacing = calculateDynamicSpacing(visibleNodeCount);
  
  tree = d3.tree()
    .nodeSize([spacing.verticalSpacing, spacing.horizontalSpacing])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));
  
  // Build hierarchy
  const hierarchyData = buildHierarchy();
  root = d3.hierarchy(hierarchyData);
  
  // NOW collapse root node so planet starts closed (user clicks to expand)
  collapse(root);
  
  // Initial hierarchy ready
  
  // Initial render
  update(root);
}

/**
 * Collapse node and its children
 */
function collapse(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
}

/**
 * Toggle node expansion
 */
function toggle(d) {
  // Toggle node expansion
  
  if (d.children) {
    d._children = d.children;
    d.children = null;
    // Collapsed
  } else {
    d.children = d._children;
    d._children = null;
    // Expanded
  }
}

/**
 * Auto-center camera on node and its children
 * @param {Object} node - The node to center on
 */
function autoCenterOnNode(node) {
  if (!node || !svg) return;
  
  // Get all visible descendants of this node
  const descendants = node.descendants().filter(d => d.children || d === node);
  
  if (descendants.length === 0) return;
  
  // Calculate bounding box of visible nodes
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  descendants.forEach(d => {
    if (d.x !== undefined && d.y !== undefined) {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      minY = Math.min(minY, d.y);
      maxY = Math.max(maxY, d.y);
    }
  });
  
  // Calculate center point and scale
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxY - minY + 400;  // Add padding
  const height = maxX - minX + 200;  // Add padding
  
  // Get SVG dimensions
  const svgWidth = svg.node().clientWidth;
  const svgHeight = svg.node().clientHeight;
  
  // Calculate scale to fit
  const scale = Math.min(
    svgWidth / width,
    svgHeight / height,
    1.2  // Max zoom in
  );
  
  // Calculate translation to center
  const translateX = svgWidth / 2 - centerY * scale;
  const translateY = svgHeight / 2 - centerX * scale;
  
  // Smooth transition to new view
  svg.transition()
    .duration(750)
    .ease(d3.easeCubicInOut)
    .call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(scale)
    );
}

/**
 * Update visualization
 */
function update(source) {
  // Recalculate dynamic spacing based on currently visible nodes
  const visibleNodes = root.descendants().filter(d => d.children || d === root);
  const spacing = calculateDynamicSpacing(visibleNodes.length);
  
  // Update tree layout with new spacing
  tree.nodeSize([spacing.verticalSpacing, spacing.horizontalSpacing]);
  
  // Compute new tree layout
  const treeData = tree(root);
  const nodes = treeData.descendants();
  const links = treeData.links();
  
  // Tree rendered
  
  // Update nodes
  const node = g.selectAll('g.node')
    .data(nodes, d => d.data.id);
  
  // Enter new nodes
  const nodeEnter = node.enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${source.y0 || 0}, ${source.x0 || 0})`)
    .style('opacity', 0)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation();
      handleNodeClick(d);
    });
  
  // Add node shapes (planet for document, rect for concepts)
  nodeEnter.each(function(d) {
    const node = d3.select(this);
    
    if (d.data.type === 'document') {
      // Planet node (root document)
      const planetRadius = 30;
      
      // Add planet circle - solid grey sphere
      const planetCircle = node.append('circle')
        .attr('r', planetRadius)
        .attr('fill', '#64748b')  // Solid grey
        .attr('stroke', '#94a3b8')  // Light grey border
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))');  // Subtle shadow only
      
      // Tooltip will be handled by custom D3 tooltip on hover
      
      // Add planet text ABOVE the sphere
      node.append('text')
        .attr('dy', -(planetRadius + 10))  // Position above planet (negative offset)
        .attr('x', 0)
        .attr('text-anchor', 'middle')
        .attr('fill', '#e2e8f0')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .text(d.data.name)
        .style('pointer-events', 'none');
      
      // Mark this node as planet so we skip adding text again later
      d._isPlanet = true;
    } else {
      // Regular concept nodes (rectangles)
      node.append('rect')
        .attr('width', NODE_WIDTH)
        .attr('height', NODE_HEIGHT)
        .attr('x', -NODE_WIDTH / 2)
        .attr('y', -NODE_HEIGHT / 2)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', getNodeColor(d.data.type))
        .attr('stroke', getNodeStrokeColor(d.data.type))
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))');
    }
  });
  
  // Add node text (skip for planet nodes - they have custom text below)
  nodeEnter.filter(d => !d._isPlanet)
    .append('text')
    .attr('dy', '0.35em')
    .attr('x', -NODE_WIDTH / 2 + 12)
    .attr('text-anchor', 'start')
    .attr('fill', '#e2e8f0')
    .attr('font-size', '13px')
    .attr('font-weight', '500')
    .text(d => truncateText(d.data.name, 28))
    .style('pointer-events', 'none');
  
  // Add expand/collapse indicator
  nodeEnter.append('text')
    .attr('class', 'expand-indicator')
    .attr('x', NODE_WIDTH / 2 - 20)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('fill', '#94a3b8')
    .attr('font-size', '16px')
    .text(d => {
      if (d.data.type === 'category' && d.data.count) {
        return d.children ? '>' : `> ${d.data.count}`;
      }
      return (d.children || d._children) ? '>' : '';
    })
    .style('pointer-events', 'none');
  
  // Add hover effects for all nodes
  nodeEnter
    .on('mouseenter', function(event, d) {
      d3.select(this).select('rect')
        .transition()
        .duration(200)
        .attr('stroke-width', 3)
        .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))');
      
      showTooltip(event, d);
    })
    .on('mouseleave', function(event, d) {
      d3.select(this).select('rect')
        .transition()
        .duration(200)
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))');
      
      hideTooltip();
    });
  
  // Update existing nodes
  const nodeUpdate = nodeEnter.merge(node);
  
  nodeUpdate.transition()
    .duration(ANIMATION_DURATION)
    .attr('transform', d => `translate(${d.y}, ${d.x})`)
    .style('opacity', 1);
  
  // Update expand indicator
  nodeUpdate.select('.expand-indicator')
    .text(d => {
      if (d.data.type === 'category' && d.data.count) {
        return d.children ? '>' : `> ${d.data.count}`;
      }
      return (d.children || d._children) ? '>' : '';
    });
  
  // Exit old nodes
  const nodeExit = node.exit()
    .transition()
    .duration(ANIMATION_DURATION)
    .attr('transform', d => `translate(${source.y}, ${source.x})`)
    .style('opacity', 0)
    .remove();
  
  // Update links
  const link = g.selectAll('path.link')
    .data(links, d => d.target.data.id);
  
  // Enter new links
  const linkEnter = link.enter()
    .insert('path', 'g')
    .attr('class', 'link')
    .attr('d', d => {
      const o = { x: source.x0 || 0, y: source.y0 || 0 };
      return diagonal(o, o);
    })
    .attr('fill', 'none')
    .attr('stroke', '#475569')
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0);
  
  // Update existing links
  const linkUpdate = linkEnter.merge(link);
  
  linkUpdate.transition()
    .duration(ANIMATION_DURATION)
    .attr('d', d => diagonal(d.source, d.target))
    .attr('stroke-opacity', 0.6);
  
  // Exit old links
  link.exit()
    .transition()
    .duration(ANIMATION_DURATION)
    .attr('d', d => {
      const o = { x: source.x, y: source.y };
      return diagonal(o, o);
    })
    .attr('stroke-opacity', 0)
    .remove();
  
  // Store positions for transitions
  nodes.forEach(d => {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

/**
 * Create curved Bézier path between nodes
 */
function diagonal(s, d) {
  return `M ${s.y} ${s.x}
          C ${(s.y + d.y) / 2} ${s.x},
            ${(s.y + d.y) / 2} ${d.x},
            ${d.y} ${d.x}`;
}

/**
 * Handle node click
 */
function handleNodeClick(d) {
  // Node clicked
  
  // Emit selection event with nodeType for proper Surface Viewer handling
  if (d.data.concept || d.data.type === 'document') {
    const nodeType = d.data.type || 'concept';  // 'document', 'cluster', 'refinement', or 'concept'
    const hierarchyLevel = d.data.hierarchyLevel;
    
    console.log(`Planet View node clicked: ${d.data.name} (type: ${nodeType}, level: ${hierarchyLevel})`);
    
    bus.emit('conceptSelected', {
      conceptId: d.data.id,
      docId: currentDocId,
      concept: d.data.concept,
      nodeType: nodeType,
      hierarchyLevel: hierarchyLevel,
      summary: d.data.summary || null
    });
  }
  
  // Toggle expansion
  toggle(d);
  update(d);
  
  // Auto-center camera on the expanded/collapsed node
  setTimeout(() => {
    autoCenterOnNode(d);
  }, 50);  // Small delay to let layout compute
}

/**
 * Get node background color based on type
 */
function getNodeColor(type) {
  const colors = {
    document: '#1e293b',
    category: '#334155',
    cluster: '#334155',  // Cluster nodes: neutral grey-blue
    Person: '#3b82f6',
    Project: '#8b5cf6',
    Feature: '#10b981',
    Process: '#f59e0b',
    Metric: '#ef4444',
    Date: '#ec4899',
    Topic: '#06b6d4',
    Team: '#6366f1',
    Goal: '#14b8a6'
  };
  return colors[type] || '#475569';
}

/**
 * Get node stroke color based on type
 */
function getNodeStrokeColor(type) {
  const colors = {
    document: '#475569',
    category: '#64748b',
    cluster: '#64748b',  // Cluster stroke
    Person: '#60a5fa',
    Project: '#a78bfa',
    Feature: '#34d399',
    Process: '#fbbf24',
    Metric: '#f87171',
    Date: '#f472b6',
    Topic: '#22d3ee',
    Team: '#818cf8',
    Goal: '#2dd4bf'
  };
  return colors[type] || '#64748b';
}

/**
 * Truncate text to fit in node
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Show tooltip
 */
function showTooltip(event, d) {
  // Debug: Log data to see what's available
  if (d.data.type === 'document') {
    console.log('Planet tooltip data:', {
      name: d.data.name,
      type: d.data.type,
      summary: d.data.summary,
      concept: d.data.concept,
      allData: d.data
    });
  }
  
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'mindmap-tooltip')
    .style('position', 'absolute')
    .style('background', '#181818')
    .style('color', '#e6e6e6')
    .style('padding', '10px 14px')
    .style('border-radius', '8px')
    .style('font-size', '12px')
    .style('font-family', 'system-ui, -apple-system, sans-serif')
    .style('pointer-events', 'none')
    .style('z-index', '10000')
    .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)')
    .style('max-width', '400px')  // Limit width for readability
    .style('left', `${event.pageX + 15}px`)
    .style('top', `${event.pageY + 15}px`);
  
  let content = `<strong style="font-size: 13px;">${d.data.name}</strong><br>`;
  content += `<span style="color: #94a3b8;">Type: ${d.data.type}</span>`;
  
  // Add summary for document nodes (planet)
  if (d.data.type === 'document' && d.data.summary) {
    content += `<br><br><span style="color: #cbd5e1; line-height: 1.5;">${d.data.summary}</span>`;
  }
  
  // Add summary for concept nodes (clusters, refinements, etc.)
  if (d.data.concept && d.data.concept.summary) {
    content += `<br><br><span style="color: #cbd5e1; line-height: 1.5;">${d.data.concept.summary}</span>`;
  }
  
  if (d.data.confidence) {
    content += `<br><span style="color: #94a3b8;">Confidence: ${Math.round(d.data.confidence * 100)}%</span>`;
  }
  
  if (d.data.count) {
    content += `<br><span style="color: #94a3b8;">Concepts: ${d.data.count}</span>`;
  }
  
  tooltip.html(content);
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  d3.selectAll('.mindmap-tooltip').remove();
}

/**
 * Highlight nodes based on search results
 */
function highlightSearchResults(results) {
  if (!g) return;
  
  // Extract concept IDs from new v1.6 response format
  const matchedIds = new Set();
  
  if (results && results.length > 0 && results[0].concepts) {
    // New format: results is array of documents with concepts
    results.forEach(doc => {
      doc.concepts?.forEach(concept => {
        matchedIds.add(concept.id);
      });
    });
  } else {
    // Legacy format: results is array of concepts
    results.forEach(r => matchedIds.add(r.id));
  }
  
  console.log(`Filtering ${matchedIds.size} concepts in Planet View (v1.6)`);
  console.log('Matched concept IDs:', Array.from(matchedIds));
  
  // Debug: Show all node IDs and labels for comparison
  if (root) {
    const allNodes = root.descendants().filter(d => d.data.concept);
    console.log(`Total concept nodes in tree: ${allNodes.length}`);
    console.log('Sample node data:', allNodes.slice(0, 5).map(d => ({
      id: d.data.id,
      label: d.data.name,
      matched: matchedIds.has(d.data.id)
    })));
  }
  
  // Auto-expand nodes that contain matches
  root.descendants().forEach(d => {
    if (d.data.concept && matchedIds.has(d.data.id)) {
      // Expand path to this node
      let current = d.parent;
      while (current) {
        if (current._children) {
          current.children = current._children;
          current._children = null;
        }
        current = current.parent;
      }
    }
  });
  
  // Update visualization
  update(root);
  
  // Highlight matched nodes
  setTimeout(() => {
    g.selectAll('g.node')
      .select('rect')
      .transition()
      .duration(400)  // Smooth 400ms transition
      .attr('stroke', d => {
        return matchedIds.has(d.data.id) ? '#10b981' : getNodeStrokeColor(d.data.type);
      })
      .attr('stroke-width', d => {
        return matchedIds.has(d.data.id) ? 4 : 2;
      })
      .style('opacity', d => {
        if (d.data.type === 'document' || d.data.type === 'category') return 1;
        return matchedIds.has(d.data.id) ? 1.0 : 0.2;  // Fade non-matching to 0.2
      });
  }, ANIMATION_DURATION);
}

/**
 * Clear search highlights (v1.6)
 */
function clearSearchHighlights() {
  if (!g) return;
  
  console.log('Resetting Planet View search filter');
  
  // Reset rectangles (concept nodes)
  g.selectAll('g.node')
    .select('rect')
    .transition()
    .duration(400)
    .attr('stroke', d => getNodeStrokeColor(d.data.type))
    .attr('stroke-width', 2)
    .style('opacity', 1);
  
  // Reset circles (planet/document node)
  g.selectAll('g.node')
    .select('circle')
    .transition()
    .duration(400)
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 2)
    .style('opacity', 1);
  
  // Reset text opacity
  g.selectAll('g.node')
    .select('text')
    .transition()
    .duration(400)
    .style('opacity', 1);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Listen for search results
  bus.on('searchResults', (event) => {
    const { results } = event.detail;
    highlightSearchResults(results);
  });
  
  // Listen for search cleared
  bus.on('searchCleared', () => {
    clearSearchHighlights();
  });
  
  // Listen for document focus
  bus.on('documentFocus', async (event) => {
    const { docId } = event.detail;
    if (docId !== currentDocId) {
      await initPlanetView(docId);
    }
  });
  
  // Listen for center command (triple-click)
  bus.on('centerMindMap', () => {
    centerOnRoot();
  });
}

/**
 * Center the view on the root node
 */
function centerOnRoot() {
  if (!svg || !g) return;
  
  console.log('Centering Planet View on root...');
  
  const container = document.getElementById('visualizer-bottom');
  if (!container) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Center position
  const centerX = 60;
  const centerY = height / 2;
  
  // Create smooth transition
  const transition = svg.transition()
    .duration(600)
    .ease(d3.easeCubicInOut);
  
  // Reset zoom and pan to center
  svg.call(
    d3.zoom().transform,
    d3.zoomIdentity.translate(centerX, centerY).scale(1)
  );
}

/**
 * Resize handler
 */
export function resizePlanetView() {
  if (!svg) return;
  
  const container = document.getElementById('visualizer-bottom');
  if (!container) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  svg.attr('width', width).attr('height', height);
}

// Export for global access
window.initPlanetView = initPlanetView;
window.resizePlanetView = resizePlanetView;

