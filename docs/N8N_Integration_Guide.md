# Loom Lite N8N Integration Guide

## Overview

This guide demonstrates how to integrate Loom Lite with N8N workflows for automated document processing, semantic extraction, and knowledge management.

## API Endpoints for N8N

### Base URL

```
https://your-loom-lite-instance.com
```

For local development:
```
http://localhost:8000
```

---

## Endpoint Reference

### 1. Document Ingestion

**Endpoint:** `POST /api/ingest`

**Description:** Start a document ingestion job that processes files and extracts ontologies.

**Request Body:**
```json
{
  "folder_path": "/path/to/documents",
  "files": [
    "business_plan.docx",
    "technical_spec.pdf",
    "user_guide.md"
  ]
}
```

**Response:**
```json
{
  "job_id": "job_20241022120000",
  "status": "processing",
  "folder_path": "/path/to/documents",
  "file_count": 3,
  "message": "Ingestion job started. Use GET /api/job/{job_id} to check status."
}
```

**N8N HTTP Request Node Configuration:**
- Method: POST
- URL: `{{$env.LOOM_LITE_URL}}/api/ingest`
- Body: JSON
- Authentication: None (add JWT if needed)

---

### 2. Job Status Check

**Endpoint:** `GET /api/job/{job_id}`

**Description:** Check the status of an ingestion job.

**Response:**
```json
{
  "job_id": "job_20241022120000",
  "status": "completed",
  "progress": 100,
  "results": {
    "documents_processed": 3,
    "concepts_extracted": 36,
    "relations_found": 22
  }
}
```

**N8N HTTP Request Node Configuration:**
- Method: GET
- URL: `{{$env.LOOM_LITE_URL}}/api/job/{{$json.job_id}}`

---

### 3. Semantic Search

**Endpoint:** `GET /search`

**Description:** Search documents and concepts with filtering.

**Query Parameters:**
- `q` (required): Search query
- `types` (optional): Comma-separated concept types (e.g., "Metric,Date")
- `tags` (optional): Comma-separated tags (e.g., "project:Loom Lite")
- `limit` (optional): Maximum results (default: 10)

**Example Request:**
```
GET /search?q=revenue%20model&types=Metric&tags=project:Loom%20Lite&limit=5
```

**Response:**
```json
[
  {
    "doc_id": "doc_business_plan",
    "title": "Loom Lite Business Plan Q4 2024",
    "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "matched_concepts": "Revenue Model,Subscription Pricing,Monthly Recurring Revenue",
    "concept_count": 3,
    "top_hits": [
      {
        "concept": "Revenue Model",
        "type": "Metric",
        "confidence": 0.92,
        "snippet": "Our revenue model relies on subscription pricing at $500 per month..."
      }
    ]
  }
]
```

**N8N HTTP Request Node Configuration:**
- Method: GET
- URL: `{{$env.LOOM_LITE_URL}}/search?q={{$json.query}}&types={{$json.types}}`

---

### 4. Document Ontology

**Endpoint:** `GET /doc/{doc_id}/ontology`

**Description:** Retrieve the complete ontology for a specific document.

**Response:**
```json
{
  "document": {
    "id": "doc_business_plan",
    "title": "Loom Lite Business Plan Q4 2024",
    "path": "/documents/business/loom_lite_business_plan.docx",
    "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  },
  "concepts": [
    {
      "id": "c_revenue_model",
      "label": "Revenue Model",
      "type": "Metric",
      "confidence": 0.92
    }
  ],
  "relations": [
    {
      "src_concept_id": "c_subscription_pricing",
      "rel": "defines",
      "dst_concept_id": "c_revenue_model",
      "confidence": 0.88
    }
  ],
  "tags": [
    {
      "category": "project",
      "value": "Loom Lite",
      "confidence": 0.98
    }
  ]
}
```

**N8N HTTP Request Node Configuration:**
- Method: GET
- URL: `{{$env.LOOM_LITE_URL}}/doc/{{$json.doc_id}}/ontology`

---

### 5. Concept Extraction

**Endpoint:** `POST /api/extract`

**Description:** Extract ontology from raw text (useful for processing text from external sources).

**Request Body:**
```json
{
  "text": "Our revenue model relies on subscription pricing at $500 per month...",
  "doc_id": "doc_custom_001"
}
```

**Response:**
```json
{
  "doc_id": "doc_custom_001",
  "concepts": [
    {
      "id": "c_extracted_1",
      "label": "Revenue Model",
      "type": "Metric",
      "confidence": 0.85
    }
  ],
  "relations": [
    {
      "src": "c_extracted_1",
      "rel": "defines",
      "dst": "c_extracted_2",
      "confidence": 0.80
    }
  ],
  "mentions": {
    "c_extracted_1": [
      {"span_start": 4, "span_end": 17}
    ]
  },
  "message": "Extraction completed. Use POST /api/ingest to persist results."
}
```

**N8N HTTP Request Node Configuration:**
- Method: POST
- URL: `{{$env.LOOM_LITE_URL}}/api/extract`
- Body: JSON

---

## N8N Workflow Examples

### Example 1: Document Upload and Processing

**Workflow Steps:**

1. **Trigger:** Webhook or Google Drive Watch
2. **HTTP Request:** POST /api/ingest
   - Input: File paths from trigger
3. **Wait:** 5 seconds
4. **HTTP Request:** GET /api/job/{job_id}
   - Input: job_id from step 2
5. **IF Node:** Check if status == "completed"
   - True: Continue to next step
   - False: Loop back to step 3
6. **HTTP Request:** GET /doc/{doc_id}/ontology
   - Input: doc_id from job results
7. **Send Notification:** Slack/Email with extraction summary

**N8N Workflow JSON:**
```json
{
  "name": "Loom Lite Document Processor",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "loom-lite-upload"
      }
    },
    {
      "name": "Ingest Documents",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "={{$env.LOOM_LITE_URL}}/api/ingest",
        "jsonParameters": true,
        "options": {},
        "bodyParametersJson": "={{ JSON.stringify({folder_path: $json.folder, files: $json.files}) }}"
      }
    },
    {
      "name": "Wait",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "amount": 5
      }
    },
    {
      "name": "Check Job Status",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "={{$env.LOOM_LITE_URL}}/api/job/{{$json.job_id}}"
      }
    },
    {
      "name": "Status Check",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.status}}",
              "operation": "equals",
              "value2": "completed"
            }
          ]
        }
      }
    },
    {
      "name": "Notify Success",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#loom-lite",
        "text": "Document processing completed! {{$json.results.concepts_extracted}} concepts extracted."
      }
    }
  ]
}
```

---

### Example 2: Semantic Search and Alert

**Use Case:** Monitor for specific concepts and alert when found.

**Workflow Steps:**

1. **Trigger:** Schedule (every hour)
2. **HTTP Request:** GET /search?q=revenue&types=Metric
3. **IF Node:** Check if results.length > 0
4. **Function Node:** Format results
5. **Send Email:** Alert with matched documents

**N8N Workflow JSON:**
```json
{
  "name": "Loom Lite Concept Monitor",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [
            {
              "hour": "*",
              "minute": "0"
            }
          ]
        }
      }
    },
    {
      "name": "Search Concepts",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "={{$env.LOOM_LITE_URL}}/search?q=revenue&types=Metric&limit=10"
      }
    },
    {
      "name": "Check Results",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{$json.length}}",
              "operation": "larger",
              "value2": 0
            }
          ]
        }
      }
    },
    {
      "name": "Format Alert",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const results = $input.all();\nconst summary = results.map(r => `- ${r.json.title}: ${r.json.concept_count} concepts`).join('\\n');\nreturn [{json: {message: `Found ${results.length} documents with revenue metrics:\\n${summary}`}}];"
      }
    },
    {
      "name": "Send Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "team@example.com",
        "subject": "Loom Lite: Revenue Metrics Alert",
        "text": "={{$json.message}}"
      }
    }
  ]
}
```

---

### Example 3: Cross-Document Analysis

**Use Case:** Find relationships between concepts across multiple documents.

**Workflow Steps:**

1. **Trigger:** Manual or Webhook
2. **HTTP Request:** GET /concepts?types=Metric,Project
3. **Split In Batches:** Process concepts individually
4. **HTTP Request:** GET /search?q={{concept.label}}
5. **Aggregate:** Collect all results
6. **Function Node:** Build relationship graph
7. **HTTP Request:** POST to visualization service or database

---

## Environment Variables for N8N

Set these in your N8N instance:

```bash
LOOM_LITE_URL=http://localhost:8000
LOOM_LITE_API_KEY=your_api_key_here  # If authentication is enabled
```

---

## Best Practices

### 1. Error Handling

Always wrap HTTP requests in error handlers:

```javascript
try {
  const response = await $http.request({
    method: 'GET',
    url: `${process.env.LOOM_LITE_URL}/search?q=${query}`
  });
  return response.data;
} catch (error) {
  console.error('Loom Lite API error:', error);
  return { error: true, message: error.message };
}
```

### 2. Rate Limiting

Implement delays between batch requests:

```javascript
// In N8N Function Node
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
await delay(1000); // Wait 1 second between requests
```

### 3. Caching

Cache frequently accessed ontologies to reduce API calls:

```javascript
// Store in N8N workflow static data
const cache = $workflow.staticData;
if (!cache[docId]) {
  cache[docId] = await fetchOntology(docId);
}
return cache[docId];
```

### 4. Batch Processing

Process multiple documents in parallel using N8N's Split In Batches node:

- Batch Size: 5-10 documents
- Wait Time: 2 seconds between batches
- Error Handling: Continue on error

---

## Testing with cURL

Test endpoints before integrating with N8N:

```bash
# Test search
curl "http://localhost:8000/search?q=revenue&types=Metric"

# Test ingestion
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"folder_path": "/documents", "files": ["plan.docx"]}'

# Test ontology retrieval
curl "http://localhost:8000/doc/doc_business_plan/ontology"

# Test extraction
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "Our revenue model...", "doc_id": "test_001"}'
```

---

## Troubleshooting

### Issue: Connection Refused

**Solution:** Ensure Loom Lite server is running and accessible from N8N instance.

```bash
# Check server status
curl http://localhost:8000/

# Check network connectivity
ping your-loom-lite-host
```

### Issue: Empty Results

**Solution:** Verify database has been populated with sample data.

```bash
# Check database
sqlite3 backend/loom_lite.db "SELECT COUNT(*) FROM Document;"
```

### Issue: Slow Response Times

**Solution:** Optimize queries and add indexes.

```sql
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_concept_label ON Concept(label);
CREATE INDEX IF NOT EXISTS idx_tag_value ON Tag(value);
```

---

## Next Steps

1. **Authentication:** Add JWT token authentication for production use
2. **Webhooks:** Implement webhook notifications for job completion
3. **Batch APIs:** Add bulk endpoints for processing multiple documents
4. **Streaming:** Support streaming responses for large ontologies
5. **GraphQL:** Consider adding GraphQL endpoint for flexible queries

---

## Support

For issues or questions:
- GitHub: [loom-lite-mvp](https://github.com/your-org/loom-lite-mvp)
- Email: support@example.com
- Documentation: https://docs.loom-lite.com

---

**Version:** 1.0.0  
**Last Updated:** October 22, 2025  
**Author:** Loom Lite Team

