# Frontend Performance Optimization Guide

## 60 FPS Playback Engine Architecture

### Core Principle
**Never use React state (`useState`) for 60 FPS updates.** Use React Refs and direct DOM manipulation.

### Implementation Pattern

```typescript
// ❌ BAD: Causes re-renders every frame
const [carPosition, setCarPosition] = useState({ x: 0, y: 0 });
setCarPosition(newPosition); // 60 times per second = 60 re-renders!

// ✅ GOOD: Direct DOM manipulation via refs
const carRef = useRef<HTMLDivElement>(null);
carRef.current?.style.setProperty('transform', `translate3d(${x}px, ${y}px, 0)`);
```

---

## usePlaybackLoop Hook Pattern

```typescript
function usePlaybackLoop() {
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  // Zustand store for shared state
  const { currentTime, isPlaying, timeline } = usePlaybackStore();
  
  useEffect(() => {
    if (!isPlaying) return;
    
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      // Update time (this updates Zustand, but only once per frame)
      const newTime = currentTime + delta;
      usePlaybackStore.getState().setCurrentTime(newTime);
      
      // Get frame data for current time
      const frame = getFrameAtTime(timeline, newTime);
      
      // Update all visual elements via REFS (not state)
      updateCarPositions(frame.vehicles); // Direct DOM manipulation
      updateTelemetryGauges(frame.selectedVehicle); // Direct DOM manipulation
      updateSteeringWheel(frame.selectedVehicle.Steering_Angle); // CSS transform
      
      frameRef.current = requestAnimationFrame(animate);
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isPlaying, timeline]);
}
```

---

## Component Update Patterns

### Car Markers (TrackMap)

```typescript
// ✅ Use refs and CSS transforms
const CarMarker = ({ vehicle, bounds }) => {
  const markerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!markerRef.current) return;
    
    const x = normalizeGPS(vehicle.VBOX_Long_Minutes, bounds, 'x');
    const y = normalizeGPS(vehicle.VBOX_Lat_Min, bounds, 'y');
    
    // Direct CSS transform (GPU accelerated)
    markerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, [vehicle, bounds]);
  
  return <div ref={markerRef} className="car-marker" />;
};
```

### Steering Wheel

```typescript
// ✅ CSS transform for rotation
const SteeringWheel = ({ angle }) => {
  const wheelRef = useRef<SVGCircleElement>(null);
  
  useEffect(() => {
    if (!wheelRef.current) return;
    wheelRef.current.style.transform = `rotate(${angle}deg)`;
  }, [angle]);
  
  return <circle ref={wheelRef} className="steering-wheel" />;
};
```

### Throttle/Brake Bars

```typescript
// ✅ Direct height manipulation
const ThrottleBar = ({ percent }) => {
  const barRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.height = `${percent}%`;
  }, [percent]);
  
  return <div ref={barRef} className="throttle-bar" />;
};
```

### Digital Gauges (Speed, RPM, Gear)

```typescript
// ✅ Direct text content update (minimal DOM change)
const SpeedGauge = ({ speed }) => {
  const speedRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (!speedRef.current) return;
    speedRef.current.textContent = Math.round(speed).toString();
  }, [speed]);
  
  return <span ref={speedRef} className="speed-gauge" />;
};
```

---

## Data Loading Strategy

### Initial Load (Before Playback)

```typescript
async function loadRaceData(track: string, race: string) {
  // 1. Load metadata first (small, fast)
  const [bounds, sectors, events, index] = await Promise.all([
    fetch(`/api/data/tracks/${track}_boundaries.json`).then(r => r.json()),
    fetch(`/api/data/sectors/${track}_sectors.json`).then(r => r.json()),
    fetch(`/api/data/events/${track}_events.json`).then(r => r.json()),
    fetch(`/api/data/timeline/timeline_index.json`).then(r => r.json())
  ]);
  
  // 2. Load timeline data (large, can be async)
  // Option A: Load entire race into memory
  const timeline = await loadEntireRace(track, race);
  
  // Option B: Stream/query on-demand
  // (Implement lazy loading for large races)
  
  // 3. Store in Zustand
  usePlaybackStore.getState().setRaceData({
    bounds,
    sectors,
    events,
    timeline
  });
}
```

### Memory Management

```typescript
// Cleanup when switching races
useEffect(() => {
  return () => {
    // Clear previous race data
    usePlaybackStore.getState().clearRaceData();
  };
}, [track, race]);
```

---

## Zustand Store Structure

```typescript
interface PlaybackState {
  // Race metadata
  track: string | null;
  race: string | null;
  bounds: TrackBounds | null;
  sectors: SectorData | null;
  events: EventData[] | null;
  
  // Playback state
  isPlaying: boolean;
  currentTime: number; // milliseconds
  totalDuration: number;
  
  // Current frame data
  currentFrame: RaceFrame | null;
  
  // Selected vehicle
  selectedVehicleId: string | null;
  
  // Actions
  setRaceData: (data: RaceData) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  seekTo: (timestamp: Date) => void;
  selectVehicle: (vehicleId: string) => void;
}

const usePlaybackStore = create<PlaybackState>((set) => ({
  track: null,
  race: null,
  bounds: null,
  sectors: null,
  events: null,
  isPlaying: false,
  currentTime: 0,
  totalDuration: 0,
  currentFrame: null,
  selectedVehicleId: null,
  
  setRaceData: (data) => set({ ...data }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  seekTo: (timestamp) => set({ 
    currentTime: timestamp.getTime(),
    isPlaying: false 
  }),
  selectVehicle: (id) => set({ selectedVehicleId: id }),
}));
```

---

## Optimization Checklist

### Data Loading
- [ ] Load metadata (bounds, sectors) before timeline
- [ ] Use Promise.all for parallel loading
- [ ] Cache frequently accessed data
- [ ] Lazy load timeline data for large races
- [ ] Clean up data when switching races

### Rendering
- [ ] Use React Refs for 60 FPS updates
- [ ] Use CSS Transforms (translate3d, rotate)
- [ ] Minimize DOM queries (cache refs)
- [ ] Batch DOM updates when possible
- [ ] Use requestAnimationFrame (not setInterval)

### State Management
- [ ] Use Zustand for shared state
- [ ] Use selectors to prevent unnecessary re-renders
- [ ] Keep state updates outside 60 FPS loop
- [ ] Use refs for frame-by-frame updates

### Memory
- [ ] Only load data for selected race
- [ ] Unload data when not needed
- [ ] Use object pooling for frequently created objects
- [ ] Monitor memory usage in DevTools

---

## Debugging Performance

### React DevTools Profiler
- Check component render counts
- Identify components re-rendering every frame
- Find expensive computations

### Chrome Performance Tab
- Record during playback
- Check FPS (should be 60)
- Identify long tasks blocking main thread
- Check memory usage

### Common Issues

**Issue**: FPS drops below 60
- **Cause**: Using useState in playback loop
- **Fix**: Switch to refs + direct DOM manipulation

**Issue**: Stuttering/jank
- **Cause**: Expensive computations in render
- **Fix**: Move calculations to useEffect or useMemo

**Issue**: High memory usage
- **Cause**: Loading entire timeline at once
- **Fix**: Implement chunking/lazy loading

---

## Best Practices Summary

1. **60 FPS Updates**: Refs + CSS Transforms only
2. **State Updates**: Zustand for shared state, refs for per-frame updates
3. **Data Loading**: Load metadata first, timeline second
4. **Memory**: Clean up when switching races
5. **Rendering**: Minimize re-renders, use GPU-accelerated CSS
6. **Performance**: Monitor with DevTools, optimize bottlenecks

