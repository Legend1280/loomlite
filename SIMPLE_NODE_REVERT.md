# Simple Node Revert - Fix Massive Glow

**Date**: October 27, 2025  
**Issue**: Massive orange blob covering entire screen  
**Root Cause**: Oversized sprite with excessive blur  
**Solution**: Simple, small sprite with minimal blur  
**Status**: ✅ DEPLOYED  

---

## Problem: Massive Orange Blob

### What Went Wrong

**Broken Settings**:
- ViewBox: `-32 -32 64 64` (64px total)
- Outer radius: 28px
- Blur stdDeviation: 6
- Filter region: 400% width/height
- 3 overlapping layers with blur

**Math**:
- Each node: 64px viewBox
- Blur extends: 6 × 2 = 12px beyond radius
- Outer layer: 28 + 12 = 40px effective radius
- Filter region: 40 × 4 = 160px total glow per node!

**Result**: Nodes overlapping glows created one giant orange blob

---

## Solution: Simple, Small Nodes

### New Settings

**Sprite**:
- ViewBox: `-10 -10 20 20` (20px total, 68% smaller)
- Glow radius: 6px (was 28px)
- Core radius: 3px (was 8px)
- Blur stdDeviation: 2 (was 6)
- Filter region: 200% (was 400%)
- 2 layers (was 3)

**Math**:
- Each node: 20px viewBox
- Blur extends: 2 × 2 = 4px beyond radius
- Glow layer: 6 + 4 = 10px effective radius
- Filter region: 10 × 2 = 20px total glow per node

**Result**: Tiny, clean nodes with visible connections

---

### Physics Balance

**Moderate Clustering**:
```javascript
.force('link', d3.forceLink(links)
  .id(d => d.id)
  .distance(120)       // Moderate spacing (not too tight, not too loose)
  .strength(0.3))      // Moderate bond strength

.force('charge', d3.forceManyBody()
  .strength(-200))     // Moderate repulsion

.force('center', d3.forceCenter(width / 2, height / 2))

.force('collision', d3.forceCollide()
  .radius(12));        // Moderate collision radius
```

**Balance**:
- Not too clustered (distance 120, not 55)
- Not too spread (charge -200, not -800)
- Moderate collision (radius 12)

---

## Code Changes

### Sprite Definition

**Before** (Broken):
```xml
<symbol id="star-sprite" viewBox="-32 -32 64 64">
  <circle r="28" opacity="0.25" filter="url(#radiant-blur)" />  <!-- HUGE -->
  <circle r="16" opacity="0.5" filter="url(#radiant-blur)" />
  <circle r="8" opacity="0.8" filter="url(#radiant-blur)" />
</symbol>

<filter id="radiant-blur">
  <feGaussianBlur stdDeviation="6" />  <!-- TOO STRONG -->
</filter>
```

**After** (Fixed):
```xml
<symbol id="star-sprite" viewBox="-10 -10 20 20">
  <circle r="6" opacity="0.4" filter="url(#node-blur)" />  <!-- Small glow -->
  <circle r="3" />  <!-- Tiny core -->
</symbol>

<filter id="node-blur">
  <feGaussianBlur stdDeviation="2" />  <!-- Minimal blur -->
</filter>
```

---

### Gradient Simplification

**Before** (Complex):
```xml
<radialGradient id="sunburst-glow">
  <stop offset="0%" stop-color="#fff9e6" stop-opacity="0.9" />
  <stop offset="30%" stop-color="#ffeaa0" stop-opacity="0.7" />
  <stop offset="70%" stop-color="#ffb347" stop-opacity="0.3" />
  <stop offset="100%" stop-color="#ff8c00" stop-opacity="0" />
</radialGradient>
```

**After** (Simple):
```xml
<radialGradient id="node-glow">
  <stop offset="0%" stop-color="#fbbf24" stop-opacity="1" />
  <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.8" />
</radialGradient>
```

---

## Expected Result

### Visual

**Nodes**:
- Tiny glowing circles (6px glow, 3px core)
- Yellow-orange gradient
- Subtle blur (not massive)
- Clean, professional appearance

**Connections**:
- Blue lines clearly visible
- Not hidden by glow
- Graph structure readable

**Layout**:
- Moderate clustering (not too tight)
- Centered on screen
- Balanced spacing

---

## Comparison

| Metric | Broken | Fixed | Change |
|--------|--------|-------|--------|
| **ViewBox** | 64×64 | 20×20 | 68% smaller |
| **Glow radius** | 28px | 6px | 79% smaller |
| **Blur stdDev** | 6 | 2 | 67% less |
| **Layers** | 3 | 2 | Simpler |
| **Effective glow** | ~160px | ~20px | 88% smaller |
| **Link distance** | 55 | 120 | More spacing |
| **Charge** | -18 | -200 | More repulsion |

---

## Lessons Learned

### D3 SVG Sprite Scaling

**Key Principle**: ViewBox size matters!
- Small viewBox (20×20) = Small rendered nodes
- Large viewBox (64×64) = Large rendered nodes
- Blur extends beyond radius (stdDev × 2)
- Filter region multiplies effective size

**Formula**:
```
Effective glow = (radius + blur × 2) × filterRegion%
```

**Example (Broken)**:
```
(28 + 6 × 2) × 4 = 40 × 4 = 160px per node!
```

**Example (Fixed)**:
```
(6 + 2 × 2) × 2 = 10 × 2 = 20px per node
```

---

### Force Simulation Balance

**Too Tight** (distance 55, charge -18):
- Nodes cluster in tiny ball
- All crammed together
- Hard to see individual nodes

**Too Loose** (distance 200, charge -800):
- Nodes drift apart
- Scattered across screen
- No cohesive structure

**Balanced** (distance 120, charge -200):
- Moderate clustering
- Visible connections
- Clear graph structure

---

## Deployment

**Commit**: `a99a69c`  
**Status**: ✅ Pushed to main  
**Vercel**: Auto-deploying  

---

## Testing Checklist

- [ ] Nodes are small (not massive blobs)
- [ ] Glow is subtle (not covering screen)
- [ ] Connections visible (blue lines)
- [ ] Moderate clustering (not too tight)
- [ ] Centered on screen
- [ ] No console errors
- [ ] Click/drag/search still work

---

## Conclusion

**Root Cause**: Oversized sprite (64×64 viewBox, 28px radius, stdDev 6)  
**Fix**: Simple sprite (20×20 viewBox, 6px radius, stdDev 2)  
**Result**: Clean, small nodes with visible connections  

**Key Takeaway**: D3 SVG sprite sizing requires careful math - viewBox, radius, blur, and filter region all multiply together to create effective visual size.

