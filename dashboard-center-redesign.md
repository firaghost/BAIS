# Dashboard Center Redesign (Mobile)

## Goal
Redesign the **center content** of the Flutter `DashboardScreen` to match the provided premium layout reference.

## Scope
- Keep existing reusable header (`AppHeader`) unchanged.
- Keep existing bottom navigation unchanged.
- Redesign only the dashboard body/center content.

## Requirements
- Map card must remain a **real map** (FlutterMap) and be **zoomed to Head Office** by default.
- Countdown ring behavior:
  - If not checked-in: show **countdown to shift start**.
  - If checked-in: show **worked time**.
- Weekly Summary must come from a **new backend endpoint** (no hardcoded values).

## Data Sources (Current)
- `AuthProvider`: user display name/job title.
- `AttendanceProvider`: current shift (`loadShifts`), today log (`loadTodayLog`), history.
- Location: Geolocator + Head Office geofence from backend (`AttendanceService.getHeadOfficeGeoFence`).

## Deliverables
- Flutter UI:
  - Premium greeting/overview card (gradient, status pill).
  - Shift card with ring + CTA (Check In/Out).
  - Map/location card (real map, polished overlays).
  - Weekly Summary cards (Hours Worked, Days Present) driven by backend.
- Backend:
  - Add an API endpoint that returns weekly summary metrics for the authenticated user.
- Mobile:
  - Add service/provider call to fetch and display weekly summary.

## Verification
- `flutter analyze` passes.
- Dashboard loads without jank; primary CTAs have >= 48dp touch targets.
- Weekly summary renders from API response (no hardcoded data).
