<!-- 27b77e4d-1e0a-43da-b3b9-00e82a0d89c6 2192d7b8-8a35-4ce8-b479-4056487deaec -->
# Plan: Build Dashboard UI

This plan will scaffold the frontend for the race telemetry dashboard.

1.  **Component Structure**: Create a new directory `frontend/app/components/dashboard` to house the new components.
2.  **Component Creation**: Create the following placeholder components with basic structure and styling:

    -   `Header.tsx`
    -   `RaceInfo.tsx`
    -   `Standings.tsx`
    -   `TrackMap.tsx`
    -   `Telemetry.tsx`
    -   `PlaybackControls.tsx`
    -   `LapProgress.tsx`

3.  **Dashboard Layout**: Update `frontend/app/dashboard/page.tsx` to use these components, arranging them in a three-column layout as seen in the designs.
4.  **Static Content**: Populate the components with static data to visually match the screenshots.

### To-dos

- [ ] Create new directory for dashboard components
- [ ] Create placeholder component files
- [ ] Implement main dashboard layout
- [ ] Populate components with static UI