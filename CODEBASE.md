# CODEBASE

## File Dependencies
This section documents key dependency relationships that must be reviewed before modifying files.

### Backend (Laravel)
- `routes/api.php`
  - Loads all module API routes.
- `app/Providers/`
  - Registers module route loading and shared services.
- `config/database.php`
  - DB connection behavior (strict mode, engine, options).
- `app/Http/Kernel.php`
  - Global and route middleware registration.

### Frontend (React)
- Placeholder only for now.

### Mobile (Flutter)
- Placeholder only for now.
