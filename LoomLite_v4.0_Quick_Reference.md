# LoomLite v4.0 - Quick Reference Guide

**One-Page Cheat Sheet for Developers**

---

## 🎯 Core Concepts

| Concept | Description |
|---------|-------------|
| **Galaxy View** | Multi-document cluster visualization (Canvas) |
| **Solar System** | Single document concept graph (D3 Force) |
| **Mind Map** | Hierarchical concept tree (D3 Tree) |
| **Surface Viewer** | Right panel with 3 tabs (Ontology, Document, Analytics) |
| **Event Bus** | Central pub/sub system for module communication |
| **Focus Mode** | Double-click to expand panels to 90% (v4.0) |
| **Semantic Centering** | Triple-click to center/zoom graphs (v4.0) |

---

## 📁 File Structure

```
frontend/
├── index.html              # Main entry point
├── eventBus.js             # Core pub/sub system
├── galaxyView.js           # Multi-document view
├── dualVisualizer.js       # Solar System view
├── mindMapView.js          # Mind Map view
├── surfaceViewer.js        # Right panel (3 tabs)
├── fileSystemSidebar.js    # Left sidebar
├── searchBar.js            # Search input
├── dynamicFoldersPanel.js  # Folder tree
├── systemStatus.js         # Health dashboard
└── quadrantFocus.js        # Focus mode (v4.0)
```

---

## 🎨 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Deep Black** | `#0a0a0a` | Body background |
| **Dark Grey** | `#0c0c0c` | Toolbar |
| **Panel Grey** | `#181818` | Panels |
| **Primary Text** | `#e6e6e6` | Main text |
| **Secondary Text** | `#9a9a9a` | Labels |
| **Yellow Accent** | `#fad643` | Buttons, highlights |
| **Error Red** | `#ef4444` | Errors |

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/ingest/file` | Upload document |
| `GET` | `/doc/{id}/ontology` | Get concepts + relations |
| `GET` | `/doc/{id}/text` | Get document text |
| `GET` | `/api/search?q={query}` | Semantic search |
| `GET` | `/folders` | List all documents |
| `GET` | `/system/status` | Health check |

**Base URL**: `https://loomlite-production.up.railway.app`

---

## 📡 Event Bus Events

### Document Events
```javascript
bus.emit('documentFocus', { docId });
bus.emit('conceptSelected', { conceptId, concept, ... });
```

### Search Events
```javascript
bus.emit('searchResults', { results });
bus.emit('searchCleared', {});
```

### Focus Mode Events (v4.0)
```javascript
bus.emit('panelFocused', { panelId });
bus.emit('panelUnfocused', { panelId });
bus.emit('centerMindMap', {});
bus.emit('centerSolarSystem', {});
```

---

## 🖱️ User Interactions

### Click Actions
| Action | Effect |
|--------|--------|
| **Single Click** | Select concept/document |
| **Double Click** | Enter/exit focus mode |
| **Triple Click** | Center/zoom graph (Mind Map/Solar only) |
| **Click Outside** | Exit focus mode |
| **Press Esc** | Exit focus mode |

### Focus Mode Targets
- Solar System View (`visualizer-top`)
- Mind Map View (`visualizer-bottom`)
- Document Viewer (`surface-viewer`)

---

## 🔧 Key Functions

### Event Bus
```javascript
bus.emit(eventName, detail);     // Emit event
bus.on(eventName, callback);     // Subscribe
setCurrentDocId(docId);          // Set active doc
setCurrentConceptId(conceptId);  // Set active concept
```

### Focus Mode
```javascript
initQuadrantFocus();             // Initialize system
getFocusedPanel();               // Get current focus
isPanelFocused(panelId);         // Check if focused
focusPanel(panelId);             // Programmatic focus
unfocusPanel();                  // Programmatic unfocus
```

### Visualization
```javascript
await initGalaxyView();          // Init Galaxy
await drawDualVisualizer(docId); // Init Solar
await initMindMapView(docId);    // Init Mind Map
initSurfaceViewer();             // Init Surface Viewer
```

---

## 🎭 CSS Transitions

```css
/* Standard transitions */
transition: all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1);

/* Focus mode transitions */
transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

/* Centering animations */
transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 🚀 Deployment

### Local Development
```bash
git clone https://github.com/Legend1280/loomlite.git
cd loomlite/frontend
npx http-server -p 8080
```

### Vercel (Frontend)
- Auto-deploy from GitHub `main` branch
- Root: `/frontend`
- Build: None (static site)

### Railway (Backend)
- Auto-deploy from GitHub `main` branch
- Root: `/backend`
- Framework: FastAPI

---

## 🐛 Debugging

### Console Logs
```javascript
// Enable verbose logging
localStorage.setItem('debug', 'true');

// Check event bus activity
bus.on('*', (event) => console.log('Event:', event));

// Check focus mode state
console.log(getFocusedPanel());
```

### Common Issues
| Issue | Solution |
|-------|----------|
| Blank visualizations | Check API response in Network tab |
| Click not working | Check if element has `pointer-events: none` |
| Focus mode stuck | Press Esc or refresh page |
| Search not highlighting | Check if results array is valid |

---

## 📊 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Initial Load | < 2s | ~1.2s |
| Galaxy Render | < 500ms | ~300ms |
| Solar Render | < 300ms | ~200ms |
| Mind Map Render | < 400ms | ~250ms |
| Search Latency | < 200ms | ~150ms |
| Focus Transition | 400ms | 400ms |

---

## 🔑 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Exit focus mode |
| `Ctrl+F` | Focus search bar |
| `Ctrl+U` | Open upload dialog |

---

## 📦 Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| D3.js | 7.9.0 | Visualization |
| Force-Collide | Custom | Galaxy view |

**No build tools required** - Pure vanilla JavaScript!

---

## 🎯 Quick Start Checklist

- [ ] Clone repository
- [ ] Review `index.html` structure
- [ ] Understand event bus in `eventBus.js`
- [ ] Explore Galaxy View in `galaxyView.js`
- [ ] Test focus mode (double-click panels)
- [ ] Test centering (triple-click Mind Map/Solar)
- [ ] Review API integration
- [ ] Check color palette consistency
- [ ] Test all view modes
- [ ] Deploy to Vercel

---

## 📚 Documentation Files

1. **LoomLite_v4.0_Developer_Handoff.md** - Complete system documentation
2. **LoomLite_v4.0_System_Diagrams.md** - Visual flow diagrams
3. **LoomLite_v4.0_Quick_Reference.md** - This file (cheat sheet)
4. **v4.0_Quadrant_Focus_Complete.md** - Focus mode feature docs
5. **v2.3_Emoji_Removal_Complete.md** - UI polish docs

---

## 🔗 Links

- **Production**: https://loomlite.vercel.app
- **Repository**: https://github.com/Legend1280/loomlite
- **Backend API**: https://loomlite-production.up.railway.app

---

## 💡 Pro Tips

1. **Use Event Bus** - Always emit events for cross-module communication
2. **Check Console** - All modules log initialization and key actions
3. **Test Focus Mode** - Double-click any visualization to expand
4. **Use Centering** - Triple-click to reset zoom on Mind Map/Solar
5. **Inspect Network** - Check API responses for data structure
6. **Read Comments** - Inline code comments explain complex logic
7. **Follow Patterns** - New modules should follow existing patterns

---

## 🎉 Version 4.0 Highlights

✅ **Dynamic Quadrant Focus** - Double-click to expand panels  
✅ **Semantic Centering** - Triple-click to center/zoom  
✅ **Unified Color Palette** - Dark mode with yellow accent  
✅ **Clean UI** - No emoji, professional icons  
✅ **Smooth Transitions** - 400ms focus, 600ms centering  
✅ **Event-Driven** - Decoupled modules via event bus  

---

*Quick Reference v1.0 | LoomLite v4.0 | October 26, 2025*

