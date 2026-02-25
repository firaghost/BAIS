# Phase 5 — Employees Directory (HR Master Data)

## Goal
Create an Employees module separate from system Users:
- `users` = system accounts (login/RBAC/audit actors)
- `employees` = HR master records (Sidama Bank employees)

## Requirements
- Employee record can exist without a system user account (`user_id` nullable)
- Auto employee code: `SDB-001-2026` (prefix + sequence + join year)
- Store employee photo as local storage path (`photo_path`)

## Milestones
1. Migration + model
2. EmployeeService (create/update + code generator + photo upload)
3. Controller + requests + policy + routes
4. RBAC permissions seeded (employees.view, employees.manage)

## Notes
- All endpoints must be protected
- All state changes must be audited
- No business logic in controllers
