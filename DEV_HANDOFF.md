# Loom Lite Development Handoff Package

**Date:** October 22, 2025  
**System Version:** 1.1  
**Status:** Production Deployment (Partial - Needs Completion)

---

## 🎯 Executive Summary

Loom Lite is an **ontology-first knowledge management system** that automatically extracts concepts, relationships, and metadata from documents using GPT-5. The system consists of:

- **Backend API** (Railway) - Document ingestion and ontology extraction
- **Frontend** (Vercel) - Visualization and search interface  
- **N8N Integration** (In Progress) - Automation workflows for document processing

### Current Status

✅ **Completed:**
- Backend deployed to Railway with GPT-5 extraction
- Frontend deployed to Vercel
- Database schema and models defined
- GitHub CI/CD pipeline configured
- Documentation updated to v1.1

⚠️ **In Progress:**
- N8N workflow needs to be properly configured and activated
- End-to-end testing not completed
- API ingestion endpoint needs debugging

❌ **Not Started:**
- Production monitoring and logging
- Error handling improvements
- Rate limiting and authentication

---

## 📦 What's Included

This handoff package contains:

1. **Complete codebase** in `/home/ubuntu/loom-lite-mvp/`
2. **Deployment configurations** for Railway and Vercel
3. **Database schema** and sample data
4. **API documentation** and endpoint specifications
5. **N8N workflow templates** (partially complete)
6. **Ontology standard** (v1.1) defining the data model

---

## 🏗️ System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                          │
│  (Documents, APIs, Web Scraping, Manual Upload)         │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│                  N8N AUTOMATION                          │
│  • Webhook triggers                                      │
│  • File processing                                       │
│  • API orchestration                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│              RAILWAY BACKEND API                         │
│  https://loomlite-production.up.railway.app             │
│                                                          │
│  • FastAPI application                                   │
│  • GPT-5 ontology extraction                            │
│  • SQLite database                                       │
│  • Job queue management                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│                 SQLITE DATABASE                          │
│  • Documents metadata                                    │
│  • Extracted concepts                                    │
│  • Relationships                                         │
│  • Ontology versions                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│               VERCEL FRONTEND                            │
│  https://loomlite-ceiwo6txb-bradys-projects-...         │
│                                                          │
│  • Concept browser                                       │
│  • Search interface                                      │
│  • Document viewer                                       │
│  • Relationship visualization                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ Repository Structure

```
loom-lite-mvp/
├── backend/
│   ├── api.py                    # Unified FastAPI application
│   ├── extractor.py              # GPT-5 extraction logic
│   ├── models.py                 # Pydantic data models
│   ├── reader.py                 # Document parsing
│   ├── schema_v2.sql             # Database schema
│   ├── requirements.txt          # Python dependencies
│   └── loom_lite_v2.db          # SQLite database (gitignored)
│
├── frontend/
│   └── index.html                # Single-page application
│
├── n8n_workflows/
│   └── 1_simple_document_ingestion.json  # Workflow template
│
├── docs/
│   ├── ONTOLOGY_STANDARD_v1.1.md        # Core specification
│   ├── DEPLOYMENT_SUMMARY.md             # Deployment guide
│   ├── N8N_INTEGRATION_GUIDE.md          # N8N setup
│   └── DEV_HANDOFF.md                    # This file
│
├── .github/
│   └── workflows/                        # CI/CD (if configured)
│
├── README.md                             # Project overview
└── .gitignore                            # Git ignore rules
```

---

## 🔧 Technical Stack

### Backend
- **Language:** Python 3.11
- **Framework:** FastAPI
- **Database:** SQLite (loom_lite_v2.db)
- **AI Model:** GPT-5 via OpenAI API
- **Hosting:** Railway
- **Dependencies:** See `backend/requirements.txt`

### Frontend
- **Technology:** Vanilla HTML/CSS/JavaScript
- **Hosting:** Vercel
- **API Client:** Fetch API

### Automation
- **Platform:** N8N Cloud (sovfound.app.n8n.cloud)
- **Workflows:** Webhook-based document ingestion

---

## 🚀 Deployment Details

### Railway Backend

**URL:** https://loomlite-production.up.railway.app

**Environment Variables:**
- `OPENAI_API_KEY` - ✅ Configured (masked)
- `DATABASE_PATH` - Defaults to `loom_lite_v2.db`

**Start Command:**
```bash
cd backend && uvicorn api:app --host 0.0.0.0 --port $PORT
```

**Auto-Deploy:** Enabled on push to `main` branch

**Current Status:** ✅ Active (as of Oct 22, 2025)

### Vercel Frontend

**URL:** https://loomlite-ceiwo6txb-bradys-projects-179e6527.vercel.app

**Build Settings:**
- Framework: None (static site)
- Root Directory: `frontend/`
- Output Directory: `frontend/`

**Environment Variables:** None required

**Auto-Deploy:** Enabled on push to `main` branch

**Current Status:** ✅ Active

### N8N Workflows

**Workspace:** https://sovfound.app.n8n.cloud

**Workflow:** "Loom Lite - Document Ingestion"

**Status:** ⚠️ Created but not activated (missing webhook node)

**Webhook URL:** (To be configured)

---

## 📡 API Endpoints

### Health Check
```http
GET https://loomlite-production.up.railway.app/
```

**Response:**
```json
{
  "name": "Loom Lite Unified API",
  "version": "1.0.0",
  "endpoints": {...}
}
```

### Document Ingestion
```http
POST https://loomlite-production.up.railway.app/api/ingest
Content-Type: application/json

{
  "file": "<base64_encoded_content>",
  "filename": "document.txt",
  "title": "Document Title"
}
```

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "queued"
}
```

### Job Status
```http
GET https://loomlite-production.up.railway.app/api/jobs/{job_id}
```

### List All Jobs
```http
GET https://loomlite-production.up.railway.app/api/jobs
```

### Ontology Query
```http
GET https://loomlite-production.up.railway.app/tree
GET https://loomlite-production.up.railway.app/search?q=query
GET https://loomlite-production.up.railway.app/concepts?types=Person,Project
```

---

## 🐛 Known Issues

### 1. N8N Workflow Not Saved Properly
**Issue:** The webhook node was not saved when creating the workflow in N8N.

**Error Message:** "Workflow has no node to start the workflow - at least one trigger, poller or webhook node is required"

**Solution Needed:**
1. Open N8N workflow editor
2. Add Webhook trigger node (POST method)
3. Add HTTP Request node pointing to Railway API
4. Configure JSON body parameters: `file`, `filename`, `title`
5. Save and activate workflow

### 2. API Ingestion Endpoint Timeout
**Issue:** POST requests to `/api/ingest` hang and don't return a response.

**Observed Behavior:**
- Health endpoint (`/`) works fine
- Jobs endpoint returns empty array
- Ingestion requests timeout without creating jobs

**Debugging Steps Needed:**
1. Check Railway deploy logs for errors during ingestion
2. Verify GPT-5 API key is valid and has quota
3. Test with smaller documents
4. Add logging to `process_ingestion` function
5. Check if background tasks are running properly

### 3. Database Initialization
**Issue:** Unclear if database schema is initialized on first deploy.

**Solution Needed:**
- Add initialization script to create tables if they don't exist
- Or document manual database setup steps

---

## ✅ Testing Checklist

### Backend API
- [x] Health check endpoint responds
- [ ] Document ingestion creates job
- [ ] Job status can be queried
- [ ] GPT-5 extraction completes successfully
- [ ] Ontology is stored in database
- [ ] Query endpoints return data

### Frontend
- [x] Page loads and renders
- [x] Connects to Railway backend
- [ ] Search functionality works
- [ ] Concept filtering works
- [ ] Document viewer displays content
- [ ] Relationship visualization works

### N8N Integration
- [ ] Workflow can be activated
- [ ] Webhook receives POST requests
- [ ] Data is forwarded to Railway API
- [ ] Job completion is tracked
- [ ] Errors are handled gracefully

### End-to-End
- [ ] Upload document via N8N webhook
- [ ] Verify extraction in Railway logs
- [ ] Check database for new concepts
- [ ] View results in Vercel frontend
- [ ] Search for extracted concepts

---

## 🔐 Credentials & Access

### GitHub Repository
- **URL:** https://github.com/Legend1280/loomlite
- **Branch:** `main`
- **Access:** Owner has full access

### Railway
- **Project:** romantic-radiance
- **Service:** loomlite
- **Environment:** production
- **Access:** Requires login (already authenticated in browser)

### Vercel
- **Project:** loomlite
- **Team:** Brady's Projects
- **Access:** Requires login (accessible via MCP)

### N8N
- **Workspace:** sovfound
- **URL:** https://sovfound.app.n8n.cloud
- **Access:** Requires login (already authenticated in browser)

### OpenAI
- **API Key:** Configured in Railway environment variables
- **Model:** GPT-5
- **Usage:** Monitor at platform.openai.com

---

## 📋 Next Steps for Developer

### Immediate (Critical)

**⚠️ UPDATED 2025-10-24:** Added Pydantic validation as critical task

1. **Add Pydantic Validation for GPT-5 Output** ⭐ NEW
   - **Priority:** CRITICAL (prevents silent failures)
   - **Effort:** ~1 hour
   - **Why:** Currently GPT-5 extraction errors are silently swallowed
   - **Implementation:**
     - Create Pydantic models in `extractor.py` for:
       - `ExtractedSpan` (start, end, text)
       - `ExtractedConcept` (label, type, confidence, aliases, tags)
       - `ExtractedRelation` (src, rel, dst, confidence)
       - `ExtractedMention` (concept_label, span_index, confidence)
       - `ExtractionResult` (spans, concepts, relations, mentions)
     - Validate each chunk's extraction result
     - Log validation failures (don't silently skip!)
     - Return validation stats with extraction result
   - **See:** `EXTRACTION_PROMPT_SPEC.md` Section 7 for details
   - **Benefit:** Catches schema mismatches, prevents data corruption, enables quality monitoring

2. **Fix N8N Workflow**
   - Re-create webhook trigger node
   - Configure HTTP Request node with proper JSON body
   - Test with sample document
   - Activate workflow

3. **Debug API Ingestion**
   - Check Railway logs for errors
   - Add debug logging to `api.py`
   - Test with curl/Postman
   - Verify GPT-5 API connectivity

4. **Initialize Database** ✅ COMPLETED (2025-10-24)
   - ✅ Schema auto-initialization added to `api.py`
   - ✅ Runs on API startup
   - Verify with real document ingestion

### Short-term (High Priority)
5. **Complete End-to-End Test**
   - Ingest real document
   - Verify extraction quality
   - Check frontend display
   - Document any issues

6. **Add Error Handling**
   - Graceful failures for API errors
   - User-friendly error messages
   - Retry logic for transient failures

7. **Implement Monitoring**
   - Railway logging setup
   - Error tracking (Sentry?)
   - Usage analytics

### Medium-term (Important)
7. **Add Authentication**
   - API key for ingestion endpoint
   - User authentication for frontend
   - Rate limiting

8. **Optimize Performance**
   - Caching for frequent queries
   - Database indexing
   - Batch processing for multiple documents

9. **Enhance Frontend**
   - Improve UI/UX
   - Add more visualization options
   - Implement real-time updates

### Long-term (Nice to Have)
10. **Scale Infrastructure**
    - Move to PostgreSQL
    - Add Redis for job queue
    - Implement horizontal scaling

11. **Advanced Features**
    - Multi-document ontology merging
    - Concept disambiguation
    - Relationship inference

12. **Integrations**
    - Google Drive connector
    - Slack notifications
    - Email ingestion

---

## 📚 Key Documentation Files

1. **ONTOLOGY_STANDARD_v1.1.md** - **READ THIS FIRST**
   - Defines the core data model
   - Explains MicroOntology structure
   - Lists concept types and relations
   - Describes extraction pipeline

2. **DEPLOYMENT_SUMMARY.md**
   - Deployment URLs and status
   - Environment variables
   - CI/CD pipeline details
   - Testing procedures

3. **N8N_INTEGRATION_GUIDE.md**
   - Workflow setup instructions
   - Webhook configuration
   - Testing examples

4. **backend/schema_v2.sql**
   - Complete database schema
   - Table definitions
   - Indexes and constraints

---

## 🛠️ Development Workflow

### Making Changes

1. **Local Development**
   ```bash
   cd /home/ubuntu/loom-lite-mvp
   
   # Backend
   cd backend
   pip install -r requirements.txt
   uvicorn api:app --reload --port 8000
   
   # Frontend (serve locally)
   cd frontend
   python -m http.server 3000
   ```

2. **Testing**
   ```bash
   # Test API health
   curl http://localhost:8000/
   
   # Test ingestion
   curl -X POST http://localhost:8000/api/ingest \
     -H "Content-Type: application/json" \
     -d '{"file": "...", "filename": "test.txt", "title": "Test"}'
   ```

3. **Deployment**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   
   # Railway and Vercel auto-deploy
   ```

### Debugging

**Railway Logs:**
- Go to https://railway.app/project/14472dd6-1a60-48fc-9ad2-264b726c16b6
- Click on "loomlite" service
- View "Deploy Logs" or "HTTP Logs"

**Vercel Logs:**
- Use MCP: `manus-mcp-cli tool call list_deployments --server vercel --input '{"projectId": "loomlite"}'`

**Local Database:**
```bash
sqlite3 backend/loom_lite_v2.db
.tables
SELECT * FROM documents;
SELECT * FROM concepts LIMIT 10;
```

---

## 🎓 Learning Resources

### FastAPI
- Official Docs: https://fastapi.tiangolo.com
- Background Tasks: https://fastapi.tiangolo.com/tutorial/background-tasks/

### OpenAI GPT-5
- API Reference: https://platform.openai.com/docs
- Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs

### Railway
- Docs: https://docs.railway.app
- Environment Variables: https://docs.railway.app/develop/variables

### N8N
- Docs: https://docs.n8n.io
- Webhook Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

---

## 📞 Support & Questions

For questions about this handoff:

1. **Check Documentation First**
   - ONTOLOGY_STANDARD_v1.1.md
   - DEPLOYMENT_SUMMARY.md
   - This file (DEV_HANDOFF.md)

2. **Review Code Comments**
   - `backend/api.py` has detailed comments
   - `backend/extractor.py` explains extraction logic

3. **Check Git History**
   ```bash
   git log --oneline --graph --all
   git show <commit-hash>
   ```

4. **Contact**
   - GitHub Issues: https://github.com/Legend1280/loomlite/issues
   - Project Owner: Brady Simmons

---

## 🎯 Success Criteria

The handoff is complete when:

- [ ] N8N workflow is activated and working
- [ ] End-to-end test passes (document → extraction → frontend)
- [ ] All API endpoints respond correctly
- [ ] Frontend displays extracted ontology
- [ ] Documentation is reviewed and understood
- [ ] Developer can make changes and deploy independently

---

**Handoff Prepared By:** Manus AI Agent  
**Date:** October 22, 2025  
**Version:** 1.0  
**Next Review:** After N8N workflow fix and E2E test completion

