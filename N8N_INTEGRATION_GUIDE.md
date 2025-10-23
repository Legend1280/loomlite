# Loom Lite N8N Integration Guide

## Overview

This guide explains how to use N8N to automate document ingestion into Loom Lite.

## Workflow Configuration

**Workflow Name:** Loom Lite - Document Ingestion

**Webhook URL:** https://sovfound.app.n8n.cloud/webhook/loom-lite-ingest

**API Endpoint:** https://loomlite-production.up.railway.app/api/ingest

## Testing

```bash
curl -X POST https://sovfound.app.n8n.cloud/webhook/loom-lite-ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your document text here",
    "filename": "example.txt",
    "title": "Example Document"
  }'
```

## Next Steps

1. Activate the workflow in N8N (toggle to Active)
2. Test with sample data
3. Verify results in Vercel frontend

