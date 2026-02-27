---
description: Migrate attendance to single Head Office geofence and switch segmentation from branches to departments.
---

# Objectives

- Replace branch-based attendance with a single configurable **Head Office geofence** (strict blocking outside radius).
- Keep **branches in DB** but hide/stop using them across UI and filters.
- Introduce a first-class **Departments** entity (table + CRUD) and make departments the primary segmentation.
- Preserve system operability during transition (backward compatible where needed).

# Decisions (confirmed)

- Branches remain in DB but are hidden/not used across the app.
- Departments are stored in a dedicated table and are manageable by HR Admin.
- Head Office default geofence:
  - lat: 8.992709629807115
  - lng: 38.758933676855925
  - radius_meters: 50
- Strict blocking when outside geofence.

# Milestones

## 1) Database foundation

- Add `departments` table.
- Add nullable `employees.department_id` FK (keep existing `employees.department` for backward compatibility).
- Add migrations to support Head Office geofence in `system_settings` (stored under a new key).

## 2) Backend APIs

- Settings:
  - Add `GET/PUT /api/settings/head-office-geo` protected by `permission:settings.manage`.
  - Update `SystemSettingsService` to support new key with defaults.
- Departments:
  - Add `GET/POST/PUT/DELETE /api/departments` with permissions (manage for HR Admin).
- Attendance:
  - Update check-in/check-out requests to remove `branch_id` requirement.
  - Update attendance services to validate geofence against Head Office settings only.
  - Keep existing attendance_log schema for now, but stop requiring branch_id from client.

## 3) Frontend updates

- Hide branch usage and remove branch selectors/filters from Employees/Attendance/Reports/Dashboards.
- Add departments management UI (or integrate into existing pages) and switch employee forms/filters to department.
- Update attendance UI to send only lat/lng for check-in and to display "Head Office" in place of branch.

## 4) Validation

- Verify HR Admin can manage departments.
- Verify employee check-in/out is blocked outside Head Office radius.
- Verify branch pages/filters are hidden but DB remains intact.
- Run targeted lint/build checks.
