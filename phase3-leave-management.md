# Phase 3 — Leave Management

## Goal
Implement Leave Management module per FLOW.MD:
- Leave Requests table (user_id, leave_type, start_date, end_date, status, approved_by)
- Approval workflow: Employee → Branch Manager → HR
- Audit logging for state transitions
- Leave balance calculation service

## Milestones
1. Leave Requests table migration + model
2. Leave Request service (create, approve, reject, list) + balance calculation
3. Leave Request controller + Form Requests + policy + routes
4. RBAC permissions (leaves.view, leaves.request, leaves.approve, leaves.manage) seeded

## Notes
- All endpoints must be protected
- All state changes must be audited
- No business logic in controllers
