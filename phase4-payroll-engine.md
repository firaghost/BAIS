# Phase 4 — Payroll Engine

## Goal
Implement Payroll Engine per FLOW.MD:
- Payroll records derived from attendance_logs
- Late deduction: first 30 minutes free per month
- Overtime tracked for reporting only
- Work days based on scheduled shift days (fallback to attendance days if no schedule)
- CSV export
- Full audit trail for generation and exports

## Milestones
1. Migrations: payroll_records + optional user_shift_schedules
2. PayrollCalculationService (month-based aggregates)
3. Payroll endpoints: generate, list, export CSV
4. RBAC permissions (payroll.view, payroll.generate, payroll.export) seeded

## Notes
- All endpoints must be protected
- All state changes must be audited
- No business logic in controllers
