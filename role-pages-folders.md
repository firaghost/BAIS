---
description: Move role pages into superadmin/hradmin folders
---

## Goal
Create simple per-role page folders:
- `resources/js/spa/ui/pages/superadmin/`
- `resources/js/spa/ui/pages/hradmin/`

Put the already-built role pages behind these folder entrypoints and wire routing so:
- Super Admin lands on `/super-admin/dashboard`
- HR Admin pages can live under `/hr-admin/*`

## Decisions
- Keep role pages as thin wrapper components (to avoid duplicating large pages during re-org).
- Update routes and nav to point to `/super-admin/*`.

## Deliverables
- Super Admin dashboard wrapper in `pages/superadmin/DashboardPage.jsx`.
- HR Admin dashboard + attendance wrappers in `pages/hradmin/`.
- `App.jsx` routes use wrapper pages.
- `LoginPage.jsx` forces Super Admin to `/super-admin/dashboard` after login.
