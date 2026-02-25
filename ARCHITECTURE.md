# Banking Attendance Intelligence System (BAIS)

## Architecture
- Style: Modular Monolith (Laravel 11)
- Database: MySQL (strict mode)
- Queue: database driver
- Cache: database store (can be swapped to Redis later)

## Module boundaries
Application code is organized under `app/Modules/<ModuleName>`.
Each module may contain:
- `Controllers/` (thin, no business logic)
- `Requests/` (FormRequest validation)
- `Policies/` (policy-based authorization)
- `Services/` (business logic)
- `Models/` (Eloquent models; may also live in `app/Models` if shared)
- `routes.php` (module routes, loaded centrally)

## Cross-cutting concerns
- Authorization: Policies + role/permission middleware
- Audit: append-only audit logs for all state changes
- Security: server-side validation; never trust client data
