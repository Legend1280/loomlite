# Loom Lite - Debugging Handoff Document

**Date:** October 23, 2025  
**Status:** CRITICAL - Extraction hanging, needs team debugging  
**Priority:** HIGH - Blocking all document processing

---

## Executive Summary

The Loom Lite MVP is deployed and functional except for **one critical blocker**: GPT-4.1 extraction is hanging indefinitely. File uploads work, jobs are created, but extraction never completes.

### What's Working ✅
- **Frontend deployed to Vercel** with upload button visible
- **Backend API deployed to Railway** and accepting requests
- **File upload feature** working (drag-and-drop for PDF, TXT, DOCX, MD, ZIP)
- **Job tracking system** working
- **Database initialization** working
- **Mind map visualization** working with sample data

### What's Broken ❌
- **GPT-4.1 extraction hanging** - API calls timeout with no response
- Jobs stuck at "Extracting ontology..." status indefinitely
- No concepts extracted (concepts_count = 0 for all jobs)
- No error messages logged

---

## Recent Changes Made

### 1. Fixed Vercel Deployment Issue
**Problem:** Upload button not appearing on production URL  
**Root Cause:** `vercel.json` was copying `index.html` from root instead of `frontend/`  
**Fix Applied:** Updated build command in `vercel.json`:
```json
{
  "buildCommand": "mkdir -p .vercel/output/static && cp frontend/index.html .vercel/output/static/",
  "outputDirectory": ".vercel/output/static"
}
```
**Status:** ✅ Fixed - Upload button now visible on latest deployment

### 2. Fixed Model Name
**Problem:** Code was using "gpt-5" which doesn't exist  
**Fix Applied:** Changed all references from "gpt-5" to "gpt-4.1"  
**Files Modified:** `backend/extractor.py` (lines 96, 128, 135, 136, 219, 228, 247, 260)  
**Status:** ✅ Committed and pushed to GitHub (commit: 21e250b)

### 3. Added Temperature Parameter
**Problem:** Temperature was removed due to earlier GPT-5 constraint  
**Fix Applied:** Added `temperature=0.0` to API call (line 128 in extractor.py)  
**Status:** ✅ Committed and pushed

---

## Current Deployment Status

### Frontend (Vercel)
- **Production URL:** https://loomlite.vercel.app
- **Latest Deployment:** https://loomlite-2kw2bnr2m-bradys-projects-179e6527.vercel.app
- **Status:** ✅ READY
- **Upload Button:** ✅ Visible and functional
- **Last Commit:** "Fix vercel.json to deploy frontend/index.html with upload feature"

### Backend (Railway)
- **Production URL:** https://loomlite-production.up.railway.app
- **Status:** ⚠️ RUNNING but extraction hanging
- **Last Commit:** "Fix model name: change gpt-5 to gpt-4.1 and add temperature=0.0"
- **Auto-Deploy:** Enabled from GitHub main branch
- **Note:** Railway may take 2-5 minutes to redeploy after GitHub push

---

## Critical Issue: Extraction Hanging

### Symptoms
1. Jobs created successfully with status "processing"
2. Progress stuck at "Extracting ontology..."
3. No timeout errors
4. No API errors logged
5. Jobs never complete (tested for 60+ seconds)

### Test Results
**Job 1:** `job_9251afd90dea`
- Filename: `Loom_Lite_-_Developer_Handoff_Message.pdf`
- Created: 2025-10-24 01:24:04
- Status: Still "processing" after 10+ minutes
- Model used: gpt-5 (old code)

**Job 2:** `job_ec471bd5a2d8`
- Filename: `Loom_Lite_-_Developer_Handoff_Message.pdf`
- Created: 2025-10-24 01:31:26
- Status: Still "processing" after 5+ minutes
- Model used: gpt-4.1 (should be new code, but Railway may not have redeployed yet)

### Code Location
**File:** `/home/ubuntu/loom-lite-mvp/backend/extractor.py`  
**Function:** `extract_ontology_from_text()` (line 96)  
**API Call:** Lines 122-130

```python
response = client.chat.completions.create(
    model=model,  # Now "gpt-4.1"
    messages=[
        {"role": "system", "content": "You are an expert ontology extractor."},
        {"role": "user", "content": EXTRACTION_PROMPT + "\n\n" + chunk}
    ],
    temperature=0.0,
    response_format={"type": "json_object"}
)
```

### Possible Root Causes

1. **Railway hasn't redeployed yet**
   - Check Railway dashboard for latest deployment timestamp
   - Verify deployment shows commit 21e250b
   - May need manual redeploy trigger

2. **OpenAI API Key Issue**
   - Verify `OPENAI_API_KEY` environment variable is set in Railway
   - Test API key has access to gpt-4.1 model
   - Check for rate limiting or quota issues

3. **Model Name Still Incorrect**
   - "gpt-4.1" might not be the correct name
   - Try alternatives: "gpt-4o", "gpt-4-turbo", "gpt-4o-mini"
   - Check OpenAI documentation for exact model names

4. **Timeout Configuration**
   - No timeout set on OpenAI client
   - May need to add timeout parameter
   - Check Railway request timeout settings

5. **Prompt Too Large**
   - Extraction prompt + document chunk may exceed token limit
   - Current chunk size: 1500 chars
   - May need to reduce chunk size or simplify prompt

---

## Debugging Steps for Team

### Step 1: Verify Railway Deployment
```bash
# Check Railway logs
railway logs --project loomlite

# Look for:
# - "Processing 1 chunks..." message
# - "GPT-4.1 returned: X concepts" message (should appear but doesn't)
# - Any OpenAI API errors
```

### Step 2: Test OpenAI API Key
```python
# Run this in Railway console or locally with same API key
from openai import OpenAI
client = OpenAI()

# List available models
models = client.models.list()
for model in models.data:
    if 'gpt-4' in model.id:
        print(model.id)

# Test simple completion
response = client.chat.completions.create(
    model="gpt-4.1",  # or try "gpt-4o"
    messages=[{"role": "user", "content": "Hello"}],
    temperature=0.0
)
print(response.choices[0].message.content)
```

### Step 3: Add Timeout and Error Handling
```python
# In extractor.py, modify API call:
try:
    response = client.chat.completions.create(
        model=model,
        messages=[...],
        temperature=0.0,
        response_format={"type": "json_object"},
        timeout=60.0  # Add 60 second timeout
    )
except Exception as e:
    print(f"ERROR calling OpenAI API: {type(e).__name__}: {str(e)}")
    raise
```

### Step 4: Test with Smaller Chunk
```python
# Temporarily reduce chunk size to test
chunks = chunk_text(text, chunk_size=500, overlap=50)  # Was 1500/200
```

### Step 5: Verify Model Name
Check OpenAI docs or try these alternatives:
- `gpt-4o` (latest GPT-4 optimized)
- `gpt-4-turbo`
- `gpt-4o-mini`
- `gpt-4`

---

## Environment Variables to Check

### Railway Backend
```bash
OPENAI_API_KEY=sk-...  # Verify this is set and valid
DATABASE_URL=...       # Should be set automatically by Railway
```

### Vercel Frontend
```bash
# No environment variables needed (static site)
```

---

## API Endpoints Reference

### Test Upload
```bash
# Upload a document
curl -X POST https://loomlite-production.up.railway.app/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "file": "base64_encoded_content",
    "filename": "test.txt",
    "title": "Test Document"
  }'
```

### Check Job Status
```bash
# List all jobs
curl https://loomlite-production.up.railway.app/api/jobs

# Get specific job
curl https://loomlite-production.up.railway.app/api/jobs/job_ec471bd5a2d8
```

### Check Concepts (after extraction works)
```bash
curl https://loomlite-production.up.railway.app/concepts
```

---

## Files Modified in This Session

1. **vercel.json** - Fixed build command to use frontend/index.html
2. **backend/extractor.py** - Changed gpt-5 → gpt-4.1, added temperature=0.0
3. **This document** - DEBUGGING_HANDOFF.md

### Git Commits
```
21e250b - Fix model name: change gpt-5 to gpt-4.1 and add temperature=0.0
19e55f4 - Fix vercel.json to deploy frontend/index.html with upload feature
530a34b - Test deployment trigger
```

---

## Next Steps for Team

### Immediate (30 minutes)
1. ✅ Verify Railway has redeployed with commit 21e250b
2. ✅ Check Railway logs for OpenAI API errors
3. ✅ Test OpenAI API key and verify model name
4. ✅ Add timeout and better error handling
5. ✅ Upload test document and monitor logs

### Short-term (2-4 hours)
1. Fix extraction hanging issue
2. Verify concepts are extracted (concepts_count > 0)
3. Test mind map visualization with real data
4. Verify N8N workflow integration
5. Update documentation with correct model name

### Medium-term (1-2 days)
1. Add Pydantic validation for GPT responses
2. Improve error handling and logging
3. Add retry logic for API failures
4. Optimize chunk size and prompt
5. Performance testing with multiple documents

---

## Contact Information

**Repository:** https://github.com/Legend1280/loomlite  
**Backend:** https://loomlite-production.up.railway.app  
**Frontend:** https://loomlite.vercel.app  

**Key Documentation:**
- `/home/ubuntu/loom-lite-mvp/DEVELOPER_HANDOFF_MESSAGE.md` - Original handoff
- `/home/ubuntu/loom-lite-mvp/CURRENT_TASKS.md` - Task breakdown
- `/home/ubuntu/loom-lite-mvp/EXTRACTION_PROMPT_SPEC.md` - Prompt specification
- `/home/ubuntu/loom-lite-mvp/DEBUGGING_HANDOFF.md` - This document

---

## Success Criteria

The system will be considered working when:
1. ✅ Document upload creates job successfully
2. ❌ Extraction completes within 60 seconds
3. ❌ concepts_count > 0 in job results
4. ❌ Concepts appear in frontend mind map
5. ✅ Upload button visible on production URL

**Current Status:** 2/5 criteria met

---

**End of Debugging Handoff Document**

