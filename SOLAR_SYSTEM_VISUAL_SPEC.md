# Solar System Mode - Minimal Visual Specification
**Version**: 1.0 Lean  
**Design Philosophy**: Reduction, Clarity, Structure

---

## Visual Hierarchy

### Galaxy View → Solar System View Progression

**Galaxy View** (Current):
- Solid white circles
- Dense, interconnected
- Overview of all documents

**Solar System View** (New):
- Hollow circles (stroke only)
- Structured orbits
- Focused on single document

**Principle**: Visual reduction = conceptual focus

---

## Node Rendering

### Hollow Circle Design

**Structure**:
```
┌─────────────┐
│   ○ ○ ○     │  Hollow circles (stroke only)
│  ○     ○    │  Black centers (transparent)
│   ○ ○ ○     │  Sized by importance
└─────────────┘
```

**Specifications**:
- **Fill**: `none` (transparent/black background shows through)
- **Stroke**: White or light gray (`#e6e6e6`)
- **Stroke-width**: 1.5px (thin, clean)
- **Radius**: Based on connections + confidence

**Size Formula**:
```javascript
radius = baseSize + (connections / maxConnections) * scaleFactor
baseSize = 4px
scaleFactor = 6px
// Range: 4px - 10px
```

**Color Mapping**:
- Use stroke color for concept type
- Subtle hue variations (not bright)
- Maintain minimal aesthetic

**Type Colors** (Desaturated):
```javascript
{
  "Topic": "#8ab4f8",      // Soft blue
  "Feature": "#81c995",    // Soft green  
  "Technology": "#c58af9", // Soft purple
  "Project": "#f28b82",    // Soft red
  "Financial": "#fdd663",  // Soft yellow
  "Research": "#78d9c8",   // Soft teal
  "default": "#9aa0a6"     // Soft gray
}
```

---

## Orbit Rings

### Hierarchy Levels

**Visual Structure**:
```
        ☉ Sun (center, level 0)
       ╱│╲
      ○ ○ ○  Planets (orbit 1, level 2)
     ╱  │  ╲
    ○   ○   ○ Moons (orbit 2, level 3)
```

**Ring Specifications**:
- **Stroke**: `#2a2a2a` (very dark gray, subtle)
- **Stroke-width**: 0.5px (barely visible)
- **Stroke-dasharray**: `2,4` (dashed, not solid)
- **Fill**: `none`
- **Opacity**: 0.3

**Radius Calculation**:
```javascript
orbitRadius = baseRadius * hierarchyLevel * (1 / confidence)

baseRadius = 150px
hierarchyLevel: 0, 2, 3, 4
confidence: 0.0 - 1.0

Examples:
- Level 2, conf 0.9 → 150 * 2 * 1.11 = 333px
- Level 3, conf 0.7 → 150 * 3 * 1.43 = 643px
```

---

## Sun (Document Root)

**Special Rendering**:
- **Type**: Solid circle (exception to hollow rule)
- **Fill**: `#ffd700` (gold)
- **Radius**: 20px (larger than all others)
- **Glow**: Optional subtle drop-shadow
- **Position**: Center (0, 0) in viewport

**Label**:
- **Position**: Below sun (y + 35px)
- **Font**: 14px, bold
- **Color**: `#e6e6e6`
- **Max-width**: 200px, truncate with ellipsis

---

## Relation Lines

**Minimal Connections**:
- **Stroke**: `#3a3a3a` (dark gray)
- **Stroke-width**: 0.5px (very thin)
- **Opacity**: `confidence * 0.4` (max 40%)
- **Type**: Straight lines (no curves initially)

**Rendering Order**:
1. Lines (bottom layer)
2. Orbit rings
3. Nodes (top layer)

**Optimization**:
- Only render lines for visible nodes
- Skip lines with confidence < 0.3

---

## Layout Algorithm

### Polar Positioning

**Formula**:
```javascript
// For each node at hierarchy level L:
const nodesAtLevel = nodes.filter(n => n.hierarchy_level === L);
const angleStep = (2 * Math.PI) / nodesAtLevel.length;

nodesAtLevel.forEach((node, i) => {
  const angle = i * angleStep;
  const radius = calculateOrbitRadius(node);
  
  node.x = centerX + radius * Math.cos(angle);
  node.y = centerY + radius * Math.sin(angle);
});
```

**Angle Distribution**:
- Evenly spaced around orbit
- No overlap (guaranteed by polar math)
- Deterministic (same data = same layout)

**Center Point**:
- `centerX = viewportWidth / 2`
- `centerY = viewportHeight / 2`

---

## Interaction States

### Hover
- **Stroke-width**: 2.5px (thicker)
- **Stroke-opacity**: 1.0 (full brightness)
- **Transition**: 150ms ease

### Selected
- **Stroke**: `#4a90e2` (blue accent)
- **Stroke-width**: 2.5px
- **Add**: Outer ring at radius + 4px

### Search Match
- **Stroke**: `#50c878` (green)
- **Stroke-width**: 2px
- **Non-matches**: Opacity 0.2

---

## Zoom & Pan

**D3 Zoom Behavior**:
```javascript
zoom = d3.zoom()
  .scaleExtent([0.3, 3])  // 30% to 300%
  .on("zoom", handleZoom);
```

**Initial View**:
- Fit all orbits in viewport
- Leave 10% padding on edges

---

## Performance Targets

**Rendering**:
- Initial load: < 500ms
- Smooth zoom/pan: 60 FPS
- Node count: Up to 300 nodes

**Optimizations**:
- No animations (initially)
- Simple SVG primitives only
- Minimal DOM updates

---

## Responsive Behavior

**Window Resize**:
- Recalculate center point
- Scale orbits proportionally
- Maintain aspect ratio

**Small Screens** (< 800px width):
- Reduce baseRadius to 100px
- Smaller node sizes (3-7px)
- Hide orbit rings (optional)

---

## Accessibility

**Labels**:
- Always visible for sun
- Show on hover for planets/moons
- High contrast text

**Keyboard Navigation**:
- Tab through nodes
- Enter to select
- Escape to deselect

---

## Implementation Checklist

**Phase 1: Core Rendering**
- [ ] Polar layout algorithm
- [ ] Hollow circle nodes
- [ ] Sun rendering (solid)
- [ ] Orbit rings

**Phase 2: Connections**
- [ ] Relation lines
- [ ] Opacity based on confidence
- [ ] Render order (lines → rings → nodes)

**Phase 3: Interaction**
- [ ] Hover states
- [ ] Click to select
- [ ] Zoom & pan
- [ ] Tooltips

**Phase 4: Integration**
- [ ] Search highlighting
- [ ] Event bus (conceptSelected, searchResults)
- [ ] View mode switching

**Phase 5: Polish**
- [ ] Responsive sizing
- [ ] Smooth transitions
- [ ] Label positioning
- [ ] Performance testing

---

## Code Structure

**File**: `frontend/dualVisualizer.js`

**New Function**: `renderSolarSystem(svg, data)`

**Replaces**: `renderForceGraph(svg, data)`

**Estimated Lines**: ~200 lines (lean!)

---

## Visual Comparison

**Before** (Force Graph):
- Random positions
- Solid white circles
- Many crossing lines
- Chaotic energy

**After** (Solar System):
- Structured orbits
- Hollow circles
- Minimal lines
- Calm clarity

---

**End of Visual Spec**

*Ready for implementation*

