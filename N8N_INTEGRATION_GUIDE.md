# N8N Integration Guide for Loom Lite

## Overview

This guide shows you how to integrate N8N with Loom Lite for automated document ontology extraction.

---

## Architecture

```
Document Upload → N8N Webhook → Loom Lite API → Extract Ontology → Store in DB
```

**Flow:**
1. User uploads document to watched folder or triggers webhook
2. N8N receives file and calls Loom Lite `/api/ingest` endpoint
3. Loom Lite extracts concepts/relations using OpenAI API
4. N8N polls `/api/jobs/{job_id}` for completion status
5. When complete, N8N can trigger notifications or downstream actions

---

## Step 1: Set Up Loom Lite API Endpoints

### Required Endpoints (to build):

#### `POST /api/ingest`
Upload document for ontology extraction

**Request:**
```json
{
  "file": "<base64_encoded_file>",
  "filename": "document.pdf",
  "force_reextract": false
}
```

**Response:**
```json
{
  "job_id": "job_abc123",
  "doc_id": "doc_xyz789",
  "status": "pending",
  "message": "Document queued for extraction"
}
```

#### `GET /api/jobs/{job_id}`
Check extraction job status

**Response:**
```json
{
  "job_id": "job_abc123",
  "doc_id": "doc_xyz789",
  "status": "completed",
  "progress": 100,
  "concepts_extracted": 25,
  "relations_extracted": 18
}
```

Status values: `pending`, `processing`, `completed`, `failed`

---

## Step 2: Create N8N Workflow

### Option A: Webhook Trigger (Recommended)

**Workflow Structure:**
```
Webhook → HTTP Request (Ingest) → Wait → HTTP Request (Poll Status) → Conditional → Done
```

**1. Webhook Node**
- **HTTP Method**: POST
- **Path**: `/loom-lite-ingest`
- **Authentication**: Basic Auth (optional)
- **Respond**: Immediately

**2. HTTP Request Node (Ingest)**
- **Method**: POST
- **URL**: `http://your-loom-lite-api:8000/api/ingest`
- **Body**: 
  ```json
  {
    "file": "{{ $json.file }}",
    "filename": "{{ $json.filename }}"
  }
  ```
- **Response Format**: JSON

**3. Wait Node**
- **Resume**: After time interval
- **Wait Amount**: 5 seconds

**4. HTTP Request Node (Poll Status)**
- **Method**: GET
- **URL**: `http://your-loom-lite-api:8000/api/jobs/{{ $json.job_id }}`
- **Response Format**: JSON

**5. IF Node (Check Status)**
- **Condition**: `{{ $json.status }}` equals `completed`
- **True**: Send success notification
- **False**: Loop back to Wait node (max 10 iterations)

---

### Option B: File Watcher Trigger

**Workflow Structure:**
```
Local File Trigger → Read Binary File → HTTP Request (Ingest) → Poll Status → Done
```

**1. Local File Trigger**
- **Trigger On**: File Added
- **Watch Path**: `/path/to/watched/folder`
- **File Extensions**: `.pdf,.docx,.md,.txt`

**2. Read Binary File Node**
- **File Path**: `{{ $json.path }}`
- **Property Name**: `file`

**3. HTTP Request Node (Ingest)**
- Same as Option A, but use:
  ```json
  {
    "file": "{{ $binary.file.data }}",
    "filename": "{{ $json.name }}"
  }
  ```

---

## Step 3: N8N Workflow JSON Template

Save this as `loom-lite-ingest.json` and import into N8N:

```json
{
  "name": "Loom Lite Document Ingestion",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "loom-lite-ingest",
        "responseMode": "onReceived",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "http://localhost:8000/api/ingest",
        "method": "POST",
        "jsonParameters": true,
        "options": {},
        "bodyParametersJson": "={{ JSON.stringify({file: $json.file, filename: $json.filename}) }}"
      },
      "name": "Ingest Document",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [450, 300]
    },
    {
      "parameters": {
        "amount": 5,
        "unit": "seconds"
      },
      "name": "Wait",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1,
      "position": [650, 300],
      "webhookId": "{{ $json.job_id }}"
    },
    {
      "parameters": {
        "url": "=http://localhost:8000/api/jobs/{{ $json.job_id }}",
        "method": "GET",
        "options": {}
      },
      "name": "Check Status",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [850, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.status }}",
              "operation": "equals",
              "value2": "completed"
            }
          ]
        }
      },
      "name": "IF Completed",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1050, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Ingest Document", "type": "main", "index": 0}]]
    },
    "Ingest Document": {
      "main": [[{"node": "Wait", "type": "main", "index": 0}]]
    },
    "Wait": {
      "main": [[{"node": "Check Status", "type": "main", "index": 0}]]
    },
    "Check Status": {
      "main": [[{"node": "IF Completed", "type": "main", "index": 0}]]
    },
    "IF Completed": {
      "main": [
        [{"node": "Success", "type": "main", "index": 0}],
        [{"node": "Wait", "type": "main", "index": 0}]
      ]
    }
  }
}
```

---

## Step 4: Test the Integration

### 1. Start Loom Lite API
```bash
cd ~/loom-lite-mvp/backend
python3.11 main_v2.py
```

### 2. Import N8N Workflow
- Open N8N UI
- Click **Import from File**
- Select `loom-lite-ingest.json`
- Activate the workflow

### 3. Get Webhook URL
- Click on Webhook node
- Copy the **Production URL** (e.g., `https://your-n8n.com/webhook/loom-lite-ingest`)

### 4. Send Test Request
```bash
curl -X POST https://your-n8n.com/webhook/loom-lite-ingest \
  -H "Content-Type: application/json" \
  -d '{
    "file": "<base64_encoded_content>",
    "filename": "test.md"
  }'
```

### 5. Monitor Execution
- Go to N8N **Executions** tab
- Watch the workflow progress
- Verify job status polling
- Check Loom Lite database for extracted concepts

---

## Step 5: Advanced Features

### A. Batch Processing
Add a **Split In Batches** node to process multiple files:

```
File List → Split In Batches → HTTP Request (Ingest) → Loop
```

### B. Error Handling
Add **Error Trigger** node to catch failed extractions:

```
Error Trigger → Send Email/Slack → Log to Database
```

### C. Webhook Notifications
Have Loom Lite call N8N when extraction completes:

**In Loom Lite API:**
```python
# After extraction completes
requests.post(
    "https://your-n8n.com/webhook/extraction-complete",
    json={"job_id": job_id, "doc_id": doc_id, "status": "completed"}
)
```

**In N8N:**
Add a second webhook to receive completion notifications.

---

## Security Considerations

### 1. Authentication
Use **Basic Auth** or **Header Auth** on webhook nodes:

```json
{
  "authentication": "basicAuth",
  "credentials": {
    "username": "loom_lite",
    "password": "secure_password"
  }
}
```

### 2. IP Whitelist
Restrict webhook access to trusted IPs:

**In Webhook node options:**
- Enable **IP(s) Whitelist**
- Add your Loom Lite server IP

### 3. HTTPS
Always use HTTPS for production webhooks:
- Configure SSL certificate in N8N
- Use reverse proxy (nginx/Caddy)

---

## Troubleshooting

### Issue: Webhook not triggering
**Solution:**
- Check N8N workflow is **Active**
- Verify webhook URL is correct
- Check N8N logs: `docker logs n8n`

### Issue: Job status stuck in "processing"
**Solution:**
- Check Loom Lite API logs
- Verify OpenAI API key is valid
- Increase polling interval in Wait node

### Issue: File upload fails
**Solution:**
- Check file size (max 16MB for N8N webhooks)
- Verify base64 encoding is correct
- Use binary data instead of JSON for large files

---

## Next Steps

1. **Build the API endpoints** (`/api/ingest`, `/api/jobs/{id}`)
2. **Create LLM extractor** (OpenAI integration)
3. **Import N8N workflow** and test
4. **Add monitoring** (logs, alerts)
5. **Scale** (add queue system for high volume)

---

## Summary

**What you need to build in Loom Lite:**
- ✅ `/api/ingest` endpoint (accept file, queue extraction job)
- ✅ `/api/jobs/{job_id}` endpoint (return job status)
- ✅ LLM extraction pipeline (OpenAI → concepts/relations)
- ✅ Job queue system (async processing)

**What N8N provides:**
- ✅ Webhook trigger for file uploads
- ✅ HTTP request nodes for API calls
- ✅ Polling logic for job status
- ✅ Error handling and retries
- ✅ Notifications on completion

**Ready to build the Loom Lite API endpoints?**

