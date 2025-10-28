# Solar System Mode - Implementation Game Plan
**Version**: 1.0  
**Target**: LoomLite v1.7.0  
**Estimated Effort**: 3-4 days  
**Status**: Planning Phase

---

## Executive Summary

Transform LoomLite's current 2D force-directed graph (Solar System View) into a **3D gravitational visualization** where concepts orbit around a central document "sun" based on semantic proximity and ontological hierarchy. The visualization will use the existing `hierarchy_level` field (0=doc, 2=cluster, 3=refinement, 4=concept) to create a multi-layered orbital system with planets and moons.

---

## Current State Analysis

### Existing Solar System View (dualVisualizer.js)

**What Exists**:
- 2D force-directed graph using D3.js
- Force simulation with link, charge, center, and collision forces
- Basic zoom and pan controls
- Node coloring by concept type
- Search result highlighting

**What's Missing**:
- 3D visualization layer
- Gravitational orbital physics
- Hierarchical orbit levels (planets vs moons)
- Semantic distance-based positioning
- Camera controls for 3D navigation
- Orbital animation

### Available Data Structure

**From MicroOntology Model**:
```python
Concept {
    id: str
    label: str
    type: str  # Topic, Feature, Technology, etc.
    hierarchy_level: int  # 0=doc, 2=cluster, 3=refinement, 4=concept
    confidence: float
    summary: str (optional)
}

Relation {
    src: str  # source concept_id
    rel: str  # contains, defines, depends_on, etc.
    dst: str  # destination concept_id
    confidence: float
}
```

**Hierarchy Mapping**:
- **Level 0**: Document (Sun)
- **Level 2**: Clusters (Planets)
- **Level 3**: Refinements (Moons)
- **Level 4**: Atomic Concepts (Asteroids/Satellites)

---

## Architecture Design

### Technology Stack

**3D Rendering**:
- **Option A**: Three.js + react-three-fiber (recommended)
  - Pros: Full 3D control, WebGL performance, rich ecosystem
  - Cons: Steeper learning curve, larger bundle size
  
- **Option B**: D3-force-3D
  - Pros: Familiar D3 API, easier migration from current code
  - Cons: Less flexible camera control, limited visual effects

**Recommendation**: Use **Three.js** for true 3D orbital visualization with smooth camera controls.

**Integration Points**:
- Replace `renderForceGraph()` in dualVisualizer.js
- Reuse existing event bus for search/selection
- Maintain compatibility with Galaxy View and Planet View
- Use same ontology API endpoint

### Semantic Gravity Model

**Orbital Radius Calculation**:

For each concept `i`, calculate orbit radius based on semantic distance from the sun (document root):

```
r_i = α × (1 / (1 + similarity(v_sun, v_i)))
```

Where:
- `α` = base radius multiplier (e.g., 200 units)
- `similarity(v_sun, v_i)` = cosine similarity between embeddings (if available)
- Fallback: Use `hierarchy_level` and `confidence` as proxy

**Simplified Formula (No Embeddings)**:
```
r_i = base_radius × hierarchy_level × (1 / confidence)
```

Example:
- Level 2 cluster with 0.9 confidence → radius = 200 × 2 × (1/0.9) = 444 units
- Level 3 refinement with 0.7 confidence → radius = 200 × 3 × (1/0.7) = 857 units

**Node Size Mapping**:
```
size_i = base_size × (1 + connection_count / max_connections)
```

**Color Mapping**:
- Map `concept.type` to hue (e.g., Topic=blue, Feature=green, Technology=purple)
- Use `confidence` for brightness (higher confidence = brighter)
- Use `hierarchy_level` for saturation (lower levels = more saturated)

**Orbital Animation** (Optional):
```
θ_i(t) = θ_0 + (ω_i × t)
ω_i = base_speed / r_i  # Slower orbits for distant concepts
```

---

## Implementation Phases

### Phase 1: Backend - Gravitational Kernel API

**Objective**: Create endpoint that calculates orbital positions for all concepts.

**New Endpoint**: `GET /api/doc/{docId}/solar-system`

**Response Format**:
```json
{
  "sun": {
    "id": "doc_abc123",
    "label": "Pillars Framework v3",
    "type": "document"
  },
  "planets": [
    {
      "id": "c_doc_abc123_0",
      "label": "Healthcare Services",
      "type": "cluster",
      "hierarchy_level": 2,
      "orbit_radius": 300,
      "size": 15,
      "color": "#4a90e2",
      "confidence": 0.92,
      "moons": [
        {
          "id": "c_doc_abc123_8",
          "label": "Wellness Services",
          "type": "refinement",
          "hierarchy_level": 3,
          "orbit_radius": 80,
          "size": 8,
          "color": "#5ba3f5",
          "confidence": 0.85
        }
      ]
    }
  ],
  "asteroids": [
    {
      "id": "c_doc_abc123_42",
      "label": "DEXA Scan",
      "type": "concept",
      "hierarchy_level": 4,
      "orbit_radius": 150,
      "size": 5,
      "color": "#7ab8ff",
      "confidence": 0.78
    }
  ]
}
```

**Implementation**:
```python
@app.get("/api/doc/{doc_id}/solar-system")
async def get_solar_system(doc_id: str):
    # 1. Fetch ontology from database
    ontology = get_ontology_from_db(doc_id)
    
    # 2. Identify sun (level 0 or root concept)
    sun = next((c for c in ontology.concepts if c.hierarchy_level == 0), None)
    
    # 3. Group concepts by hierarchy level
    clusters = [c for c in ontology.concepts if c.hierarchy_level == 2]
    refinements = [c for c in ontology.concepts if c.hierarchy_level == 3]
    concepts = [c for c in ontology.concepts if c.hierarchy_level == 4]
    
    # 4. Calculate orbital positions
    planets = []
    for cluster in clusters:
        # Find moons (refinements) that are children of this cluster
        moons = find_children(cluster, refinements, ontology.relations)
        
        planet = {
            "id": cluster.id,
            "label": cluster.label,
            "type": cluster.type,
            "hierarchy_level": cluster.hierarchy_level,
            "orbit_radius": calculate_orbit_radius(cluster, sun),
            "size": calculate_node_size(cluster, ontology.relations),
            "color": map_type_to_color(cluster.type),
            "confidence": cluster.confidence,
            "moons": [
                {
                    "id": moon.id,
                    "label": moon.label,
                    "type": moon.type,
                    "hierarchy_level": moon.hierarchy_level,
                    "orbit_radius": calculate_moon_orbit(moon, cluster),
                    "size": calculate_node_size(moon, ontology.relations),
                    "color": map_type_to_color(moon.type),
                    "confidence": moon.confidence
                }
                for moon in moons
            ]
        }
        planets.append(planet)
    
    # 5. Handle orphaned concepts (asteroids)
    asteroids = [c for c in concepts if not has_parent(c, clusters, ontology.relations)]
    
    return {
        "sun": sun,
        "planets": planets,
        "asteroids": asteroids
    }
```

**Helper Functions**:
```python
def calculate_orbit_radius(concept, sun, base_radius=200):
    """Calculate orbit radius based on hierarchy and confidence"""
    return base_radius * concept.hierarchy_level * (1 / concept.confidence)

def calculate_moon_orbit(moon, planet, base_radius=80):
    """Calculate moon orbit radius relative to parent planet"""
    return base_radius * (1 / moon.confidence)

def calculate_node_size(concept, relations, base_size=10):
    """Calculate node size based on connection count"""
    connections = sum(1 for r in relations if r.src == concept.id or r.dst == concept.id)
    max_connections = 20  # Normalize
    return base_size * (1 + connections / max_connections)

def map_type_to_color(concept_type):
    """Map concept type to color hue"""
    color_map = {
        "Topic": "#4a90e2",      # Blue
        "Feature": "#50c878",    # Green
        "Technology": "#9b59b6", # Purple
        "Project": "#e74c3c",    # Red
        "Financial": "#f39c12",  # Orange
        "Research": "#1abc9c",   # Teal
    }
    return color_map.get(concept_type, "#95a5a6")  # Default gray

def find_children(parent, candidates, relations):
    """Find all concepts that are children of parent via 'contains' relation"""
    return [
        c for c in candidates
        if any(r.src == parent.id and r.dst == c.id and r.rel == "contains" for r in relations)
    ]

def has_parent(concept, candidates, relations):
    """Check if concept has a parent in candidates"""
    return any(
        r.src == p.id and r.dst == concept.id and r.rel == "contains"
        for p in candidates for r in relations
    )
```

**Estimated Time**: 4-6 hours

---

### Phase 2: Frontend - 3D Visualization Layer

**Objective**: Build Three.js scene with orbital rendering.

**New File**: `frontend/solarSystemView3D.js`

**Core Components**:

1. **Scene Setup**:
```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene, camera, renderer, controls;
let solarSystemData = null;

export function initSolarSystem3D(container) {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);  // Black space
  
  // Create camera
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
  camera.position.set(0, 500, 1000);
  camera.lookAt(0, 0, 0);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  
  // Add orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 100;
  controls.maxDistance = 5000;
  
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  
  // Add point light at sun
  const sunLight = new THREE.PointLight(0xffffff, 1, 3000);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);
  
  // Start animation loop
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  
  // Optional: Rotate planets/moons
  if (solarSystemData) {
    updateOrbits();
  }
  
  renderer.render(scene, camera);
}
```

2. **Sun Rendering**:
```javascript
function createSun(sunData) {
  const geometry = new THREE.SphereGeometry(50, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffd700,  // Gold
    emissive: 0xffd700,
    emissiveIntensity: 0.8
  });
  const sun = new THREE.Mesh(geometry, material);
  sun.userData = sunData;
  
  // Add label
  const label = createLabel(sunData.label);
  label.position.set(0, 70, 0);
  sun.add(label);
  
  scene.add(sun);
  return sun;
}
```

3. **Planet Rendering**:
```javascript
function createPlanet(planetData) {
  const geometry = new THREE.SphereGeometry(planetData.size, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: planetData.color,
    metalness: 0.3,
    roughness: 0.7
  });
  const planet = new THREE.Mesh(geometry, material);
  planet.userData = planetData;
  
  // Position on orbit
  const angle = Math.random() * Math.PI * 2;
  planet.position.set(
    Math.cos(angle) * planetData.orbit_radius,
    0,
    Math.sin(angle) * planetData.orbit_radius
  );
  
  // Add orbit ring
  const orbitRing = createOrbitRing(planetData.orbit_radius);
  scene.add(orbitRing);
  
  // Add label
  const label = createLabel(planetData.label);
  label.position.set(0, planetData.size + 10, 0);
  planet.add(label);
  
  scene.add(planet);
  
  // Create moons
  planetData.moons.forEach(moonData => {
    createMoon(moonData, planet);
  });
  
  return planet;
}
```

4. **Moon Rendering**:
```javascript
function createMoon(moonData, parentPlanet) {
  const geometry = new THREE.SphereGeometry(moonData.size, 12, 12);
  const material = new THREE.MeshStandardMaterial({
    color: moonData.color,
    metalness: 0.2,
    roughness: 0.8
  });
  const moon = new THREE.Mesh(geometry, material);
  moon.userData = moonData;
  
  // Position relative to planet
  const angle = Math.random() * Math.PI * 2;
  moon.position.set(
    Math.cos(angle) * moonData.orbit_radius,
    0,
    Math.sin(angle) * moonData.orbit_radius
  );
  
  // Add to planet (local coordinates)
  parentPlanet.add(moon);
  
  // Add moon orbit ring (relative to planet)
  const moonOrbit = createOrbitRing(moonData.orbit_radius, 0.3);
  parentPlanet.add(moonOrbit);
  
  return moon;
}
```

5. **Orbit Ring Helper**:
```javascript
function createOrbitRing(radius, opacity = 0.2) {
  const geometry = new THREE.RingGeometry(radius - 1, radius + 1, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0x444444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: opacity
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = Math.PI / 2;  // Lay flat
  return ring;
}
```

6. **Label Rendering**:
```javascript
function createLabel(text) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  context.font = '20px Arial';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.fillText(text, 128, 36);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(100, 25, 1);
  
  return sprite;
}
```

7. **Orbital Animation** (Optional):
```javascript
let orbitSpeed = 0.0005;
let planets = [];

function updateOrbits() {
  planets.forEach((planet, i) => {
    const radius = planet.userData.orbit_radius;
    const speed = orbitSpeed / Math.sqrt(radius);  // Kepler's law approximation
    
    const currentAngle = Math.atan2(planet.position.z, planet.position.x);
    const newAngle = currentAngle + speed;
    
    planet.position.x = Math.cos(newAngle) * radius;
    planet.position.z = Math.sin(newAngle) * radius;
    
    // Rotate planet's moons
    planet.rotation.y += speed * 2;
  });
}
```

**Estimated Time**: 8-10 hours

---

### Phase 3: Interactive Controls

**Objective**: Add click, hover, and camera controls.

**Features**:

1. **Raycasting for Click Detection**:
```javascript
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', onMouseClick);

function onMouseClick(event) {
  // Calculate mouse position in normalized device coordinates
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  // Update raycaster
  raycaster.setFromCamera(mouse, camera);
  
  // Check for intersections
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (object.userData && object.userData.id) {
      handleConceptClick(object.userData);
    }
  }
}

function handleConceptClick(conceptData) {
  console.log('Clicked:', conceptData.label);
  
  // Emit event to other views
  bus.emit('conceptSelected', {
    conceptId: conceptData.id,
    docId: currentDocId,
    concept: conceptData,
    nodeType: conceptData.type,
    hierarchyLevel: conceptData.hierarchy_level
  });
  
  // Focus camera on object
  focusCameraOn(conceptData);
}
```

2. **Camera Focus Animation**:
```javascript
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min';

function focusCameraOn(conceptData) {
  // Find the mesh
  const mesh = scene.children.find(c => c.userData.id === conceptData.id);
  if (!mesh) return;
  
  // Calculate target position (offset from object)
  const targetPos = mesh.position.clone();
  const offset = new THREE.Vector3(0, 100, 200);
  const cameraTarget = targetPos.clone().add(offset);
  
  // Animate camera
  new TWEEN.Tween(camera.position)
    .to(cameraTarget, 1000)
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();
  
  new TWEEN.Tween(controls.target)
    .to(targetPos, 1000)
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();
}

// Update TWEEN in animation loop
function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
  renderer.render(scene, camera);
}
```

3. **Hover Tooltips**:
```javascript
renderer.domElement.addEventListener('mousemove', onMouseMove);

let hoveredObject = null;

function onMouseMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (object.userData && object.userData.id) {
      if (hoveredObject !== object) {
        // Unhighlight previous
        if (hoveredObject) {
          hoveredObject.material.emissive.setHex(0x000000);
        }
        
        // Highlight new
        hoveredObject = object;
        object.material.emissive.setHex(0x333333);
        
        // Show tooltip
        showTooltip(object.userData, event.clientX, event.clientY);
      }
    }
  } else {
    if (hoveredObject) {
      hoveredObject.material.emissive.setHex(0x000000);
      hoveredObject = null;
      hideTooltip();
    }
  }
}

function showTooltip(data, x, y) {
  let tooltip = document.getElementById('solar-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'solar-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 10000;
    `;
    document.body.appendChild(tooltip);
  }
  
  tooltip.innerHTML = `
    <strong>${data.label}</strong><br>
    Type: ${data.type}<br>
    Confidence: ${(data.confidence * 100).toFixed(0)}%<br>
    Level: ${data.hierarchy_level}
  `;
  
  tooltip.style.left = x + 10 + 'px';
  tooltip.style.top = y + 10 + 'px';
  tooltip.style.display = 'block';
}

function hideTooltip() {
  const tooltip = document.getElementById('solar-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}
```

**Estimated Time**: 4-6 hours

---

### Phase 4: Integration with Existing Views

**Objective**: Connect Solar System 3D with Galaxy View, Planet View, and Navigator.

**Integration Points**:

1. **Replace Current Solar View**:
```javascript
// In dualVisualizer.js
import { initSolarSystem3D, loadSolarSystemData } from './solarSystemView3D.js';

export async function drawDualVisualizer(docId) {
  const ontology = await fetchOntology(docId);
  
  // Get container
  const container = document.getElementById('visualizer-top');
  
  // Initialize 3D solar system
  initSolarSystem3D(container);
  
  // Load data
  const solarData = await fetch(`/api/doc/${docId}/solar-system`).then(r => r.json());
  loadSolarSystemData(solarData);
}
```

2. **Event Bus Integration**:
```javascript
// Listen for concept selection from other views
bus.on('conceptSelected', (event) => {
  const { conceptId } = event.detail;
  highlightConceptInSolar(conceptId);
  focusCameraOnConcept(conceptId);
});

// Listen for search results
bus.on('searchResults', (event) => {
  const { results } = event.detail;
  highlightSearchResultsInSolar(results);
});

// Listen for search cleared
bus.on('searchCleared', () => {
  resetSolarHighlights();
});
```

3. **View Mode Toggle**:
```javascript
// In index.html, update view mode buttons
<div class="view-mode-toggle">
  <button data-mode="galaxy">Galaxy View</button>
  <button data-mode="solar" class="active">Solar System</button>
  <button data-mode="planet">Planet View</button>
</div>

// In main.js
document.querySelectorAll('.view-mode-toggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    switchViewMode(mode);
  });
});

function switchViewMode(mode) {
  if (mode === 'solar') {
    // Show 3D solar system
    document.getElementById('visualizer-top').style.display = 'block';
    document.getElementById('galaxyContainer').style.display = 'none';
  } else if (mode === 'galaxy') {
    // Show galaxy view
    document.getElementById('galaxyContainer').style.display = 'block';
    document.getElementById('visualizer-top').style.display = 'none';
  }
  // ... etc
}
```

**Estimated Time**: 3-4 hours

---

### Phase 5: Performance Optimization

**Objective**: Ensure smooth 60 FPS with up to 300 nodes.

**Optimizations**:

1. **Level of Detail (LOD)**:
```javascript
import { LOD } from 'three';

function createPlanetWithLOD(planetData) {
  const lod = new LOD();
  
  // High detail (close)
  const highDetail = new THREE.SphereGeometry(planetData.size, 32, 32);
  const highMesh = new THREE.Mesh(highDetail, material);
  lod.addLevel(highMesh, 0);
  
  // Medium detail
  const medDetail = new THREE.SphereGeometry(planetData.size, 16, 16);
  const medMesh = new THREE.Mesh(medDetail, material);
  lod.addLevel(medMesh, 500);
  
  // Low detail (far)
  const lowDetail = new THREE.SphereGeometry(planetData.size, 8, 8);
  const lowMesh = new THREE.Mesh(lowDetail, material);
  lod.addLevel(lowMesh, 1000);
  
  return lod;
}
```

2. **Frustum Culling**:
```javascript
// Automatically handled by Three.js, but ensure objects are properly added to scene
```

3. **Lazy Loading**:
```javascript
let loadedPlanets = [];
let visibleRange = 2000;

function updateVisiblePlanets() {
  const cameraPos = camera.position;
  
  solarSystemData.planets.forEach((planetData, i) => {
    const distance = cameraPos.distanceTo(planetMeshes[i].position);
    
    if (distance < visibleRange && !loadedPlanets[i]) {
      // Load moons
      planetData.moons.forEach(moonData => {
        createMoon(moonData, planetMeshes[i]);
      });
      loadedPlanets[i] = true;
    }
  });
}
```

4. **Geometry Instancing** (for asteroids):
```javascript
import { InstancedMesh } from 'three';

function createAsteroidField(asteroids) {
  const geometry = new THREE.SphereGeometry(5, 8, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
  
  const mesh = new InstancedMesh(geometry, material, asteroids.length);
  
  asteroids.forEach((asteroid, i) => {
    const matrix = new THREE.Matrix4();
    const angle = Math.random() * Math.PI * 2;
    const radius = asteroid.orbit_radius;
    
    matrix.setPosition(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 100,
      Math.sin(angle) * radius
    );
    
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, new THREE.Color(asteroid.color));
  });
  
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
}
```

**Estimated Time**: 4-5 hours

---

### Phase 6: Visual Polish

**Objective**: Make it look stunning and professional.

**Enhancements**:

1. **Bloom Effect** (glow):
```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,  // strength
  0.4,  // radius
  0.85  // threshold
);
composer.addPass(bloomPass);

// In animate loop
composer.render();
```

2. **Particle Background** (stars):
```javascript
function createStarField() {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  
  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 10000;
    const y = (Math.random() - 0.5) * 10000;
    const z = (Math.random() - 0.5) * 10000;
    vertices.push(x, y, z);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0.8
  });
  
  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
}
```

3. **Connection Lines** (semantic relations):
```javascript
function createRelationLines(relations, conceptMeshes) {
  relations.forEach(relation => {
    const srcMesh = conceptMeshes[relation.src];
    const dstMesh = conceptMeshes[relation.dst];
    
    if (!srcMesh || !dstMesh) return;
    
    const points = [srcMesh.position, dstMesh.position];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: relation.confidence * 0.3
    });
    
    const line = new THREE.Line(geometry, material);
    scene.add(line);
  });
}
```

4. **Smooth Transitions**:
```javascript
// Use TWEEN.js for all animations
// Ease camera movements
// Fade in/out effects for highlights
```

**Estimated Time**: 4-6 hours

---

### Phase 7: Testing & Documentation

**Objective**: Ensure quality and maintainability.

**Testing Checklist**:
- [ ] Loads correctly with various document sizes (10-300 concepts)
- [ ] Camera controls are smooth and intuitive
- [ ] Click detection works on all node types
- [ ] Hover tooltips display correctly
- [ ] Search highlighting works
- [ ] Event bus integration with other views
- [ ] Performance: 60 FPS with 200+ nodes
- [ ] No memory leaks (test with repeated view switches)
- [ ] Responsive to window resize
- [ ] Works in Chrome, Firefox, Safari

**Documentation**:
- Update ONTOLOGY_STANDARD with Solar System Mode specs
- Create user guide for 3D navigation
- Document API endpoint `/api/doc/{docId}/solar-system`
- Add code comments for all major functions

**Estimated Time**: 4-5 hours

---

## Total Effort Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Backend API | 4-6 hours |
| Phase 2: 3D Visualization | 8-10 hours |
| Phase 3: Interactive Controls | 4-6 hours |
| Phase 4: Integration | 3-4 hours |
| Phase 5: Performance | 4-5 hours |
| Phase 6: Visual Polish | 4-6 hours |
| Phase 7: Testing & Docs | 4-5 hours |
| **Total** | **31-42 hours** |

**Realistic Timeline**: 4-5 working days (8 hours/day)

---

## Risk Assessment

### Technical Risks

**High Risk**:
- Three.js bundle size may increase page load time
  - **Mitigation**: Code splitting, lazy loading

**Medium Risk**:
- Performance degradation with large ontologies (500+ concepts)
  - **Mitigation**: LOD, frustum culling, instancing
  
- Browser compatibility issues with WebGL
  - **Mitigation**: Fallback to 2D view for unsupported browsers

**Low Risk**:
- Camera controls may feel unintuitive
  - **Mitigation**: User testing, adjustable sensitivity

### Dependencies

**Required**:
- Three.js (3D rendering)
- TWEEN.js (animations)
- OrbitControls (camera)

**Optional**:
- EffectComposer (post-processing)
- UnrealBloomPass (glow effects)

---

## Success Criteria

**Functional Requirements**:
- [ ] 3D solar system renders from ontology data
- [ ] Hierarchical orbits (sun → planets → moons)
- [ ] Click to select concepts
- [ ] Hover for tooltips
- [ ] Search result highlighting
- [ ] Integration with Galaxy/Planet views

**Performance Requirements**:
- [ ] Load time < 3 seconds
- [ ] Frame rate > 45 FPS (target: 60 FPS)
- [ ] Smooth camera transitions
- [ ] No console errors

**Visual Requirements**:
- [ ] Professional aesthetic matching LoomLite theme
- [ ] Clear visual hierarchy (sun > planets > moons)
- [ ] Semantic meaning reflected in colors/sizes
- [ ] Intuitive spatial relationships

---

## Future Enhancements (v1.8+)

**Vector Gravity Mode**:
- Pull embeddings from vector DB
- Dynamically recompute orbits based on semantic similarity
- Real-time updates as documents are ingested

**Semantic Trails**:
- Visualize concept lineage (e.g., Pillars → Diagnostics → DEXA)
- Animated paths showing information flow

**Gravitational Overlap Zones**:
- Shared concepts between documents (e.g., Healthcare Services in both Pillars and DexaFit)
- Lagrange points for multi-document concepts

**Recording/Serialization**:
- Save camera positions and layouts
- Replay deterministic visualizations
- Export as video or animated GIF

**Multi-Document Solar Systems**:
- Show multiple suns (documents) in the same space
- Visualize cross-document relations
- Galaxy of solar systems

---

## Next Steps

1. **Review this game plan** with stakeholders
2. **Approve technology stack** (Three.js recommended)
3. **Set up development branch** (`feature/solar-system-3d`)
4. **Begin Phase 1** (Backend API)
5. **Iterate with user feedback** after each phase

---

**End of Game Plan**

*Generated: October 27, 2025*  
*Version: 1.0*  
*Status: Ready for Implementation*

