# BAIS App — Comprehensive Improvement Task

## Phase 1: Core Services & Theme Fixes
- [x] Read all existing files to understand state
- [ ] Fix dark theme issues — cards use hardcoded `Colors.white` instead of `AppTheme.card(context)` across all screens
- [ ] Update [app_theme.dart](file:///d:/Projects/BAIS/mobile/lib/theme/app_theme.dart) — add missing `PopupMenuButton`, `DropdownButton`, [Dialog](file:///d:/Projects/BAIS/mobile/lib/screens/profile_screen.dart#144-175), `AlertDialog` dark theming

## Phase 2: Auth & Login
- [ ] [auth_service.dart](file:///d:/Projects/BAIS/mobile/lib/services/auth_service.dart) — save login ID (not password) to SharedPreferences for auto-fill
- [ ] [auth_provider.dart](file:///d:/Projects/BAIS/mobile/lib/providers/auth_provider.dart) — add biometric auth methods using `local_auth`
- [ ] [login_screen.dart](file:///d:/Projects/BAIS/mobile/lib/screens/login_screen.dart) — complete rewrite: premium design, saved login ID auto-fill, functional biometric login (only shown if biometrics enrolled), professional polish

## Phase 3: Dashboard
- [ ] [dashboard_screen.dart](file:///d:/Projects/BAIS/mobile/lib/screens/dashboard_screen.dart) — add `RefreshIndicator` (pull-to-refresh) wrapping the scroll view
- [ ] Fix map: currently uses demo position, show real user location on map

## Phase 4: Schedule Screen
- [ ] [schedule_screen.dart](file:///d:/Projects/BAIS/mobile/lib/screens/schedule_screen.dart) — professional redesign: real flutter_map with branch location, shift data from API, clean card design with status indicators, use `AppTheme.card(context)` for dark theme

## Phase 5: History Screen
- [ ] Fix late detection: 8:00 AM should be on-time if shift starts at 8:00 AM. Fix to compare with exact shift start time. Currently `isLate` only checks `lateMinutes > 0` — need to verify backend logic
- [ ] Fix dark theme: cards use hardcoded `Colors.white` 
- [ ] Add `RefreshIndicator` pull-to-refresh

## Phase 6: Leave Screen
- [ ] [leave_screen.dart](file:///d:/Projects/BAIS/mobile/lib/screens/leave_screen.dart) — professional redesign: better form UX, improved date pickers with icons & calendar style, leave type icons, animated total days counter
- [ ] Fix dark theme: cards use hardcoded `Colors.white`
- [ ] Add `RefreshIndicator` pull-to-refresh

## Phase 7: Profile Screen — Full Rewrite
- [ ] Add profile image upload (image_picker package)
- [ ] Store profile image locally (flutter_secure_storage / path)
- [ ] Add biometric settings toggle: user enters password → if correct, enables biometric login
- [ ] Functional change password dialog (actually call API)
- [ ] Professional design with edit avatar button

## Phase 8: Bottom Nav Dark Theme Fix
- [ ] [main.dart](file:///d:/Projects/BAIS/mobile/lib/main.dart) — fix nav bar container color to use `AppTheme.card(context)`
- [ ] [_SummaryCard](file:///d:/Projects/BAIS/mobile/lib/screens/dashboard_screen.dart#597-646) in dashboard — fix `Colors.white` to `AppTheme.card(context)`

## Phase 9: Add image_picker dependency
- [ ] [pubspec.yaml](file:///d:/Projects/BAIS/mobile/pubspec.yaml) — add `image_picker` dependency

## Phase 10: Verification
- [ ] Run `flutter analyze` to check for errors
- [ ] Build check
