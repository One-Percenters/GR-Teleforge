<!-- 27b77e4d-1e0a-43da-b3b9-00e82a0d89c6 04d42660-6051-48ea-ae17-29f7c55571ed -->
# Plan: Add Playback Simulation to Dashboard

We will extend the existing dashboard UI to support real playback controls over time-series race data.

1. **Data model + types**: Define TypeScript types for time-series race data (e.g. `RaceFrame`, `DriverState`) representing per-timestamp positions, telemetry, and race meta, and shape them so they can be directly mapped into the existing component props (`RaceInfoPanelProps`, `TrackMapProps`, `TelemetryPanelProps`, `LapProgressProps`, `PlaybackControlsProps`).
2. **Mock data + API hook point**: Create a small mock race timeline (array of `RaceFrame`s) that mimics what your real backend will send, and centralize loading in a single place (e.g. a `useRaceData` hook or `getRaceData` function) so it can later be swapped with a real API call without changing UI components.
3. **Playback state management**: Introduce a client-side playback container (e.g. `DashboardPlaybackContainer`) that owns `isPlaying`, `currentTimeIndex`, `playbackSpeed`, and exposes handlers for play/pause, step forward/backward, and scrubbing via a progress bar; implement a simple timer loop to advance frames while playing.
4. **Wire UI to playback state**: In the playback container, derive the current `RaceFrame` from the timeline and map it into props for `DashboardHeader`, `RaceInfoPanel`, `TrackMap`, `TelemetryPanel`, `LapProgressStrip`, and `PlaybackControls` so that all visible data updates as the timeline advances or is scrubbed.
5. **Controls + UX polish**: Enhance `PlaybackControls` to call the new handlers (play/pause, previous/next frame, on-scrub change), keep the visual design matching the existing mock, and ensure the behavior feels smooth (clamp indices, handle start/end, and make it resilient if data is missing).

### To-dos

- [ ] Define TypeScript types for time-series race data and mapping to existing dashboard props
- [ ] Create mock race timeline data and a loader function/hook that can later be swapped with a real API
- [ ] Implement a playback container or hook that manages isPlaying, current frame index, playback speed, and timers
- [ ] Map the current race frame into props for Header, RaceInfo, TrackMap, Telemetry, LapProgress, and PlaybackControls
- [ ] Wire PlaybackControls buttons and scrub bar to playback actions and polish edge cases (bounds, empty data)