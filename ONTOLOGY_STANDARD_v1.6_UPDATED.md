# ONTOLOGY_STANDARD v1.6

**Version:** 1.6.1  
**Date:** October 27, 2025  
**Author:** Manus AI  
**Changes:** Added Dynamic Navigator architecture, semantic search integration, unified folder endpoints, and performance optimizations.

---

## 1. Introduction

This document defines the complete data structures, schema, user interface standards, and architectural patterns for the LoomLite ontology system, version 1.6. This version incorporates semantic search refinement, the Dynamic Navigator system, and performance optimizations for production deployment.

**Key Principles:**
- **Ontology-First Development**: All features must preserve and respect the semantic structure of documents and concepts.
- **Event-Driven Architecture**: Components communicate through a centralized event bus for loose coupling.
- **Progressive Enhancement**: Features degrade gracefully when data is unavailable or incomplete.
- **Performance-First UI**: Visual effects must not compromise responsiveness or user experience.

---

## 2. Core Data Structures

The ontology system is built on five fundamental data structures that represent the semantic understanding of documents.

### 2.1. Document
Metadata about the source document, including title, creation date, summary, and file type.

### 2.2. Concept
An abstract idea or entity extracted from the document through semantic analysis. Concepts can be organized hierarchically with parent-child relationships.

### 2.3. Relation
A directed connection between two concepts, representing semantic relationships such as "is-a", "part-of", or domain-specific associations.

### 2.4. Span
A specific text snippet from the original document, identified by character offsets. Spans provide the source evidence for extracted concepts.

### 2.5. Mention
A link between a concept and one or more spans, establishing the grounding of abstract concepts in the source text.

---

## 3. Schema Definitions

The database schema follows a normalized relational structure optimized for semantic queries and hierarchical traversal.

### 3.1. `documents` Table

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique identifier (e.g., `doc_abc123`). |
| `title` | TEXT | NOT NULL | The title or filename of the document. |
| `source_uri` | TEXT | | The original source URI or file path. |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp of document ingestion. |
| `summary` | TEXT | | A 2-3 sentence summary of the document. |
| `type` | TEXT | | File type (e.g., `pdf`, `docx`, `unknown`). |
| `text` | TEXT | | Full extracted text content (added in v1.6). |

### 3.2. `concepts` Table

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique identifier (e.g., `concept_xyz789`). |
| `doc_id` | TEXT | FOREIGN KEY | References `documents.id`. |
| `label` | TEXT | NOT NULL | Human-readable label (e.g., "Cardiology"). |
| `type` | TEXT | | Semantic type (e.g., "cluster", "refinement"). |
| `hierarchy_level` | INTEGER | | Depth in the concept hierarchy (0 = root). |
| `parent_cluster_id` | TEXT | FOREIGN KEY | References parent `concepts.id`. |
| `summary` | TEXT | | A 1-sentence summary of the concept. |
| `confidence` | REAL | | Model confidence score (0.0 to 1.0). |
| `context_scope` | TEXT | | JSON array of character offsets for highlighting. |

### 3.3. `relations` Table

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique identifier. |
| `doc_id` | TEXT | FOREIGN KEY | References `documents.id`. |
| `source_id` | TEXT | FOREIGN KEY | Source concept ID. |
| `target_id` | TEXT | FOREIGN KEY | Target concept ID. |
| `relation_type` | TEXT | | Type of relationship (e.g., "is-a", "part-of"). |
| `confidence` | REAL | | Model confidence score (0.0 to 1.0). |

### 3.4. `spans` Table

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique identifier. |
| `doc_id` | TEXT | FOREIGN KEY | References `documents.id`. |
| `start` | INTEGER | NOT NULL | Character offset start position. |
| `end` | INTEGER | NOT NULL | Character offset end position. |
| `text` | TEXT | NOT NULL | The actual text content of the span. |

### 3.5. `mentions` Table

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique identifier. |
| `concept_id` | TEXT | FOREIGN KEY | References `concepts.id`. |
| `span_id` | TEXT | FOREIGN KEY | References `spans.id`. |
| `doc_id` | TEXT | FOREIGN KEY | References `documents.id`. |

---

## 4. Semantic Search Architecture (v1.6)

### 4.1. Overview

The search system implements an **ontology-first semantic filtering pipeline** that filters documents and concepts based on semantic relevance rather than simple keyword matching. The system provides context-aware search across all visualization views.

### 4.2. Filtering Pipeline

The search process follows a multi-stage pipeline:

**Stage 1: Query Processing** - The user's text query is processed on the backend using fuzzy string matching and partial substring matching (SQL `LIKE '%query%'`).

**Stage 2: Document-Level Retrieval** - Documents are scored based on three relevance signals: title matching, concept label matching, and text span overlap.

**Stage 3: Concept-Level Scoring** - For each matching document, individual concepts are scored and included in the results if they match the query.

**Stage 4: Weighted Composite Score** - A final relevance score is computed for each document using a weighted formula.

**Stage 5: UI Filtering** - The frontend receives ranked results and applies visual filtering across all views based on document and concept IDs.

### 4.3. Composite Scoring Formula

The relevance of a document is calculated using a weighted composite score:

```
score = (0.4 × titleMatch) + (0.4 × conceptSim) + (0.2 × spanOverlap)
```

**Scoring Components:**
- **titleMatch**: Fuzzy string-matching score between the query and the document title (1.0 for exact match, 0.5 for partial, 0.0 for no match).
- **conceptSim**: The highest match score between the query and any concept label within the document.
- **spanOverlap**: The ratio of query tokens found within the document's text spans.

**Threshold**: Documents with a final `score < 0.25` are considered irrelevant and are filtered out by the backend before results are sent to the frontend.

### 4.4. Partial Matching Behavior

The search system supports **substring matching** to ensure intuitive results. For example:
- Query "echo" matches both "Echo" and "Echocardiogram"
- Query "pillars" matches "Pillars Framework" and "Pillars_Clinical_Operations"

This is implemented using SQL `LIKE '%{query}%'` on concept labels and document titles.

---

## 5. API Integration Standards

### 5.1. Search Endpoint

**Method**: `GET`  
**Endpoint**: `/api/search?q={query}`  
**Purpose**: Performs a semantic search and returns a ranked list of documents and their matching concepts, filtered by a relevance threshold.

**Response Format (v1.6)**:

```json
{
  "query": "Pillars",
  "results": [
    {
      "doc_id": "doc_123",
      "title": "Pillars Framework v.3.pdf",
      "score": 0.92,
      "match_type": "title",
      "concepts": [
        { "id": "c_456", "label": "Pillars", "score": 0.95 }
      ]
    }
  ],
  "document_scores": {
    "doc_123": 0.92,
    "doc_789": 0.35
  },
  "threshold": 0.25
}
```

### 5.2. Dynamic Navigator Endpoints

The Dynamic Navigator uses three mode-specific endpoints to provide different organizational views of the document corpus.

#### 5.2.1. Standard Mode Endpoint

**Method**: `GET`  
**Endpoint**: `/api/folders/standard`  
**Purpose**: Returns folders based on file metadata (Recent, by-type, by-date).

**Response Format**:

```json
{
  "folders": [
    {
      "id": "recent",
      "title": "Recent Documents",
      "docCount": 22,
      "items": [
        {
          "id": "doc_123",
          "title": "Document Title.pdf",
          "created_at": "2025-10-27T12:00:00Z",
          "summary": "Document summary...",
          "type": "pdf"
        }
      ]
    },
    {
      "id": "type_pdf",
      "title": "PDF Files",
      "docCount": 18,
      "items": [...]
    }
  ]
}
```

#### 5.2.2. Semantic Mode Endpoint

**Method**: `GET`  
**Endpoint**: `/api/folders/semantic`  
**Purpose**: Returns folders based on ontology clusters (Projects, Concepts, Financial, Research, AI/Tech).

**Response Format**: Same structure as Standard Mode, but folders are organized by semantic categories.

**Categories**:
- `projects` - Documents tagged with project-related concepts
- `concepts` - Documents tagged with conceptual topics
- `financial` - Documents related to financial analysis
- `research` - Research papers and whitepapers
- `ai_tech` - AI and technology-related documents

**Error Handling**: If a category fails to load, it is skipped gracefully without breaking the entire response.

#### 5.2.3. Temporal Mode Endpoint

**Method**: `GET`  
**Endpoint**: `/api/folders/temporal`  
**Purpose**: Returns folders grouped by time (Today, This Week, This Month, Older).

**Response Format**: Same structure as Standard Mode, but folders are organized chronologically.

#### 5.2.4. Active Threads Endpoint

**Method**: `GET`  
**Endpoint**: `/api/threads`  
**Purpose**: Returns hardcoded thread definitions for project-based filtering.

**Response Format**:

```json
{
  "threads": [
    {
      "id": "pillars",
      "name": "Pillars",
      "description": "Pillars Framework and related documents",
      "color": "#10b981"
    },
    {
      "id": "loomlite",
      "name": "LoomLite",
      "description": "LoomLite development and documentation",
      "color": "#3b82f6"
    },
    {
      "id": "scribe",
      "name": "Scribe",
      "description": "Scribe AI and semantic systems",
      "color": "#8b5cf6"
    }
  ]
}
```

#### 5.2.5. Thread Documents Endpoint

**Method**: `GET`  
**Endpoint**: `/api/threads/{threadId}/documents`  
**Purpose**: Returns all documents associated with a specific thread.

**Response Format**:

```json
{
  "thread_id": "pillars",
  "documents": [
    {
      "id": "doc_123",
      "title": "Pillars Framework v.3.pdf",
      "created_at": "2025-10-27T12:00:00Z",
      "summary": "Document summary..."
    }
  ]
}
```

---

## 6. Event Bus Architecture

The LoomLite system uses a centralized event bus for component communication. All events follow a consistent naming convention and payload structure.

### 6.1. Search Events

#### 6.1.1. `searchResults` Event

**Purpose**: Notify all UI components of new search results for filtering.

**Payload**:
```javascript
{
  query: "search term",
  results: [...],           // Array of matching documents
  documentScores: {...},    // Map of doc_id → score
  count: 15,                // Total result count
  threshold: 0.25           // Minimum relevance score
}
```

**Emitted By**: `searchBar.js`  
**Consumed By**: `galaxyView.js`, `dualVisualizer.js`, `planetView.js`, `navigatorDynamicPane.js`

#### 6.1.2. `searchCleared` Event

**Purpose**: Notify all UI components that the search query has been cleared.

**Payload**: `{}`

**Emitted By**: `searchBar.js`  
**Consumed By**: All views that filter based on search

### 6.2. Navigator Events

#### 6.2.1. `navigatorModeChanged` Event

**Purpose**: Notify the Dynamic Pane that the user has switched between Standard/Meaning/Time modes.

**Payload**:
```javascript
{
  mode: "meaning"  // "standard" | "meaning" | "time"
}
```

**Emitted By**: `navigatorModeSwitch.js`  
**Consumed By**: `navigatorDynamicPane.js`

#### 6.2.2. `threadSelected` Event

**Purpose**: Notify all views that the user has selected an active thread for filtering.

**Payload**:
```javascript
{
  threadId: "pillars",  // or null if deselected
  threadName: "Pillars"
}
```

**Emitted By**: `navigatorActiveThreads.js`  
**Consumed By**: `galaxyView.js`, `dualVisualizer.js`, `planetView.js`

#### 6.2.3. `documentSelected` Event

**Purpose**: Notify views that a document has been selected for focus.

**Payload**:
```javascript
{
  docId: "doc_123",
  title: "Document Title.pdf"
}
```

**Emitted By**: `navigatorDynamicPane.js`, `galaxyView.js`  
**Consumed By**: `dualVisualizer.js`, `surfaceViewer.js`

#### 6.2.4. `folderSelected` Event

**Purpose**: Notify views that a folder has been selected (future use).

**Payload**:
```javascript
{
  folderId: "projects",
  folderName: "Projects"
}
```

**Emitted By**: `navigatorDynamicPane.js`  
**Consumed By**: Reserved for future features

---

## 7. UI Interaction Standards

### 7.1. Search Refinement Behavior

When a `searchResults` event is received, UI components **MUST** filter their content based on the `documentScores` map. When a `searchCleared` event is received, all filters **MUST** be removed.

| View | Filtering Behavior |
|---|---|
| **Galaxy View** | Non-matching document nodes fade to `opacity: 0.05`. Matching nodes remain at `opacity: 1.0` with `stroke: #000000`. |
| **Solar System View** | Non-matching concept nodes fade to `opacity: 0.1`. Links to non-matching nodes fade to `opacity: 0.05`. |
| **Planet View** | Non-matching nodes fade to `opacity: 0.2`. Branches containing matching concepts auto-expand. |
| **Dynamic Navigator** | Folders containing no matching documents are hidden. Document items not in `documentScores` are hidden. |

### 7.2. Thread Filtering Behavior

When a `threadSelected` event is received, UI components **MUST** filter to show only documents associated with that thread.

| View | Filtering Behavior |
|---|---|
| **Galaxy View** | Non-thread documents fade to `opacity: 0.05`. Thread documents remain at `opacity: 1.0` with green stroke. |
| **Solar System View** | If current document is not in thread, show "Not in selected thread" message. |
| **Planet View** | If current document is not in thread, show "Not in selected thread" message. |

### 7.3. Transition Standards

All filtering actions (fading, hiding, collapsing) **MUST** use a **400ms** transition to ensure a smooth user experience.

**CSS Example**:
```css
transition: opacity 400ms ease-in-out, stroke 400ms ease-in-out;
```

**D3.js Example**:
```javascript
selection.transition().duration(400).attr('opacity', 0.05);
```

### 7.4. Performance Standards

Visual effects and animations **MUST NOT** compromise performance or responsiveness. The following optimizations are required:

**Prohibited Effects**:
- ❌ SVG filters (blur, glow, drop-shadow) - GPU-heavy
- ❌ Gradient fills on large datasets - GPU-heavy
- ❌ Animated particles or starfields - CPU/GPU-heavy
- ❌ Pulse animations on multiple elements - CPU-heavy

**Allowed Effects**:
- ✅ Simple opacity transitions
- ✅ Stroke color/width changes
- ✅ Position transforms (translate, scale)
- ✅ Collapse/expand animations (height, display)

**Target Performance**:
- **60 FPS** during transitions
- **< 100ms** response time to user interactions
- **< 200ms** search latency (backend + network)

### 7.5. Color Standards

The UI uses a minimal black/white/gray color scheme with accent colors for highlights.

**Base Colors**:
- Background: `#0a0a0a` (near black)
- Primary text: `#e6e6e6` (light gray)
- Secondary text: `#b8b8b8` (medium gray)
- Tertiary text: `#9a9a9a` (dark gray)
- Borders: `#2a2a2a` (very dark gray)

**Accent Colors**:
- Highlight: `#fad643` (yellow)
- Success: `#10b981` (green)
- Info: `#3b82f6` (blue)
- Warning: `#f59e0b` (orange)

**Thread Colors**:
- Pillars: `#10b981` (green)
- LoomLite: `#3b82f6` (blue)
- Scribe: `#8b5cf6` (purple)

---

## 8. Dynamic Navigator Architecture

### 8.1. Overview

The Dynamic Navigator is a three-mode organizational system that provides different views of the document corpus. It consists of three main components:

**Mode Switch Bar** - Three-icon toggle for switching between Standard, Meaning, and Time modes.

**Dynamic Folder Pane** - Renders folders based on the selected mode, with collapsible document lists.

**Active Threads** - Sticky section at the bottom showing project-based filters (Pillars, LoomLite, Scribe).

### 8.2. Mode Definitions

#### 8.2.1. Standard Mode

Organizes documents by file metadata:
- Recent Documents (last 20)
- PDF Files
- DOCX Files
- UNKNOWN Files

#### 8.2.2. Meaning Mode

Organizes documents by semantic categories:
- Projects
- Concepts & Topics
- Financial Analysis
- Research & Whitepapers
- AI & Technology

#### 8.2.3. Time Mode

Organizes documents chronologically:
- Today
- This Week
- This Month
- Older

### 8.3. Component Specifications

#### 8.3.1. Mode Switch Bar

**Icons**:
- Standard: Folder icon (SVG)
- Meaning: Info/circle icon (SVG)
- Time: Clock icon (SVG)

**Behavior**:
- Click to switch modes
- Active mode has green stroke (`#10b981`)
- State persists in localStorage (`navigator_mode`)

**Event**: Emits `navigatorModeChanged` when mode changes

#### 8.3.2. Dynamic Folder Pane

**Folder Structure**:
- Folder header (title + count badge + chevron)
- Collapsible document list
- Document items (icon + title)

**Visual Hierarchy**:
- Folder headers: `#e6e6e6` text, bold
- Document items: `#b8b8b8` text, lighter background (`rgba(255, 255, 255, 0.02)`)
- Hover: Brighter background (`rgba(255, 255, 255, 0.06)`) + yellow border

**Collapse State**:
- Persists in localStorage (`navigator_collapsed_folders`)
- Chevron rotates: `›` (collapsed) / `⌄` (expanded)

**Search Integration**:
- Filters folders to show only matching documents
- Hides folders with zero matches
- Shows "No matching documents in this view" when search has no results

#### 8.3.3. Active Threads

**Thread Items**:
- Thread name + colored indicator
- Click to toggle thread filter
- Active thread has colored stroke matching thread color

**Behavior**:
- Single-select (clicking active thread deselects it)
- Emits `threadSelected` event
- State persists in localStorage (`navigator_active_thread`)

### 8.4. Data Caching Strategy

The Dynamic Navigator caches data for all three modes on initialization to enable instant mode switching.

**Cache Structure**:
```javascript
foldersData = {
  standard: [...],  // Loaded from /api/folders/standard
  meaning: [...],   // Loaded from /api/folders/semantic
  time: [...]       // Loaded from /api/folders/temporal
}
```

**Cache Invalidation**:
- On `documentUploaded` event, reload all modes
- On manual refresh, reload all modes

---

## 9. Implementation Guidelines

### 9.1. Ontology-First Development

All features **MUST** preserve the semantic structure of the ontology. When implementing new features:

1. **Respect Hierarchies**: Maintain parent-child relationships between concepts
2. **Preserve Context**: Keep mentions linked to their source spans
3. **Maintain Confidence**: Propagate confidence scores through transformations
4. **Document Decisions**: Explain any semantic assumptions in code comments

### 9.2. Event-Driven Communication

Components **MUST** communicate through the event bus, not direct function calls.

**Good**:
```javascript
bus.emit('documentSelected', { docId: 'doc_123' });
```

**Bad**:
```javascript
galaxyView.selectDocument('doc_123');  // Direct coupling
```

### 9.3. Progressive Enhancement

Features **MUST** degrade gracefully when data is unavailable:

**Loading States**:
- Show "Loading folders..." when data is null
- Show "No folders found" when data is empty array
- Show "No matching documents" when search filters everything

**Error Handling**:
- Log errors to console
- Show user-friendly error messages
- Continue functioning with partial data

### 9.4. Performance Optimization

**Before Adding Visual Effects**:
1. Profile performance impact
2. Test on low-end devices
3. Ensure 60 FPS during animations
4. Provide fallback for slow devices

**Code Splitting**:
- Load heavy components on demand
- Defer non-critical initialization
- Use requestAnimationFrame for animations

---

## 10. Testing Standards

### 10.1. Search Testing

**Test Cases**:
- Partial matching (e.g., "echo" matches "echocardiogram")
- Case-insensitive matching
- Special character handling
- Empty query handling
- Search clear functionality

**Expected Behavior**:
- Results appear within 200ms
- All views filter simultaneously
- Transitions are smooth (400ms)
- Clear button resets all views

### 10.2. Navigator Testing

**Test Cases**:
- Mode switching (Standard → Meaning → Time)
- Folder collapse/expand
- Thread selection/deselection
- Search + thread combination
- Persistence across page reloads

**Expected Behavior**:
- Mode switches instantly (cached data)
- Collapse state persists
- Thread filter works across all views
- Search + thread = intersection filtering

### 10.3. Performance Testing

**Metrics**:
- Time to interactive (TTI) < 2 seconds
- Search latency < 200ms
- Frame rate during transitions ≥ 60 FPS
- Memory usage < 200MB

**Tools**:
- Chrome DevTools Performance tab
- Lighthouse performance audit
- Network throttling tests

---

## 11. Migration Guide

### 11.1. From v1.5 to v1.6

**Breaking Changes**:
- Search response format changed (added `document_scores`)
- Navigator replaced with Dynamic Navigator
- Removed glow effects from Galaxy View

**Migration Steps**:

1. **Update Search Consumers**:
   - Check for `results.document_scores` instead of flat array
   - Handle both v1.5 and v1.6 formats for backward compatibility

2. **Update Navigator Integration**:
   - Replace `navigator.js` with `navigatorV2.js`
   - Add new event listeners for `navigatorModeChanged`, `threadSelected`

3. **Remove Performance-Heavy Effects**:
   - Remove SVG filters (glow, blur)
   - Replace gradients with solid colors
   - Simplify animations to opacity/stroke changes

4. **Test All Views**:
   - Verify search filtering works
   - Verify thread filtering works
   - Verify mode switching works
   - Check performance metrics

---

## 12. Future Enhancements

### 12.1. Planned Features

**Vector-Based Similarity** - Use embeddings for true semantic search instead of keyword matching.

**Progressive Refinement** - Incremental updates as user types instead of debounced search.

**Folder-Level Scoring** - Rank folders by aggregate relevance of their documents.

**Search History** - Intelligent suggestions based on past queries.

**Saved Searches** - Quick access to frequent queries.

**Custom Threads** - User-defined project filters beyond Pillars/LoomLite/Scribe.

### 12.2. Research Directions

**Graph-Based Retrieval** - Use concept relations to expand search results.

**Multi-Modal Search** - Search across text, images, and structured data.

**Temporal Queries** - "Documents from last week about X".

**Collaborative Filtering** - "Documents similar to what others viewed".

---

*This standard supersedes all previous versions. All new development must adhere to these specifications.*

**Version History**:
- v1.0 - Initial ontology schema
- v1.5 - Added semantic folders and basic search
- v1.6 - Added semantic search refinement
- v1.6.1 - Added Dynamic Navigator, performance optimizations, unified folder endpoints

**Last Updated**: October 27, 2025

