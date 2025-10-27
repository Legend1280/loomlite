# ONTOLOGY_STANDARD v1.6
**Version:** 1.6
**Date:** October 27, 2025
**Author:** Manus AI
**Changes:** Added Semantic Search Architecture, updated API and event standards for search refinement.

---

## 1. Introduction
This document defines the complete data structures, schema, and **user interface standards** for the LoomLite ontology system, version 1.6. This version incorporates the new semantic search refinement architecture.

---

## 2. Core Data Structures
- **Document:** Metadata about the source document
- **Concept:** An abstract idea or entity extracted from the document
- **Relation:** A connection between two concepts
- **Span:** A specific text snippet from the original document
- **Mention:** A link between a concept and a span

---

## 3. Schema Definitions
*(No changes to the database schema in this version. The following is for reference.)*

### 3.1. `documents` Table
| Field | Type | Description |
|---|---|---|
| `id` | TEXT | Unique identifier for the document. |
| `title` | TEXT | The title of the document. |
| `source_uri` | TEXT | The original source URI of the document. |
| `created_at` | TEXT | The timestamp when the document was added. |
| `summary` | TEXT | A 2-3 sentence summary of the entire document. |

### 3.2. `concepts` Table
| Field | Type | Description |
|---|---|---|
| `id` | TEXT | Unique identifier for the concept. |
| `doc_id` | TEXT | The ID of the document this concept belongs to. |
| `label` | TEXT | The human-readable label for the concept. |
| `type` | TEXT | The semantic type of the concept. |
| `hierarchy_level` | INTEGER | The level in the semantic hierarchy. |
| `parent_cluster_id` | TEXT | The ID of the parent cluster concept. |
| `summary` | TEXT | A 1-sentence summary of the concept. |
| `confidence` | REAL | The model's confidence score (0.0 to 1.0). |
| `context_scope` | TEXT | JSON string of character offsets for highlighting. |

---

## 4. Semantic Search Architecture (v1.6)

### 4.1. Overview

The search system is an **ontology-first semantic filtering pipeline**. It filters documents and concepts based on semantic relevance rather than simple keyword matching. This provides a more intuitive and context-aware user experience.

### 4.2. Filtering Pipeline

| Step | Layer | Description |
|---|---|---|
| 1 | **Query Vectorization** | Convert user's text query into an embedding vector on the backend. |
| 2 | **Document-Level Retrieval** | Compute cosine similarity between the query vector and each document's mean concept vector. |
| 3 | **Concept-Level Scoring** | For relevant documents, compute the maximum match score across their individual concept embeddings. |
| 4 | **Weighted Composite Score** | Combine multiple relevance signals into a single score for each document. |
| 5 | **UI Filtering** | The frontend receives ranked results and filters all views to hide or fade items below a score threshold. |

### 4.3. Composite Scoring Formula

The relevance of a document is calculated using a weighted composite score:

`score = (0.4 * titleMatch) + (0.4 * conceptSim) + (0.2 * spanOverlap)`

- **`titleMatch`**: Fuzzy string-matching score between the query and the document title.
- **`conceptSim`**: The highest cosine similarity score between the query vector and any concept vector within the document.
- **`spanOverlap`**: The ratio of query tokens found within the document's text spans.

**Threshold**: Documents with a final `score < 0.25` are considered irrelevant and are filtered out by the backend before results are sent to the frontend.

---

## 5. API Integration Standards

### 5.1. Enhanced `/api/search` Endpoint

- **Method**: `GET`
- **Endpoint**: `/api/search?q={query}`
- **Purpose**: Performs a semantic search and returns a ranked list of documents and their matching concepts, filtered by a relevance threshold.

### 5.2. Search Response Format (v1.6)

The `/api/search` endpoint returns a JSON object with the following structure:

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

| Field | Type | Description |
|---|---|---|
| `query` | String | The original search query. |
| `results` | Array | A ranked array of matching document objects. |
| `document_scores`| Object | A map of all document IDs to their relevance scores. Used by the UI to filter views. |
| `threshold` | Number | The minimum score required for a document to be included in the `results`. |

---

## 6. Event Bus Architecture

### 6.1. Updated `searchResults` Event

The payload for the `searchResults` event is updated to include the full data from the enhanced API response.

- **Event Name**: `searchResults`
- **Payload**: `{ query, results, documentScores, count, threshold }`
- **Purpose**: To notify all UI components of new search results so they can filter their views accordingly.

### 6.2. New `searchCleared` Event

- **Event Name**: `searchCleared`
- **Payload**: `{}`
- **Purpose**: To notify all UI components that the search query has been cleared, so they should reset their views to the default state (showing all items).

---

## 7. UI Interaction Standards for Search

### 7.1. Search Refinement Behavior

When a `searchResults` event is received, UI components MUST filter their content based on the `documentScores` map. When a `searchCleared` event is received, all filters MUST be removed.

| View | Filtering Behavior |
|---|---|
| **Galaxy View** | Non-matching document nodes fade to `opacity: 0.05`. Matching nodes remain at `opacity: 1.0`. |
| **Solar System View** | Non-matching concept nodes and their links fade to `opacity: 0.1`. |
| **Planet View** | Branches containing no matching concepts are collapsed. Matching nodes are highlighted. |
| **Navigator Sidebar** | Document items that are not in the `documentScores` map are hidden (`display: none`). |
| **Semantic Folders** | Folders containing no matching documents are hidden (`display: none`). |

### 7.2. Transitions

All filtering actions (fading, hiding, collapsing) MUST use a **400ms** transition to ensure a smooth user experience.

---

*This standard supersedes all previous versions. All new development must adhere to these specifications.*
must adhere to these specifications.*
the specifications outlined in this document.*

