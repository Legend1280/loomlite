# 🧵 Loom Lite MVP

**Semantic Ontology Navigator with Mind Map Visualization**

Loom Lite is a document-bound semantic relationship fabric system that enables concept-based navigation, search, and auditability of unstructured text. It extracts micro-ontologies from documents, anchors concepts to verifiable text spans, and provides an intuitive mind map interface for exploration.

---

## 🎯 Features

### Core Capabilities

- **📄 Document Ingestion**: Process multiple file types (DOCX, PDF, Markdown, etc.)
- **🧠 Semantic Extraction**: LLM-powered concept and relationship extraction
- **🔍 Advanced Search**: Hybrid semantic + keyword search with concept filtering
- **🗺️ Mind Map Visualization**: Interactive D3.js-based ontology graphs
- **🎯 Hierarchical Navigation**: Drill down from corpus → document → span
- **🏷️ Dynamic Filtering**: Filter by concept types, time periods, projects, domains
- **🔗 N8N Integration**: REST API for workflow automation
- **📊 Provenance Tracking**: Confidence scores and extraction metadata

### Ontology Features

- **Concept Types**: Metric, Date, Person, Project, Topic, Technology, Feature, Process, Team
- **Relation Types**: defines, depends_on, causes, precedes, supports, measures, owns, enables
- **Tag Categories**: time_period, file_type, project, domain
- **Span Anchoring**: Every concept linked to exact character positions in source text

---

## 🏗️ Architecture

### Technology Stack

- **Backend**: FastAPI (Python 3.11)
- **Database**: SQLite with FTS5 full-text search
- **Vector Search**: FAISS (planned)
- **Frontend**: Vanilla JavaScript + D3.js v7
- **Visualization**: Force-directed graph with radial layout
- **Integration**: N8N-compatible REST API

### Data Model

```
Document → Span → Mention → Concept
                              ↓
                          Relation
                              ↓
                          Concept
```

**Core Entities:**
- `Document`: File metadata and content
- `Span`: Text segments with character offsets
- `Concept`: Extracted entities with type and confidence
- `Relation`: Typed relationships between concepts
- `Mention`: Links concepts to specific spans
- `Tag`: Metadata for filtering (time, project, domain)

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- SQLite 3
- Modern web browser (Chrome, Firefox, Safari)

### Installation

```bash
# Clone the repository
cd ~/loom-lite-mvp

# Install Python dependencies
pip3 install fastapi uvicorn

# Initialize database with sample data
cd backend
python3.11 sample_data.py

# Start the server
cd ..
python3.11 -c "
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import uvicorn
import sys
sys.path.insert(0, 'backend')
from main import app

app.mount('/frontend', StaticFiles(directory='frontend'), name='frontend')

@app.get('/', include_in_schema=False)
def redirect_to_frontend():
    return RedirectResponse(url='/frontend/index.html')

uvicorn.run(app, host='0.0.0.0', port=8000)
"
```

### Access the Application

- **Frontend**: http://localhost:8000/
- **API Docs**: http://localhost:8000/docs
- **API Root**: http://localhost:8000/

---

## 📖 Usage Guide

### Interface Overview

The application has three main panels:

1. **Left Panel - Document Tree**
   - Browse documents by folder hierarchy
   - Click any document to load its ontology

2. **Center Panel - Mind Map**
   - Interactive graph of concepts and relationships
   - Node size indicates confidence score
   - Node color indicates concept type
   - Click nodes to view evidence in text
   - Drag nodes to rearrange layout

3. **Right Panel - Text Viewer**
   - Shows document text with highlighted spans
   - Scrolls to relevant passages when concept is clicked
   - Displays search results and snippets

### Searching Documents

1. Enter search terms in the top search bar
2. Click filter chips to narrow by:
   - Concept types (Metric, Date, Person, Project, etc.)
   - Time periods (Q4 2024, Q1 2025, etc.)
   - Projects (Loom Lite, Pillars, etc.)
   - File types (Business Plan, Technical Spec, etc.)
3. Press Enter or click "Search"
4. Results show matched documents with concept highlights

### Exploring Ontologies

1. Click a document in the left panel
2. Mind map displays all concepts and relationships
3. Hover over nodes to see details
4. Click nodes to jump to evidence in text
5. Drag nodes to customize layout

### Understanding Visualizations

**Node Colors:**
- 🔵 Blue: Metrics (Revenue Model, KPIs)
- 🟢 Green: Dates (Q4 2024, deadlines)
- 🟣 Purple: People (Brady Simmons, teams)
- 🟠 Orange: Projects (Loom Lite, features)
- 🔴 Pink: Topics (themes, categories)
- 🔷 Cyan: Technologies (FastAPI, SQLite)

**Edge Styles:**
- Solid lines: High confidence (>0.8)
- Opacity indicates confidence score
- Labels show relationship type

---

## 🔌 N8N Integration

### API Endpoints

#### Search Documents
```bash
GET /search?q=revenue&types=Metric&tags=project:Loom%20Lite
```

#### Get Document Ontology
```bash
GET /doc/{doc_id}/ontology
```

#### Ingest Documents
```bash
POST /api/ingest
Content-Type: application/json

{
  "folder_path": "/documents",
  "files": ["business_plan.docx"]
}
```

#### Check Job Status
```bash
GET /api/job/{job_id}
```

#### Extract Concepts from Text
```bash
POST /api/extract
Content-Type: application/json

{
  "text": "Revenue model based on subscription pricing",
  "doc_id": "custom_001"
}
```

### Example N8N Workflow

See [N8N_Integration_Guide.md](docs/N8N_Integration_Guide.md) for complete workflow examples.

**Basic Document Processing:**
1. Webhook trigger receives file upload
2. HTTP Request: POST /api/ingest
3. Wait node: 5 seconds
4. HTTP Request: GET /api/job/{job_id}
5. IF node: Check status == "completed"
6. HTTP Request: GET /doc/{doc_id}/ontology
7. Slack notification with results

---

## 📊 Sample Data

The MVP includes three sample documents:

### 1. Business Plan (doc_business_plan)
- **Type**: DOCX
- **Concepts**: 14 (Revenue Model, Subscription Pricing, Q4 2024, etc.)
- **Relations**: 10 (defines, measures, depends_on, etc.)
- **Tags**: Q4 2024, Loom Lite, Financial Planning

### 2. Technical Specification (doc_technical_spec)
- **Type**: PDF
- **Concepts**: 13 (FastAPI, SQLite, FAISS, Extraction Pipeline, etc.)
- **Relations**: 7 (part_of, enables, stores, etc.)
- **Tags**: Technical Specification, Software Architecture

### 3. User Guide (doc_user_guide)
- **Type**: Markdown
- **Concepts**: 9 (File Tree, Mind Map, Search Filters, etc.)
- **Relations**: 5 (part_of, visualizes, contains, etc.)
- **Tags**: User Guide, Documentation

**Total Statistics:**
- Documents: 3
- Concepts: 36
- Relations: 22
- Tags: 10

---

## 🛠️ Development

### Project Structure

```
loom-lite-mvp/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── schema.sql           # Database schema
│   ├── sample_data.py       # Sample data generator
│   └── loom_lite.db         # SQLite database
├── frontend/
│   └── index.html           # Single-page application
├── docs/
│   └── N8N_Integration_Guide.md
├── README.md
└── start.sh                 # Startup script
```

### Adding New Documents

```python
# In backend/sample_data.py

SAMPLE_DOCUMENTS.append({
    "id": "doc_new",
    "title": "New Document",
    "path": "/documents/new_doc.pdf",
    "mime": "application/pdf",
    "content": "Document text here..."
})

SAMPLE_ONTOLOGY["doc_new"] = {
    "concepts": [...],
    "relations": [...],
    "mentions": {...},
    "tags": [...]
}

# Reinitialize database
python3.11 sample_data.py
```

### Customizing Visualization

Edit `frontend/index.html`:

```javascript
// Adjust force simulation parameters
const simulation = d3.forceSimulation(concepts)
  .force('charge', d3.forceManyBody().strength(-800))  // Repulsion
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(60))    // Node spacing
  .force('link', d3.forceLink(relations)
    .distance(150)                                      // Edge length
    .strength(0.5));                                    // Edge stiffness
```

### Adding Concept Types

1. Update `backend/sample_data.py` concept taxonomy
2. Add CSS color class in `frontend/index.html`:
```css
.type-NewType { fill: #hexcolor; stroke: #hexcolor; }
```

---

## 🔍 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tree` | Get document tree structure |
| GET | `/tags` | Get all available filter tags |
| GET | `/concepts` | Get concepts with filtering |
| GET | `/doc/{id}/ontology` | Get document ontology |
| GET | `/search` | Search documents and concepts |
| GET | `/jump` | Jump to specific span in document |

### N8N Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ingest` | Start document ingestion job |
| GET | `/api/job/{id}` | Check job status |
| POST | `/api/extract` | Extract ontology from text |

### Query Parameters

**Search:**
- `q`: Search query (required)
- `types`: Concept types filter (optional)
- `tags`: Tag filters (optional)
- `limit`: Max results (default: 10)

**Concepts:**
- `types`: Concept types filter (optional)
- `doc_ids`: Document IDs filter (optional)

---

## 🎨 Customization

### Changing Color Scheme

Edit CSS in `frontend/index.html`:

```css
/* Primary color */
#go, .facet.active {
  background: #your-color;
}

/* Node colors */
.type-Metric { fill: #your-color; }
```

### Adjusting Layout

Modify grid template in CSS:

```css
#main {
  grid-template-columns: 280px 1fr 400px;  /* left center right */
}
```

### Adding Authentication

Add JWT middleware in `backend/main.py`:

```python
from fastapi.security import HTTPBearer

security = HTTPBearer()

@app.get("/protected")
def protected_route(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Verify token
    pass
```

---

## 🚧 Roadmap

### Phase 1 (Current MVP)
- ✅ Basic ontology extraction
- ✅ Mind map visualization
- ✅ Semantic search
- ✅ N8N API integration

### Phase 2 (Next)
- [ ] LLM-based extraction pipeline
- [ ] FAISS vector search
- [ ] Multi-document weaving
- [ ] PDF text extraction
- [ ] Authentication & authorization

### Phase 3 (Future)
- [ ] Governance layer (Rita/SAGE)
- [ ] Cross-document relationship discovery
- [ ] Real-time collaboration
- [ ] Export to Neo4j/GraphDB
- [ ] Mobile responsive design

---

## 🐛 Troubleshooting

### Server won't start

```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill existing process
kill -9 <PID>

# Restart server
./start.sh
```

### Database errors

```bash
# Reinitialize database
cd backend
rm loom_lite.db
python3.11 sample_data.py
```

### Frontend not loading

```bash
# Check server logs
tail -f server.log

# Verify frontend files exist
ls -la frontend/

# Test API directly
curl http://localhost:8000/tree
```

### Empty mind map

- Ensure document has concepts in database
- Check browser console for JavaScript errors
- Verify API returns data: `curl http://localhost:8000/doc/{doc_id}/ontology`

---

## 📝 License

MIT License - See LICENSE file for details

---

## 👥 Contributors

- Brady Simmons - Founder & Architect
- Manus AI - Development Assistant

---

## 🙏 Acknowledgments

- D3.js for visualization library
- FastAPI for backend framework
- N8N for workflow automation inspiration
- NotebookLM for mind map design inspiration

---

## 📞 Support

For questions, issues, or feature requests:
- GitHub Issues: [loom-lite-mvp/issues](https://github.com/your-org/loom-lite-mvp/issues)
- Email: support@loom-lite.com
- Documentation: https://docs.loom-lite.com

---

**Version:** 1.0.0  
**Last Updated:** October 22, 2025  
**Status:** MVP Ready ✅


# Trigger Railway redeploy

# Redeploy trigger: 2025-10-26T01:42:01Z
