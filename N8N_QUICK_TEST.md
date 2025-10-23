# N8N Quick Test Guide

## 🌐 Your N8N API is Live!

**Base URL**: `https://8001-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer`

---

## Test 1: Check API Status

```bash
curl https://8001-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer/
```

**Expected response:**
```json
{
  "name": "Loom Lite N8N API",
  "version": "1.0.0",
  "endpoints": {
    "ingest": "POST /api/ingest",
    "job_status": "GET /api/jobs/{job_id}",
    "list_jobs": "GET /api/jobs"
  }
}
```

---

## Test 2: Upload Document from N8N

### Option A: Using HTTP Request Node (Base64)

**N8N Workflow:**
1. Add **HTTP Request** node
2. Configure:
   - **Method**: POST
   - **URL**: `https://8001-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer/api/ingest`
   - **Body Content Type**: JSON
   - **Body**:
     ```json
     {
       "file": "{{ $binary.data.data }}",
       "filename": "{{ $binary.data.fileName }}",
       "title": "Test Document from N8N"
     }
     ```

### Option B: Using cURL (Quick Test)

```bash
# Create a test file
echo "# Test Document

This is a test document about Loom Lite.
Brady Simmons created this system in 2024.
The system uses semantic search and ontology extraction." > test.md

# Encode to base64
FILE_B64=$(base64 -w 0 test.md)

# Send to API
curl -X POST https://8001-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer/api/ingest \
  -H "Content-Type: application/json" \
  -d "{
    \"file\": \"$FILE_B64\",
    \"filename\": \"test.md\",
    \"title\": \"Test from cURL\"
  }"
```

**Expected response:**
```json
{
  "job_id": "job_abc123...",
  "doc_id": null,
  "status": "pending",
  "message": "Document queued for extraction"
}
```

---

## Test 3: Check Job Status

```bash
# Replace JOB_ID with the job_id from Test 2
curl https://8001-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer/api/jobs/JOB_ID
```

**Poll every 3-5 seconds until status is "completed"**

**Expected response (completed):**
```json
{
  "job_id": "job_abc123...",
  "doc_id": "doc_xyz789...",
  "status": "completed",
  "progress": 1.0,
  "concepts_extracted": 15,
  "relations_extracted": 8,
  "error": null,
  "created_at": "2025-10-22T19:30:00Z",
  "updated_at": "2025-10-22T19:30:45Z"
}
```

---

## Test 4: View Extracted Ontology

```bash
# Replace DOC_ID with the doc_id from Test 3
curl https://8000-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer/doc/DOC_ID/ontology | jq
```

**This returns the full MicroOntology JSON with:**
- Document metadata
- Extraction version
- Spans (evidence)
- Concepts (typed nodes)
- Relations (edges)
- Mentions (concept→span links)

---

## Test 5: List All Jobs

```bash
curl https://8001-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer/api/jobs
```

**See all recent extraction jobs with their status**

---

## N8N Workflow Setup

### 1. Create New Workflow in N8N

### 2. Add Webhook Node
- **HTTP Method**: POST
- **Path**: `loom-lite-ingest`
- **Respond**: Immediately

### 3. Add HTTP Request Node (Ingest)
- **Method**: POST
- **URL**: `https://8001-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer/api/ingest`
- **Body**:
  ```json
  {
    "file": "{{ $json.file }}",
    "filename": "{{ $json.filename }}",
    "title": "{{ $json.title }}"
  }
  ```

### 4. Add Wait Node
- **Wait Amount**: 5 seconds

### 5. Add HTTP Request Node (Check Status)
- **Method**: GET
- **URL**: `https://8001-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer/api/jobs/{{ $json.job_id }}`

### 6. Add IF Node
- **Condition**: `{{ $json.status }}` equals `completed`
- **True**: Success notification
- **False**: Loop back to Wait (max 10 times)

### 7. Activate Workflow

---

## Testing from N8N

### Get your N8N Webhook URL:
```
https://your-n8n-instance.com/webhook/loom-lite-ingest
```

### Send test request:
```bash
curl -X POST https://your-n8n-instance.com/webhook/loom-lite-ingest \
  -H "Content-Type: application/json" \
  -d '{
    "file": "IyBUZXN0IERvY3VtZW50...",
    "filename": "test.md",
    "title": "Test from N8N"
  }'
```

### Watch the workflow execute:
1. N8N receives webhook
2. Calls Loom Lite `/api/ingest`
3. Gets job_id
4. Polls `/api/jobs/{job_id}` every 5 seconds
5. When completed, shows results

---

## Troubleshooting

### Issue: "Connection refused"
**Solution**: Check that the API is running:
```bash
curl https://8001-iwpqvkrmovqiw62a4u1vm-6aa4782a.manusvm.computer/
```

### Issue: "Job stuck in processing"
**Solution**: Check the extraction logs:
```bash
# In sandbox
tail -50 ~/loom-lite-mvp/backend/n8n_api.log
```

### Issue: "Invalid base64"
**Solution**: Ensure file is properly encoded:
```bash
base64 -w 0 yourfile.pdf
```

---

## Summary

**Your Loom Lite N8N API is ready!**

✅ **Ingest endpoint**: Upload documents  
✅ **Job tracking**: Poll for completion  
✅ **OpenAI extraction**: Automatic concept/relation extraction  
✅ **MicroOntology storage**: Full provenance tracking  

**Next steps:**
1. Test the API with cURL (Test 2)
2. Import workflow into N8N
3. Configure webhook
4. Send documents and watch them get processed!

**API will remain live as long as the sandbox is running.**

