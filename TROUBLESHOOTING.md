# Virtual Best Lap - Troubleshooting Guide

## Quick Checklist

If you don't see the Virtual Lap Analysis overlay on the track map, verify:

### 1. ✅ Select a Driver
**The overlay only appears when a driver is selected!**
- Click on a driver in the "Race Info" panel (left side)
- The selected driver will be highlighted
- Valid drivers with mock data: **7, 13, 55, 99**

### 2. Check Browser Console
Open browser DevTools (F12) and look for these console logs:

```javascript
// When data loads:
Analysis Data Updated: { "7": {...}, "13": {...}, "55": {...}, "99": {...} }

// When a driver is selected:
TrackMap props: {
  analysis: { "7": {...}, ... },
  focusedCarNumber: 7,
  focusedStats: {
    bestS1: 28.234,
    bestS2: 31.567,
    bestS3: 29.891,
    virtualBest: 89.692,
    actualBest: 90.145,
    potentialGain: 0.453
  }
}
```

### 3. Verify API Response
In browser DevTools → Network tab, check the `/api/race-timeline` request:

```json
{
  "timeline": [...],
  "metadata": {...},
  "analysis": {
    "7": {
      "bestS1": 28.234,
      "bestS2": 31.567,
      "bestS3": 29.891,
      "virtualBest": 89.692,
      "actualBest": 90.145,
      "potentialGain": 0.453
    },
    ...
  },
  "source": "mock"
}
```

## Common Issues

### Issue: "Overlay doesn't appear"
**Solution**: Make sure you've clicked on a driver in the Race Info panel. The overlay is driver-specific!

### Issue: "All data shows as '--'"
**Solution**: 
1. Check console for `focusedStats: null`
2. Verify the car number matches one in the analysis object (7, 13, 55, or 99)
3. Make sure API is returning `analysis` field

### Issue: "Console shows 'analysis: null'"
**Solution**:
1. Check `/api/race-timeline` returns `analysis` field
2. Verify the route.ts file has the mock analysis data (lines 34-70)
3. Try hard-refreshing the page (Ctrl+Shift+R)

## Expected Behavior

### When Working Correctly:
1. ✅ Page loads with dashboard visible
2. ✅ Console shows: `Analysis Data Updated: {...}` with driver data
3. ✅ Click on Driver #7 in Race Info panel
4. ✅ Console shows: `TrackMap props:` with `focusedCarNumber: 7` and populated `focusedStats`
5. ✅ **Virtual Lap Analysis card appears** in bottom-left of track map
6. ✅ Card shows:
   - Actual Best: 90.145
   - Virtual Best: 89.692 (in amber)
   - Potential Gain: -0.453s (in green)

### Visual Location
The overlay appears in the **bottom-left corner** of the track map section, above the track visualization.

## Testing Steps

1. Open http://localhost:3000
2. Wait for dashboard to load
3. Open browser console (F12)
4. Look for "Analysis Data Updated" log
5. Click "Driver #7" (Jaxon Bell) in the Race Info panel
6. Look for "TrackMap props" log showing focusedStats
7. Look at bottom-left of track map for the card

## Debug Mode

To see what's happening, check these console logs:
- `DashboardPlaybackContainer.tsx` line 84: Logs when analysis data changes
- `TrackMap.tsx` line 30: Logs the analysis props being passed

## File Verification

Make sure these files have the correct content:

### 1. `frontend/app/api/race-timeline/route.ts`
Should include analysis object (lines 34-70) with driver data

### 2. `frontend/app/components/dashboard/DashboardPlaybackContainer.tsx`
- Line 40: `const [analysis, setAnalysis] = useState<any>(null);`
- Line 70: `setAnalysis(data.analysis || null);`
- Line 198: `<TrackMap {...trackMap} analysis={analysis} focusedCarNumber={focusedCarNumber} />`

### 3. `frontend/app/components/dashboard/TrackMap.tsx`
- Lines 26-27: Accept `analysis` and `focusedCarNumber` props
- Line 31: Extract `focusedStats`
- Lines 72-94: Virtual Lap Analysis overlay JSX

## Need More Help?

If you've verified all the above and still don't see the overlay:
1. Check for any TypeScript/build errors in the terminal
2. Try stopping and restarting the dev server
3. Clear browser cache and hard refresh
4. Check that no other CSS is hiding the overlay (z-index: 30)

The feature is implemented and should work! The most common issue is simply forgetting to **click on a driver** to focus them.
