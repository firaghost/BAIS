# Phase 2 — Attendance Engine

## Goal
Implement Attendance Engine modules per FLOW.MD:
- Branches (geo fence settings)
- GeoFenceValidationService (Haversine)
- Shifts
- Attendance Logs

## Milestones
1. Branches module scaffold (migration, model, service, controller, request, policy, routes) + RBAC permissions.
2. GeoFenceValidationService + unit tests.
3. Shifts module scaffold + RBAC permissions.
4. Attendance Logs rules implementation + indexes + RBAC permissions.

## Notes
- All endpoints must be protected.
- All state changes must be audited.
- No business logic in controllers.

$token = "14|PoLSY1ipipajqMvWujK6rrykYBYGF7phxOZRmpSSf5d9454d"
$headers = @{
  Accept = "application/json"
  Authorization = "Bearer $token"
}
$body = @{
  first_name = "Firagos"
  middle_name = "Nuredin"
  last_name = "Ashu"
  hire_date = "2025-03-24"
  phone = $null
  email = $null
  branch_id = 1
  job_title = "junior Full Stack devoper"
  department = "IT"
  status = "active"
} | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/employees" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body