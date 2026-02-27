---
description: System Users (Create + Role Assignment + Scope)
---

## Goal
Add a new Super Admin page to create system users and assign roles (HR Admin, Branch Manager, Payroll Officer, Executive Viewer, Super Admin) with an access scope (global/regional/branch), matching the provided HTML design, and wire it to backend APIs.

## Milestones
1. Backend: Provide APIs for system user creation + role assignment + access scope persistence, protected by permissions.
2. Frontend: Add new SPA route `/system-users` and sidebar entry for Super Admins; implement the page UI with the provided design.
3. Integration: Wire UI to APIs (load roles/branches, create user, assign role + scope), handle loading/errors.
4. Verification: Manual smoke test (create user, assign role, scope), ensure authorization is enforced.
