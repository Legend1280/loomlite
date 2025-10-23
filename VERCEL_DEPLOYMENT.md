# Vercel Frontend Deployment Instructions

## Quick Deployment via Vercel Dashboard

### Step 1: Import GitHub Repository
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository: `Legend1280/loomlite`

### Step 2: Configure Build Settings
When importing, use these settings:

**Framework Preset:** Other (Static HTML)

**Root Directory:** `frontend`

**Build Command:** (leave empty - no build needed for static HTML)

**Output Directory:** `.` (current directory)

**Install Command:** (leave empty - no dependencies to install)

### Step 3: Deploy
1. Click "Deploy"
2. Vercel will deploy your frontend and provide a URL like: `https://loomlite.vercel.app`

### Alternative: Deploy via Vercel CLI

If you prefer using the CLI:

```bash
cd /home/ubuntu/loom-lite-mvp/frontend
vercel login
vercel --prod
```

## Current Configuration

The frontend is already configured to connect to the Railway backend:

**Backend API URL:** `https://loomlite-production.up.railway.app`

This is set in `frontend/index.html` at line 333:
```javascript
const API_BASE = 'https://loomlite-production.up.railway.app';
```

## Post-Deployment

After deployment, you can:

1. **Test the deployed frontend** at your Vercel URL
2. **Set up custom domain** (optional) in Vercel project settings
3. **Enable automatic deployments** - Vercel will auto-deploy on every git push to main branch

## CORS Configuration

The Railway backend already has CORS enabled for all origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

This means the Vercel frontend can make API calls to the Railway backend without CORS issues.

## Troubleshooting

If you encounter issues:

1. **Check Railway backend is running:** Visit https://loomlite-production.up.railway.app/ (should return JSON)
2. **Check browser console** for any API errors
3. **Verify CORS headers** in browser DevTools Network tab
4. **Check Vercel deployment logs** in the Vercel dashboard

## Next Steps

After Vercel deployment:
1. Test the full application end-to-end
2. Set up N8N workflows for document ingestion
3. Add sample documents to populate the ontology

