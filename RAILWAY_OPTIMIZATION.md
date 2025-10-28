# Railway Deployment Optimization Guide

**Version:** 1.0  
**Date:** October 28, 2025  
**Purpose:** Speed up Railway deployments from 8-10 minutes to 2-3 minutes

---

## Problem

Railway builds were taking 8-10 minutes per deployment due to:
1. **Model re-downloads** - MiniLM (~90MB) downloaded every build
2. **ChromaDB reinitialization** - DuckDB rebuilt on every deploy
3. **No persistent cache** - Transformer models not cached between builds

---

## Solution Overview

### Code Changes ✅ **COMPLETED**

Updated `backend/embedding_service.py` to:
- Set persistent cache directories for HuggingFace models
- Use `/app/chroma_data` for ChromaDB persistence

### Railway Configuration ⏳ **REQUIRED**

You need to configure Railway with:
1. **Environment Variables** - Cache paths
2. **Volume Mount** - Persistent ChromaDB storage

---

## Step-by-Step Implementation

### Step 1: Add Environment Variables in Railway

1. Go to your Railway project dashboard
2. Navigate to **Variables** tab
3. Add the following variables:

```bash
HF_HOME=/app/cache
TRANSFORMERS_CACHE=/app/cache
SENTENCE_TRANSFORMERS_HOME=/app/cache
CHROMA_PATH=/app/chroma_data
```

**What this does:**
- Caches MiniLM model weights (~90MB) between deployments
- Prevents re-downloading transformer models on every build
- Points ChromaDB to persistent volume

### Step 2: Create Persistent Volume for ChromaDB

1. In Railway dashboard, go to your service
2. Click **Volumes** tab
3. Click **+ New Volume**
4. Configure:
   - **Mount Path:** `/app/chroma_data`
   - **Name:** `chroma-storage`
5. Click **Create**

**What this does:**
- Preserves ChromaDB database between deployments
- Avoids DuckDB reinitialization on every deploy
- Keeps vector embeddings persistent

### Step 3: Verify Cache Directories Exist

The code will automatically create cache directories, but you can verify after deployment:

```bash
railway run ls -la /app/cache
railway run ls -la /app/chroma_data
```

---

## Expected Results

### Before Optimization
- **Build time:** 8-10 minutes
- **Model download:** Every deployment (~90MB)
- **ChromaDB:** Rebuilt every deployment

### After Optimization
- **Build time:** 2-3 minutes ⚡
- **Model download:** First deployment only (cached after)
- **ChromaDB:** Persistent across deployments

### Time Savings
- **First deployment:** Same (~8-10 min) - downloads models once
- **Subsequent deployments:** ~5-7 minutes faster (2-3 min total)

---

## Verification Steps

After implementing both steps, trigger a deployment and check logs for:

### ✅ **Success Indicators**

```
Loading embedding model: all-MiniLM-L6-v2...
Model loaded successfully. Embedding dimension: 384
```

If you see this quickly (<10 seconds), the model is cached.

```
Initializing ChromaDB at: /app/chroma_data
ChromaDB initialized successfully
```

If ChromaDB initializes quickly (<5 seconds), the volume is working.

### ❌ **Warning Signs**

```
Downloading: "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/..."
```

If you see this on every deployment, cache is not working - check environment variables.

```
Creating new DuckDB database...
```

If you see this on every deployment, volume is not mounted - check volume configuration.

---

## Troubleshooting

### Issue: Models still downloading every time

**Solution:**
- Verify environment variables are set correctly in Railway
- Check that `/app/cache` directory is writable
- Ensure `HF_HOME` is set **before** first model load

### Issue: ChromaDB reinitializing every time

**Solution:**
- Verify volume is mounted to `/app/chroma_data`
- Check volume permissions (should be writable)
- Ensure `CHROMA_PATH` environment variable is set

### Issue: Build still slow after optimization

**Possible causes:**
1. `requirements.txt` changed (forces full reinstall)
2. Railway cache evicted (free tier limitation)
3. Large migration running during build

**Check logs for:**
```
Collecting chromadb==0.5.23
Building wheels for collected packages...
```

If you see this, dependencies are being reinstalled - check if `requirements.txt` was modified.

---

## Maintenance

### When to Regenerate Cache

Clear cache if:
- Upgrading MiniLM model version
- Changing embedding dimensions
- ChromaDB data corruption

**How to clear:**
```bash
railway run rm -rf /app/cache/*
railway run rm -rf /app/chroma_data/*
```

Then redeploy to rebuild cache.

---

## Additional Optimizations (Future)

### Optional: Pin Nixpacks Version

Add to `railway.toml`:
```toml
[build]
builder = "NIXPACKS"
nixpacksVersion = "1.21.0"
```

### Optional: Reduce Build Verbosity

Add to Railway environment:
```bash
PIP_QUIET=1
```

---

## Summary

**Completed:**
- ✅ Code updated with cache paths
- ✅ ChromaDB path changed to persistent volume

**Required (Manual Steps):**
1. ⏳ Add environment variables in Railway dashboard
2. ⏳ Create volume mount for `/app/chroma_data`

**Expected Outcome:**
- 🎯 Deployment time: 8-10 min → 2-3 min
- 🎯 Model caching: Persistent across builds
- 🎯 ChromaDB: No reinitialization

---

**Next Steps:**
1. Complete Railway configuration (Steps 1-2 above)
2. Trigger a deployment
3. Verify cache is working (check logs)
4. Enjoy faster deployments! ⚡
