# Loom Lite UI Wireframe

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  🧵 Loom Lite                                    [Search Box......] │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  CONCEPT FILTERS (Horizontal Scrollable Chips)                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │ Metric │ │  Date  │ │ Person │ │Project │ │ Topic  │ │Tech... ││
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘│
│                                                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │Q4 2024 │ │Loom... │ │Business│ │Financial│ │Patents │           │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘           │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    MIND MAP VISUALIZATION                            │
│                                                                      │
│                         ┌──────────┐                                │
│                         │  Loom    │                                │
│                         │  Lite    │                                │
│                         └────┬─────┘                                │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              │               │               │                      │
│         ┌────▼────┐    ┌────▼────┐    ┌────▼────┐                 │
│         │ Revenue │    │  Brady  │    │ Q4 2024 │                 │
│         │  Model  │    │ Simmons │    │         │                 │
│         └────┬────┘    └─────────┘    └─────────┘                 │
│              │                                                       │
│         ┌────▼────┐                                                 │
│         │Subscrip-│                                                 │
│         │  tion   │                                                 │
│         │ Pricing │                                                 │
│         └─────────┘                                                 │
│                                                                      │
│  [Nodes are color-coded circles with labels below]                  │
│  [Lines connect related concepts with relationship labels]          │
│  [Interactive: drag nodes, click to view details]                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Detailed Component Breakdown

### 1. TOP BAR (Fixed Header)
```
┌─────────────────────────────────────────────────────────────────────┐
│  🧵 Loom Lite                    [🔍 Search concepts, documents...] │
└─────────────────────────────────────────────────────────────────────┘
```
- **Logo**: Left side "🧵 Loom Lite"
- **Search Box**: Large, prominent, right side
- **Height**: ~60px
- **Background**: White with subtle shadow

### 2. CONCEPT FILTER BAR (Horizontal Scrollable)
```
┌─────────────────────────────────────────────────────────────────────┐
│  CONCEPT TYPES:                                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │ Metric │ │  Date  │ │ Person │ │Project │ │ Topic  │ │Tech... ││
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘│
│                                                                      │
│  METADATA TAGS:                                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │Q4 2024 │ │Loom Lite│ │Business│ │Financial│ │Patents │           │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘           │
│                                                                      │
│  PROJECTS:                                                           │
│  ┌────────┐ ┌────────┐ ┌────────┐                                  │
│  │Loom Lite│ │Pillars │ │N8N Int.│                                  │
│  └────────┘ └────────┘ └────────┘                                  │
│                                                                      │
│  FILE TYPES:                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐                                  │
│  │Business│ │Technical│ │  User  │                                  │
│  │  Plan  │ │  Spec   │ │ Guide  │                                  │
│  └────────┘ └────────┘ └────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
```
- **Chips**: Rounded, clickable, toggle active state
- **Active State**: Blue background, white text
- **Inactive State**: Light gray background, dark text
- **Scrollable**: Horizontal scroll if too many chips
- **Height**: ~150-200px (auto-expand based on categories)
- **Background**: Light gray (#f8f9fa)

### 3. MIND MAP VISUALIZATION (Full Height Below)
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    Document: Loom Lite Business Plan Q4 2024        │
│                                                                      │
│                                                                      │
│                         ●────────●                                   │
│                        ╱│        │╲                                  │
│                       ╱ │  Loom  │ ╲                                 │
│                      ╱  │  Lite  │  ╲                                │
│                     ╱   │(Project)│   ╲                              │
│                    ╱    ●────────●    ╲                             │
│                   ╱          │          ╲                            │
│                  ╱           │owns       ╲                           │
│                 ╱            │            ╲                          │
│                ╱             │             ╲                         │
│          ●────────●     ●────────●     ●────────●                   │
│          │Revenue │     │ Brady  │     │Q4 2024 │                   │
│          │ Model  │     │Simmons │     │ (Date) │                   │
│          │(Metric)│     │(Person)│     └────────┘                   │
│          ●────────●     └────────┘                                   │
│               │                                                       │
│               │depends_on                                            │
│               │                                                       │
│          ●────────●                                                  │
│          │Subscrip│                                                  │
│          │ -tion  │                                                  │
│          │Pricing │                                                  │
│          │(Metric)│                                                  │
│          ●────────●                                                  │
│                                                                      │
│                                                                      │
│  [Click nodes to view evidence in document]                          │
│  [Drag nodes to rearrange layout]                                    │
│  [Zoom with scroll wheel]                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```
- **Nodes**: Colored circles (12-20px radius based on confidence)
- **Labels**: Below each node, bold, readable
- **Edges**: Lines connecting nodes with relationship labels
- **Background**: White or very light gray
- **Interactive**: Drag, zoom, click
- **Height**: Fill remaining viewport (calc(100vh - 260px))

## Visual Style Guide

### Colors

**Concept Types:**
- 🔵 **Metric**: #3b82f6 (Blue)
- 🟢 **Date**: #10b981 (Green)
- 🟣 **Person**: #8b5cf6 (Purple)
- 🟠 **Project**: #f59e0b (Orange)
- 🔴 **Topic**: #ec4899 (Pink)
- 🔷 **Technology**: #06b6d4 (Cyan)
- 🟡 **Feature**: #eab308 (Yellow)
- 🟤 **Process**: #f97316 (Orange-Red)
- ⚪ **Team**: #6366f1 (Indigo)

**UI Elements:**
- **Active Chip**: #2563eb (Blue)
- **Inactive Chip**: #e5e7eb (Light Gray)
- **Background**: #f8f9fa (Off-White)
- **Text**: #1e293b (Dark Gray)
- **Edges**: #94a3b8 (Medium Gray, 60% opacity)

### Typography

- **Logo**: 20px, Bold, Blue (#2563eb)
- **Search Box**: 14px, Regular
- **Chip Text**: 13px, Medium
- **Node Labels**: 12px, Bold
- **Edge Labels**: 10px, Regular
- **Document Title**: 16px, Semibold

### Spacing

- **Top Bar**: 60px height, 20px padding
- **Filter Bar**: 150-200px height, 16px padding
- **Mind Map**: Remaining height (calc(100vh - 260px))
- **Chip Spacing**: 8px gap between chips
- **Node Spacing**: 150px distance (force layout)

## Interaction Patterns

### Search Flow
1. User types in search box
2. Press Enter or click Search button
3. Filter chips update based on results
4. Mind map shows aggregated concepts from matching documents
5. Click a chip to filter further

### Filter Flow
1. Click a concept type chip (e.g., "Metric")
2. Mind map filters to show only Metric nodes
3. Click again to deselect
4. Multiple chips can be active (OR logic)

### Mind Map Interaction
1. **Click Node**: Show document excerpt in modal/sidebar
2. **Drag Node**: Rearrange layout (position persists)
3. **Hover Node**: Show tooltip with details
4. **Scroll**: Zoom in/out
5. **Pan**: Drag background to move view

## Responsive Behavior

### Desktop (>1200px)
- Full layout as shown
- Filter chips in 2-3 rows
- Mind map fills remaining space

### Tablet (768-1200px)
- Search box full width
- Filter chips scroll horizontally
- Mind map slightly smaller

### Mobile (<768px)
- Stack vertically
- Search box full width
- Filter chips in dropdown/accordion
- Mind map scrollable

## Example States

### State 1: Initial Load (No Search)
```
Top Bar: Empty search box
Filter Bar: All chips visible, none active
Mind Map: Empty state message "Search or select a document to view ontology"
```

### State 2: After Search "revenue"
```
Top Bar: "revenue" in search box
Filter Bar: "Metric" and "Financial Planning" chips auto-selected
Mind Map: Shows Revenue Model, Subscription Pricing, MRR nodes with connections
```

### State 3: Document Selected
```
Top Bar: Empty search box
Filter Bar: Chips for document's concepts (auto-populated)
Mind Map: Full ontology of selected document
```

### State 4: Filtered View
```
Top Bar: Search query active
Filter Bar: Multiple chips active (Metric + Q4 2024 + Loom Lite)
Mind Map: Only nodes matching all filters
```

## Key Differences from Current Implementation

### ❌ Current (Wrong)
- Three-panel layout (tree, graph, text)
- Document tree on left side
- Small graph in center
- Text viewer on right
- Cluttered, complex

### ✅ New (Correct)
- Single-panel focus on mind map
- Search + filters at top
- Large mind map below
- Clean, simple, focused
- Like NotebookLM + Pillars combined

## Implementation Priority

1. **Top Bar**: Logo + Search box (simple)
2. **Filter Bar**: Horizontal chips with categories
3. **Mind Map**: Full-screen D3.js visualization
4. **Interactions**: Click, drag, hover
5. **Responsive**: Mobile-friendly

---

**This wireframe matches:**
- ✅ Pillars dashboard search/filter style (top)
- ✅ NotebookLM mind map style (bottom)
- ✅ Your vision of ontological concept navigation
- ✅ Clean, focused, single-purpose UI

