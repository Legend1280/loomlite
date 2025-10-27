# Semantic Search Integration Specification
**Version:** 1.0  
**Date:** October 27, 2025  
**Status:** Planning Phase  

---

## Executive Summary

This document specifies the integration of semantic search across all LoomLite v4.0 views (Galaxy, Solar System, Planet View, Navigator) following ontology-first development principles. The goal is to create a unified search experience that filters documents and concepts based on semantic relevance, not just keyword matching.

---

## 1. Current State Analysis

### 1.1. Existing Implementation

**Frontend (`searchBar.js`)**:
- ✅ Search input with debounce (200ms)
- ✅ Autocomplete dropdown with suggestions
- ✅ Event emission: `bus.emit('searchResults', { query, results, count })`
- ✅ API integration: `GET /search?q={query}&types={types}&tags={tags}`
- ⚠️ **Limitation**: Only highlights results, does NOT filter/hide non-matching items

**Event Listeners**:
- ✅ `galaxyView.js` - Line 39: Listens for `searchResults`, calls `highlightSearchResults()`
- ✅ `dualVisualizer.js` (Solar System) - Line 43: Listens for `searchResults`, calls `highlightSearchResultsInSolar()`
- ✅ `planetView.js` - Line 804: Listens for `searchResults`, calls `highlightSearchResults()`
- ❌ **Missing**: `navigator.js` / `sidebar.js` - NO search filtering
- ❌ **Missing**: Semantic folder filtering

**Backend (`/search` endpoint)**:
- ✅ Returns concept matches with `doc_id`, `label`, `type`, `confidence`
- ❌ **Missing**: Document-level scoring (only concept-level)
- ❌ **Missing**: Semantic similarity scoring (cosine similarity)
- ❌ **Missing**: Composite scoring (title + concept + span)

### 1.2. Gaps Identified

| Component | Current Behavior | Desired Behavior |
|-----------|------------------|------------------|
| **Galaxy View** | Highlights matching docs | Fade out non-matching docs (opacity: 0.05) |
| **Solar System** | Highlights matching concepts | Hide non-matching concepts |
| **Planet View** | Highlights matching concepts | Collapse non-matching branches |
| **Navigator/Sidebar** | No filtering | Hide non-matching documents |
| **Semantic Folders** | No filtering | Hide folders with zero matches |
| **Backend** | Keyword search only | Semantic similarity + composite scoring |

---

## 2. Integration Architecture

### 2.1. Event Flow Diagram

```
User Types Query
    ↓
searchBar.js (debounce 200ms)
    ↓
Backend: GET /search?q={query}
    ↓
Returns: { results: [{ doc_id, score, concepts: [...] }] }
    ↓
bus.emit('searchResults', { query, results, documentScores })
    ↓
┌─────────────────┬──────────────────┬─────────────────┬──────────────────┐
│ galaxyView.js   │ dualVisualizer.js│ planetView.js   │ navigator.js     │
│ Fade non-match  │ Hide non-match   │ Collapse non-   │ Hide non-match   │
│ docs (0.05)     │ concepts         │ match branches  │ documents        │
└─────────────────┴──────────────────┴─────────────────┴──────────────────┘
```

### 2.2. Data Flow

**Input**: User query string (e.g., "Pillars")

**Processing**:
1. **Vectorization** (backend): Convert query to embedding
2. **Document Scoring** (backend): Compute cosine similarity for each document
3. **Concept Scoring** (backend): Compute max concept match per document
4. **Composite Score** (backend): `score = 0.4*titleMatch + 0.4*conceptSim + 0.2*spanOverlap`
5. **Threshold Filtering** (backend): Only return documents with `score >= 0.25`

**Output**: 
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
  }
}
```

---

## 3. Backend Implementation Plan

### 3.1. Enhanced `/search` Endpoint

**File**: `backend/api.py`

**Changes**:
```python
@app.get("/search")
async def search(q: str, types: Optional[str] = None, tags: Optional[str] = None):
    """
    Semantic search with document-level and concept-level scoring
    
    Returns:
        {
            "query": str,
            "results": [
                {
                    "doc_id": str,
                    "title": str,
                    "score": float,  # Composite score (0-1)
                    "match_type": str,  # "title" | "concept" | "span"
                    "concepts": [...]  # Matching concepts
                }
            ],
            "document_scores": { doc_id: score }
        }
    """
    # 1. Title matching (fuzzy)
    # 2. Concept semantic similarity (if embeddings available)
    # 3. Span text matching
    # 4. Composite scoring
    # 5. Threshold filtering (score >= 0.25)
```

### 3.2. Scoring Algorithm

**Composite Score Formula**:
```
score = w1 * titleMatch + w2 * conceptSim + w3 * spanOverlap

where:
  w1 = 0.4  # Title weight
  w2 = 0.4  # Concept similarity weight
  w3 = 0.2  # Span overlap weight
  
  titleMatch = fuzzy_ratio(query, doc.title) / 100
  conceptSim = max(cosine_sim(query_emb, concept.embedding)) if embeddings else keyword_match
  spanOverlap = count(query_tokens in span.text) / len(query_tokens)
```

**Threshold**: `score >= 0.25` (documents below this are filtered out)

---

## 4. Frontend Implementation Plan

### 4.1. Galaxy View Integration

**File**: `frontend/galaxyView.js`

**Current**:
```javascript
function highlightSearchResults(results) {
  // Only highlights, doesn't filter
}
```

**Enhanced**:
```javascript
function highlightSearchResults(results) {
  const matchedDocIds = new Set(results.map(r => r.doc_id));
  
  d3.selectAll('.galaxy-node')
    .transition()
    .duration(400)
    .style('opacity', d => matchedDocIds.has(d.id) ? 1.0 : 0.05)
    .attr('r', d => matchedDocIds.has(d.id) ? d.radius * 1.2 : d.radius);
}
```

**Clear Search**:
```javascript
bus.on('searchCleared', () => {
  d3.selectAll('.galaxy-node')
    .transition()
    .duration(400)
    .style('opacity', 1.0)
    .attr('r', d => d.radius);
});
```

### 4.2. Solar System View Integration

**File**: `frontend/dualVisualizer.js`

**Enhanced**:
```javascript
function highlightSearchResultsInSolar(results) {
  const matchedConceptIds = new Set();
  results.forEach(r => {
    r.concepts?.forEach(c => matchedConceptIds.add(c.id));
  });
  
  d3.selectAll('.concept-node')
    .transition()
    .duration(400)
    .style('opacity', d => matchedConceptIds.has(d.id) ? 1.0 : 0.1)
    .attr('r', d => matchedConceptIds.has(d.id) ? 10 : 6);
    
  // Also fade links
  d3.selectAll('.concept-link')
    .transition()
    .duration(400)
    .style('opacity', d => 
      matchedConceptIds.has(d.source.id) || matchedConceptIds.has(d.target.id) ? 0.6 : 0.05
    );
}
```

### 4.3. Planet View Integration

**File**: `frontend/planetView.js`

**Enhanced**:
```javascript
function highlightSearchResults(results) {
  const matchedConceptIds = new Set();
  results.forEach(r => {
    r.concepts?.forEach(c => matchedConceptIds.add(c.id));
  });
  
  // Expand path to matched concepts
  root.descendants().forEach(d => {
    if (matchedConceptIds.has(d.data.id)) {
      // Expand all ancestors
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
  
  // Fade non-matching nodes
  d3.selectAll('.planet-node')
    .transition()
    .duration(400)
    .style('opacity', d => matchedConceptIds.has(d.data.id) ? 1.0 : 0.2);
  
  update(root);
}
```

### 4.4. Navigator/Sidebar Integration

**File**: `frontend/navigator.js` or `frontend/sidebar.js`

**New Event Listener**:
```javascript
bus.on('searchResults', (event) => {
  const { results } = event.detail;
  const matchedDocIds = new Set(results.map(r => r.doc_id));
  
  // Filter document items
  document.querySelectorAll('.document-item').forEach(item => {
    const docId = item.dataset.docId;
    if (matchedDocIds.size === 0) {
      // No search active - show all
      item.style.display = 'flex';
    } else {
      // Filter by search results
      item.style.display = matchedDocIds.has(docId) ? 'flex' : 'none';
    }
  });
});

bus.on('searchCleared', () => {
  // Show all documents
  document.querySelectorAll('.document-item').forEach(item => {
    item.style.display = 'flex';
  });
});
```

### 4.5. Semantic Folder Integration

**File**: `frontend/dynamicFoldersPanel.js` (if exists) or `frontend/navigator.js`

**New Event Listener**:
```javascript
bus.on('searchResults', (event) => {
  const { results } = event.detail;
  const matchedDocIds = new Set(results.map(r => r.doc_id));
  
  // Filter semantic folders
  document.querySelectorAll('.semantic-folder').forEach(folder => {
    const docsInFolder = Array.from(folder.querySelectorAll('.document-item'));
    const hasMatch = docsInFolder.some(doc => matchedDocIds.has(doc.dataset.docId));
    
    if (matchedDocIds.size === 0) {
      // No search - show all folders
      folder.style.display = 'block';
    } else {
      // Hide folders with no matches
      folder.style.display = hasMatch ? 'block' : 'none';
    }
  });
});
```

---

## 5. Event Bus Enhancements

### 5.1. New Events

**`searchCleared`**:
- **Emitted by**: `searchBar.js` when input is cleared
- **Payload**: `{}`
- **Purpose**: Reset all views to show all documents/concepts

**`searchRefinement`** (future):
- **Emitted by**: `searchBar.js` during typing (progressive refinement)
- **Payload**: `{ query, partial: true }`
- **Purpose**: Progressive filtering as user types

### 5.2. Enhanced `searchResults` Event

**Current**:
```javascript
bus.emit('searchResults', { query, results, count });
```

**Enhanced**:
```javascript
bus.emit('searchResults', { 
  query,
  results,  // Array of { doc_id, title, score, match_type, concepts }
  documentScores,  // Map of doc_id -> score
  count,
  threshold: 0.25
});
```

---

## 6. Performance Considerations

### 6.1. Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Search Latency | < 200ms | Backend optimization, caching |
| UI Update | < 400ms | D3 transitions, debounce |
| Large Datasets | < 500ms | Lazy loading, pagination |

### 6.2. Optimizations

1. **Debounce Input**: 200ms (already implemented)
2. **Transition Duration**: 400ms for smooth fade
3. **Lazy Rendering**: Only update visible nodes
4. **Caching**: Cache embeddings for frequently searched terms
5. **Threshold**: Filter out low-scoring results early

---

## 7. Testing Plan

### 7.1. Test Cases

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| **Exact Title Match** | "Pillars" | Pillars Framework doc shows with score ~0.9 |
| **Concept Match** | "Revenue" | All docs with "Revenue" concepts show |
| **Partial Match** | "Pil" | Pillars Framework shows (fuzzy match) |
| **No Match** | "xyz123" | All docs fade to 0.05 opacity |
| **Clear Search** | (empty input) | All docs return to full opacity |
| **Folder Filtering** | "Finance" | Only "Financial Reports" folder shows |

### 7.2. Integration Tests

1. **Galaxy → Solar → Planet**: Search in Galaxy, verify Solar and Planet update
2. **Sidebar Sync**: Search filters sidebar documents
3. **Event Bus**: Verify all modules receive `searchResults` event
4. **Performance**: Measure search latency < 200ms

---

## 8. Rollout Plan

### Phase 1: Backend Enhancement
- [ ] Implement composite scoring in `/search` endpoint
- [ ] Add document-level scoring
- [ ] Return enhanced response format
- [ ] Test with Postman/curl

### Phase 2: Frontend Integration
- [ ] Update `searchBar.js` to emit `searchCleared` event
- [ ] Implement Galaxy View filtering
- [ ] Implement Solar System filtering
- [ ] Implement Planet View filtering
- [ ] Implement Navigator/Sidebar filtering
- [ ] Implement Semantic Folder filtering

### Phase 3: Testing & Refinement
- [ ] Test all views with various queries
- [ ] Verify performance targets
- [ ] Fix edge cases
- [ ] Update documentation

### Phase 4: Documentation
- [ ] Update ONTOLOGY_STANDARD with search specifications
- [ ] Update Developer Handoff with search integration
- [ ] Create search usage guide

---

## 9. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Performance degradation** | High | Implement caching, lazy loading |
| **Event bus conflicts** | Medium | Use unique event names, test thoroughly |
| **Inconsistent filtering** | Medium | Centralize filtering logic, use same threshold |
| **Backend breaking changes** | High | Version API, maintain backward compatibility |

---

## 10. Success Criteria

- ✅ All views (Galaxy, Solar, Planet, Navigator) filter based on search
- ✅ Search latency < 200ms
- ✅ UI transitions smooth (400ms)
- ✅ Semantic folders filter correctly
- ✅ Clear search restores all documents
- ✅ Documentation updated
- ✅ No regressions in existing functionality

---

## 11. Next Steps

1. **Update ONTOLOGY_STANDARD** with semantic search specifications
2. **Implement backend enhancements** to `/search` endpoint
3. **Integrate frontend filtering** across all views
4. **Test and verify** all connections
5. **Update documentation** with completed implementation

---

**Status**: Ready for implementation  
**Estimated Effort**: 6-8 hours  
**Priority**: High  
**Dependencies**: None (all infrastructure exists)

