# 🚨 URGENT: Database Migration Required

**Date:** October 26, 2025  
**Issue:** Upload jobs failing with SQL error  
**Root Cause:** Database schema not updated for v2.3 semantic hierarchy

---

## 🔍 Problem Diagnosis

**Error Message:**
```
table concepts has no column named parent_cluster_id
```

**What's Happening:**
1. ✅ Frontend uploads file successfully
2. ✅ Backend creates job (`job_7a6ec1b3ba95`)
3. ✅ Extraction completes (concepts/relations extracted)
4. ❌ **Storage fails** - trying to save `parent_cluster_id` column that doesn't exist
5. ❌ Job marked as "failed"
6. ❌ No document created

**Why:**
- Code deployed with v2.3 features (semantic hierarchy)
- Database still has v1.1 schema (no hierarchy columns)
- Migration script exists but was never run on Railway

---

## ✅ Solution: Run Database Migration

### Option 1: Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**
   - https://railway.app
   - Find `loomlite-production` project

2. **Open Shell**
   - Click on the service
   - Go to "Shell" or "Terminal" tab

3. **Run Migration**
   ```bash
   cd /app/backend
   python3 migrate_add_hierarchy.py
   ```

4. **Verify Success**
   ```bash
   # Should see:
   ✅ Added parent_cluster_id column
   ✅ Added hierarchy_level column  
   ✅ Added coherence column
   ✅ Migration complete!
   ```

5. **Test Upload**
   - Upload a test file
   - Check `/api/jobs` - should show "completed" not "failed"

---

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Run migration
railway run python3 backend/migrate_add_hierarchy.py
```

---

### Option 3: Direct Database Access

If you have direct database access:

```sql
-- Add hierarchy columns to concepts table
ALTER TABLE concepts ADD COLUMN parent_cluster_id TEXT;
ALTER TABLE concepts ADD COLUMN hierarchy_level INTEGER DEFAULT 3;
ALTER TABLE concepts ADD COLUMN coherence REAL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_concepts_parent 
ON concepts(parent_cluster_id);

-- Verify
SELECT sql FROM sqlite_master WHERE name='concepts';
```

---

## 📋 Migration Script Contents

The migration script (`backend/migrate_add_hierarchy.py`) does:

1. **Adds 3 new columns to `concepts` table:**
   - `parent_cluster_id` TEXT - Links concept to parent cluster
   - `hierarchy_level` INTEGER - 0=doc, 1=section, 2=cluster, 3=concept, 4=mention
   - `coherence` REAL - Semantic coherence score (0.0-1.0)

2. **Creates index:**
   - `idx_concepts_parent` on `parent_cluster_id` for fast lookups

3. **Backward compatible:**
   - All columns are nullable
   - Existing data unchanged
   - Old documents still work

---

## 🧪 Verification Steps

### 1. Check Migration Success
```bash
# In Railway shell
sqlite3 /data/loom_lite_v2.db "PRAGMA table_info(concepts);"

# Should show:
# ...
# parent_cluster_id | TEXT
# hierarchy_level   | INTEGER
# coherence         | REAL
```

### 2. Test Upload
```bash
# Upload a file via frontend
# Check job status
curl https://loomlite-production.up.railway.app/api/jobs

# Should show:
# "status": "completed"  ← NOT "failed"
```

### 3. Verify Hierarchy
```bash
# Check a document's ontology
curl https://loomlite-production.up.railway.app/doc/{doc_id}/ontology

# Concepts should have:
# "parent_cluster_id": "c_xxx_cluster_1"
# "hierarchy_level": 3
# "coherence": 0.85
```

---

## 🚨 Impact of NOT Running Migration

**Current State:**
- ❌ All uploads fail
- ❌ No new documents can be added
- ❌ Jobs stuck in "failed" state
- ✅ Existing documents still viewable
- ✅ Search still works

**After Migration:**
- ✅ Uploads work
- ✅ Semantic hierarchy enabled
- ✅ Mind Map shows clusters
- ✅ Better concept organization

---

## 📊 Expected Results

### Before Migration:
```json
{
  "job_id": "job_xxx",
  "status": "failed",
  "error": "table concepts has no column named parent_cluster_id"
}
```

### After Migration:
```json
{
  "job_id": "job_yyy",
  "status": "completed",
  "doc_id": "doc_zzz",
  "concepts_count": 18,
  "relations_count": 12
}
```

### Concepts with Hierarchy:
```json
{
  "label": "Membership-based primary care",
  "type": "Feature",
  "confidence": 0.95,
  "parent_cluster_id": "c_doc_cluster_revenue_models",
  "hierarchy_level": 3,
  "coherence": 0.87
}
```

---

## 🔧 Troubleshooting

### Migration Fails
```
Error: database is locked
```
**Solution:** Stop the API service temporarily, run migration, restart

### Column Already Exists
```
Error: duplicate column name
```
**Solution:** Migration already run! Check if columns exist:
```bash
sqlite3 /data/loom_lite_v2.db "PRAGMA table_info(concepts);"
```

### Permission Denied
```
Error: unable to open database file
```
**Solution:** Check DB_DIR environment variable, ensure /data volume is mounted

---

## 📝 Post-Migration Checklist

- [ ] Migration script ran without errors
- [ ] Database has 3 new columns
- [ ] Index created successfully
- [ ] Test upload completes successfully
- [ ] Job status shows "completed"
- [ ] New document appears in /tree
- [ ] Mind Map shows hierarchy
- [ ] Existing documents still work

---

## 🚀 Next Steps After Migration

1. **Test uploads** - Try uploading 2-3 documents
2. **Verify hierarchy** - Check Mind Map view for clusters
3. **Monitor performance** - Ensure extraction < 400ms
4. **Update documentation** - Mark v2.3 as fully deployed

---

## 📞 Support

If migration fails or you need help:
1. Check Railway logs for detailed error messages
2. Verify database file permissions
3. Ensure /data volume is writable
4. Check OPENAI_API_KEY is set (for extraction to work)

---

**Status:** 🚨 URGENT - Migration Required  
**Priority:** P0 - Blocking all uploads  
**ETA:** 5 minutes to run migration  
**Impact:** Unblocks v2.3 semantic hierarchy features

