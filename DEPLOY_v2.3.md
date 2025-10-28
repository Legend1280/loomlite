# Loom Lite v2.3 - Semantic Hierarchy Deployment Checklist

**Version:** v2.3.1  
**Date:** October 26, 2025  
**Status:** Ready for Deployment

---

## 🎯 What's New

**Semantic Hierarchy & Concept Clustering**
- Mid-tier clusters group related concepts
- Document → Cluster → Concept → Mention hierarchy
- Improved Mind Map readability
- Backward compatible with flat ontologies

---

## 📋 Pre-Deployment Checklist

### Backend Changes
- [x] Schema extension (parent_cluster_id, hierarchy_level, coherence)
- [x] Semantic clustering module (semantic_cluster.py)
- [x] Extractor integration (automatic clustering)
- [x] Database migration script (migrate_add_hierarchy.py)
- [x] Storage updates (save hierarchy fields)

### Frontend Changes
- [x] Mind Map hierarchy detection
- [x] buildSemanticHierarchy() function
- [x] Cluster node styling
- [x] Fallback to flat structure

### Testing
- [ ] Run migration on test database
- [ ] Extract test document
- [ ] Verify hierarchy in logs
- [ ] Check Mind Map visualization
- [ ] Confirm performance < 400ms

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend to Railway

```bash
# Railway will auto-deploy from main branch
# Monitor deployment at: https://railway.app
```

### Step 2: Run Database Migration

**Option A: Via Railway Shell**
```bash
# Open Railway shell for backend service
cd /app/backend
python3 migrate_add_hierarchy.py
```

**Option B: Via SSH (if configured)**
```bash
ssh railway-backend
cd /app/backend
python3 migrate_add_hierarchy.py
```

**Expected Output:**
```
🔄 Migrating database schema for semantic hierarchy...
  Adding parent_cluster_id column...
  ✅ Added parent_cluster_id
  Adding hierarchy_level column...
  ✅ Added hierarchy_level
  Adding coherence column...
  ✅ Added coherence
  Creating index on parent_cluster_id...
  ✅ Created index
✅ Migration complete!
```

### Step 3: Verify Migration

```bash
# Check schema
sqlite3 /data/loom_lite_v2.db ".schema concepts"

# Should show:
# parent_cluster_id TEXT
# hierarchy_level INTEGER
# coherence REAL
```

### Step 4: Test Extraction

**Upload a test document via API:**
```bash
curl -X POST http://127.0.0.1:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "file": "<base64_encoded_file>",
    "filename": "test.txt",
    "title": "Test Document"
  }'
```

**Monitor logs for:**
```
🔄 Building semantic hierarchy...
✅ Hierarchy Built: 2 clusters, 15 concepts
   Average Coherence: 0.85
   Processing Time: 250ms
```

### Step 5: Verify Frontend

1. Open https://loomlite.vercel.app
2. Click on test document in Galaxy View
3. Switch to Mind Map view
4. Verify hierarchy structure:
   - Document (root)
   - Clusters (grey-blue nodes)
   - Concepts (colored nodes)

---

## 🔍 Verification Tests

### Test 1: Hierarchy Detection
```javascript
// In browser console
fetch('http://127.0.0.1:8000/doc/<doc_id>/ontology')
  .then(r => r.json())
  .then(data => {
    const hasClusters = data.concepts.some(c => c.hierarchy_level === 2);
    const hasConcepts = data.concepts.some(c => c.hierarchy_level === 3);
    console.log('Clusters:', hasClusters);
    console.log('Concepts:', hasConcepts);
  });
```

### Test 2: Performance
```bash
# Check extraction logs
# Clustering should be < 400ms
grep "Processing Time" /var/log/railway.log
```

### Test 3: Backward Compatibility
```bash
# Old documents should still load
curl http://127.0.0.1:8000/doc/<old_doc_id>/ontology
# Should return concepts with NULL hierarchy fields
```

---

## 🐛 Troubleshooting

### Issue: Migration fails with "column already exists"
**Solution:** This is expected if migration was run before. The script handles this gracefully.

### Issue: Clustering takes > 400ms
**Solution:** Check cluster count. If too many concepts, consider:
- Increasing similarity threshold
- Reducing min_span_length
- Optimizing relation graph building

### Issue: Mind Map shows flat structure
**Solution:** Check if concepts have hierarchy_level set:
```sql
SELECT hierarchy_level, COUNT(*) 
FROM concepts 
WHERE doc_id = '<doc_id>' 
GROUP BY hierarchy_level;
```

### Issue: Frontend not detecting hierarchy
**Solution:** Hard refresh (Ctrl+Shift+R) to clear cache.

---

## 📊 Success Metrics

### Backend
- ✅ Migration completes without errors
- ✅ Clustering logs show cluster creation
- ✅ Performance < 400ms
- ✅ No errors in extraction logs

### Frontend
- ✅ Mind Map shows cluster nodes
- ✅ Concepts grouped under clusters
- ✅ Expandable tree structure
- ✅ No console errors

### Data Quality
- ✅ Cluster count: 2-5 per document
- ✅ Concept count: 10-30 per document
- ✅ Average coherence: > 0.7
- ✅ Orphan concepts: < 20%

---

## 🔄 Rollback Plan

If issues occur:

### Step 1: Revert Backend
```bash
git revert b4de3e9
git push origin main
# Railway will auto-deploy
```

### Step 2: Database Rollback
```sql
-- Remove hierarchy columns (optional)
ALTER TABLE concepts DROP COLUMN parent_cluster_id;
ALTER TABLE concepts DROP COLUMN hierarchy_level;
ALTER TABLE concepts DROP COLUMN coherence;
```

### Step 3: Verify
- Check that old documents still load
- Verify Mind Map falls back to flat structure

---

## 📝 Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor extraction logs for errors
- [ ] Check performance metrics
- [ ] Verify user feedback
- [ ] Document any issues

### Short-term (Week 1)
- [ ] Re-extract key documents with hierarchy
- [ ] Gather user feedback on Mind Map
- [ ] Optimize clustering parameters
- [ ] Update documentation

### Long-term (Month 1)
- [ ] Create SEMANTIC_HIERARCHY_STANDARD_v1.2.md
- [ ] Add LLM-based cluster labeling
- [ ] Implement cosine similarity clustering
- [ ] Add hierarchy analytics

---

## 📞 Support

**Issues:** https://github.com/Legend1280/loomlite/issues  
**Logs:** Railway dashboard → Backend service → Logs  
**Database:** Railway dashboard → Backend service → Data tab

---

## ✅ Final Checklist

Before marking deployment complete:

- [ ] Migration ran successfully
- [ ] Test document extracted with hierarchy
- [ ] Mind Map shows clusters
- [ ] Performance < 400ms
- [ ] No console errors
- [ ] Old documents still work
- [ ] Logs show clustering success
- [ ] User testing completed

---

**Deployment Status:** 🟡 Pending  
**Next Step:** Run migration on Railway  
**Estimated Time:** 15 minutes

