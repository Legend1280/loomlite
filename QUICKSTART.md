# Loom Lite Quick Start Guide

**For developers taking over this project**

---

## ⚡ 5-Minute Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Legend1280/loomlite.git
cd loomlite
```

### 2. Read the Core Documentation
**Start here:** `ONTOLOGY_STANDARD_v1.1.md` (15 min read)

This explains:
- What Loom Lite does
- How the ontology extraction works
- The database schema
- Concept types and relationships

### 3. Check Deployment Status
**Backend:** https://loomlite-production.up.railway.app  
**Frontend:** https://loomlite-ceiwo6txb-bradys-projects-179e6527.vercel.app

Both should be live. If not, check `DEV_HANDOFF.md` for troubleshooting.

---

## 🎯 What Works Right Now

✅ **Backend API**
- Health check endpoint
- Database schema
- GPT-5 extraction logic
- Auto-deploys from GitHub

✅ **Frontend**
- Displays sample ontology data
- Search interface
- Concept filtering
- Auto-deploys from GitHub

---

## ⚠️ What Needs Fixing

❌ **N8N Workflow** (HIGH PRIORITY)
- Workflow exists but not activated
- Missing webhook trigger node
- See `DEV_HANDOFF.md` section "Known Issues #1"

❌ **API Ingestion Endpoint** (HIGH PRIORITY)
- POST `/api/ingest` times out
- No jobs are created
- See `DEV_HANDOFF.md` section "Known Issues #2"

---

## 🔧 First Tasks

### Task 1: Fix N8N Workflow (30 min)

1. Go to https://sovfound.app.n8n.cloud (already logged in)
2. Open "Loom Lite - Document Ingestion" workflow
3. Add Webhook trigger node:
   - Method: POST
   - Path: `loom-lite-ingest`
4. Add HTTP Request node:
   - Method: POST
   - URL: `https://loomlite-production.up.railway.app/api/ingest`
   - Body: JSON with fields `file`, `filename`, `title`
5. Save and activate workflow
6. Test with:
   ```bash
   curl -X POST https://sovfound.app.n8n.cloud/webhook/loom-lite-ingest \
     -H "Content-Type: application/json" \
     -d '{"text": "Test document", "filename": "test.txt", "title": "Test"}'
   ```

### Task 2: Debug API Ingestion (1 hour)

1. Check Railway logs:
   - Go to https://railway.app (login required)
   - Navigate to loomlite service
   - View "Deploy Logs"

2. Test locally:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn api:app --reload --port 8000
   ```

3. Send test request:
   ```bash
   TEXT="Test document content"
   BASE64=$(echo -n "$TEXT" | base64)
   
   curl -X POST http://localhost:8000/api/ingest \
     -H "Content-Type: application/json" \
     -d "{\"file\": \"$BASE64\", \"filename\": \"test.txt\", \"title\": \"Test\"}"
   ```

4. Check for errors and fix

### Task 3: End-to-End Test (30 min)

Once Tasks 1 & 2 are complete:

1. Send document via N8N webhook
2. Check Railway logs for extraction progress
3. Query `/api/jobs` to see job status
4. Open Vercel frontend
5. Search for extracted concepts
6. Verify everything works

---

## 📁 Key Files to Know

```
loom-lite-mvp/
├── DEV_HANDOFF.md              ← READ THIS for full context
├── ONTOLOGY_STANDARD_v1.1.md   ← READ THIS for data model
├── QUICKSTART.md               ← You are here
├── backend/
│   ├── api.py                  ← Main API logic
│   ├── extractor.py            ← GPT-5 extraction
│   └── schema_v2.sql           ← Database schema
└── frontend/
    └── index.html              ← Frontend app
```

---

## 🚀 Making Changes

### Backend Changes
```bash
# Edit code
vim backend/api.py

# Test locally
cd backend
uvicorn api:app --reload

# Deploy
git add .
git commit -m "Fix: description"
git push  # Auto-deploys to Railway
```

### Frontend Changes
```bash
# Edit code
vim frontend/index.html

# Test locally
cd frontend
python -m http.server 3000

# Deploy
git add .
git commit -m "Update: description"
git push  # Auto-deploys to Vercel
```

---

## 🆘 Getting Help

1. **Check Documentation**
   - `DEV_HANDOFF.md` - Complete handoff guide
   - `DEPLOYMENT_SUMMARY.md` - Deployment details
   - `N8N_INTEGRATION_GUIDE.md` - N8N setup

2. **Review Code**
   - All files have detailed comments
   - Check git history: `git log --oneline`

3. **Test Locally**
   - Run backend: `cd backend && uvicorn api:app --reload`
   - Check database: `sqlite3 backend/loom_lite_v2.db`

4. **Check Logs**
   - Railway: https://railway.app (Deploy Logs, HTTP Logs)
   - Vercel: Use MCP or dashboard
   - N8N: https://sovfound.app.n8n.cloud (Executions tab)

---

## ✅ Success Checklist

- [ ] Read `ONTOLOGY_STANDARD_v1.1.md`
- [ ] Read `DEV_HANDOFF.md`
- [ ] Verified backend and frontend are live
- [ ] Fixed N8N workflow
- [ ] Debugged API ingestion endpoint
- [ ] Completed end-to-end test
- [ ] Can make changes and deploy independently

---

**Good luck! You've got this. 🚀**

Questions? Check `DEV_HANDOFF.md` or create a GitHub issue.

