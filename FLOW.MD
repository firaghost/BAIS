I WILL GIVE YOU THE PAGE DESIGNS IN HTML SO JUST THE BACKEND AND FOR THE FRONTEND JUST PLACE HOLDERS

You are a senior software architect building a production-grade Banking Attendance Intelligence System.

This system is developed by a solo developer in a bank environment.
Hosting: cPanel or IIS.
Database: MySQL.
Backend: Laravel 11.
Web Frontend: React.
Mobile App: Flutter.
Architecture style: Modular Monolith.
No microservices.

Your job is to build this system phase by phase, module by module.
Never generate everything at once.
Work incrementally.
Each phase must be production-ready before moving forward.

Follow SOLID principles.
Keep business logic in Service classes.
Use Policy-based authorization.
Use Middleware for cross-cutting concerns.
Add indexes and foreign key constraints.
Never skip security validation.
Audit every state-changing action.

------------------------------------------------------------
PHASE 0 — FOUNDATION
------------------------------------------------------------

1. Initialize Laravel 11 project.
2. Configure MySQL with strict mode enabled.
3. Setup environment configuration.
4. Configure queue (database driver).
5. Enable caching.
6. Create modular folder structure:

app/
 ├── Modules/
 │   ├── Auth/
 │   ├── Users/
 │   ├── Roles/
 │   ├── Branches/
 │   ├── Shifts/
 │   ├── Attendance/
 │   ├── Leaves/
 │   ├── Payroll/
 │   └── Audit/

For each module generate:
- Migration
- Model
- Service
- Controller
- Form Request validation
- Policy
- API Routes

Do not place business logic inside controllers.

------------------------------------------------------------
PHASE 1 — SECURITY & RBAC
------------------------------------------------------------

Implement full Role-Based Access Control.

Create tables:
- roles
- permissions
- role_permission
- user_role

Seed default roles:
- Super Admin
- HR Admin
- Branch Manager
- Payroll Officer
- Executive Viewer
- Employee

Create middleware:
- CheckRole
- CheckPermission

Ensure:
- All endpoints are protected
- Role-based page access
- Permission-based action control

------------------------------------------------------------
DEVICE BINDING SYSTEM
------------------------------------------------------------

Create devices table:
- id
- user_id
- device_identifier
- device_name
- is_active
- created_at

On first login:
- Bind device to user
- Reject login from unregistered devices
- Allow admin override (audit logged)

------------------------------------------------------------
AUDIT LOG SYSTEM
------------------------------------------------------------

Create audit_logs table:
- id
- user_id
- action
- model_type
- model_id
- old_values (json)
- new_values (json)
- ip_address
- created_at

Implement middleware to automatically log:
- Create
- Update
- Delete
- Approvals
- Overrides

Audit logs must be append-only.

------------------------------------------------------------
PHASE 2 — ATTENDANCE ENGINE
------------------------------------------------------------

BRANCHES TABLE:
- id
- name
- latitude
- longitude
- radius_meters

Implement GeoFenceValidationService.
Use Haversine formula.
Validate server-side only.

SHIFTS TABLE:
- id
- branch_id
- start_time
- end_time
- grace_minutes
- overtime_threshold

ATTENDANCE_LOGS TABLE:
- id
- user_id
- branch_id
- check_in_time
- check_out_time
- late_minutes
- overtime_minutes
- status
- created_at

Rules:
- Prevent duplicate check-in
- Prevent check-out without check-in
- Validate shift window
- Calculate late minutes
- Calculate overtime
- Store server authoritative timestamp

Add composite indexes:
- (user_id, date)
- (branch_id, date)

------------------------------------------------------------
PHASE 3 — LEAVE MANAGEMENT
------------------------------------------------------------

LEAVE_REQUESTS TABLE:
- id
- user_id
- leave_type
- start_date
- end_date
- status (pending, approved, rejected)
- approved_by
- created_at

Implement approval workflow:
Employee → Branch Manager → HR

Log every state transition in audit_logs.

Add leave balance calculation service.

------------------------------------------------------------
PHASE 4 — PAYROLL ENGINE
------------------------------------------------------------

PAYROLL_RECORDS TABLE:
- id
- user_id
- month
- total_work_days
- total_late_minutes
- total_overtime_minutes
- deduction_amount
- created_at

Create PayrollCalculationService.

Rules:
- Calculate from attendance_logs
- Do not allow manual modification without audit
- Provide CSV export endpoint
- Read-only adjustments only via HR role

------------------------------------------------------------
PHASE 5 — WEB ADMIN DASHBOARD (React)
------------------------------------------------------------

Implement role-based UI rendering.

Roles:
- Super Admin
- HR Admin
- Branch Manager
- Payroll Officer
- Executive Viewer

Features:
- Dashboard per role
- Attendance management table
- Leave approval interface
- Payroll export interface
- Audit log viewer
- Branch geo-fence map management
- Role-based sidebar rendering
- Page-level permission guards

No business logic in frontend.

------------------------------------------------------------
PHASE 6 — MOBILE APP (Flutter)
------------------------------------------------------------

Employee-only app.

Features:
- JWT login
- Secure token storage
- Device binding validation
- GPS validation before check-in
- Check-in/out
- Attendance history
- Leave request submission
- Leave balance view
- Correction request

Security:
- Prevent mock location usage
- Validate server timestamp
- Block duplicate submissions
- Handle offline retry carefully

------------------------------------------------------------
PHASE 7 — HARDENING & OPTIMIZATION
------------------------------------------------------------

- Add database indexes
- Optimize queries
- Implement caching for reports
- Add rate limiting
- Add request throttling
- Perform permission audit
- Simulate fraud scenarios
- Test concurrency on check-in endpoint

------------------------------------------------------------

GLOBAL RULES:

- Never skip validation.
- Never trust client data.
- Never expose payroll modification endpoints publicly.
- Every override requires justification.
- Every change must be logged.
- Keep system modular.
- Keep logic inside services.
- Build incrementally.
- Do not move to next phase until current phase is stable.

Build for compliance.
Build for auditability.
Build for political safety.
Build for long-term maintainability.