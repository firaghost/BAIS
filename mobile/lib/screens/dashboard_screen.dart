import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../services/attendance_service.dart';
import '../models/attendance_log.dart';
import '../models/shift.dart';
import '../models/head_office_geofence.dart';
import '../models/holiday.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_surface.dart';
import '../widgets/app_header.dart';
import '../services/holiday_service.dart';
import '../services/notification_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Timer? _timer;
  StreamSubscription<Position>? _positionSubscription;
  Duration _timerDuration = Duration.zero;
  String _timerLabel = 'READY';
  final MapController _mapController = MapController();
  Position? _currentPosition;
  HeadOfficeGeoFence? _headOffice;
  double? _distanceMeters;
  Holiday? _todayHoliday;

  bool get _isSunday => DateTime.now().weekday == DateTime.sunday;

  bool get _isAttendanceBlockedForDay {
    if (!kReleaseMode) {
      return false;
    }

    return _isSunday || _todayHoliday != null;
  }

  String? get _attendanceBlockedReason {
    if (!_isAttendanceBlockedForDay) {
      return null;
    }

    if (_todayHoliday != null) {
      return 'Today is a holiday: ${_todayHoliday!.name}';
    }

    return 'Attendance is not allowed on Sunday';
  }

  double? get _radiusMeters {
    final r = _headOffice?.radiusMeters;
    if (r == null || r <= 0) return null;
    return r.toDouble();
  }

  ({String label, Color color}) _deriveStatusPill(
    AttendanceProvider attendance,
    Shift? shift,
  ) {
    if (attendance.isCheckedIn) {
      return (label: 'Working', color: AppTheme.warning);
    }

    if (shift == null) {
      return (label: 'No Shift', color: AppTheme.textLight(context));
    }

    final now = DateTime.now();
    final partsStart = shift.startTime.split(':');
    final start = DateTime(
      now.year,
      now.month,
      now.day,
      int.tryParse(partsStart[0]) ?? 0,
      int.tryParse(partsStart.length > 1 ? partsStart[1] : '0') ?? 0,
      int.tryParse(partsStart.length > 2 ? partsStart[2] : '0') ?? 0,
    );
    final grace = Duration(minutes: shift.graceMinutes);
    final lateFrom = start.add(grace);

    if (now.isBefore(start)) {
      return (label: 'Before Shift', color: AppTheme.success);
    }

    if (now.isBefore(lateFrom)) {
      return (label: 'On Time', color: AppTheme.success);
    }

    return (label: 'Late', color: AppTheme.error);
  }

  bool _isWithinWorkingHours(Shift shift) {
    final now = DateTime.now();

    final startParts = shift.startTime.split(':');
    final endParts = shift.endTime.split(':');

    final start = DateTime(
      now.year,
      now.month,
      now.day,
      int.tryParse(startParts[0]) ?? 0,
      int.tryParse(startParts.length > 1 ? startParts[1] : '0') ?? 0,
      int.tryParse(startParts.length > 2 ? startParts[2] : '0') ?? 0,
    );
    var end = DateTime(
      now.year,
      now.month,
      now.day,
      int.tryParse(endParts[0]) ?? 0,
      int.tryParse(endParts.length > 1 ? endParts[1] : '0') ?? 0,
      int.tryParse(endParts.length > 2 ? endParts[2] : '0') ?? 0,
    );

    if (end.isBefore(start)) {
      end = end.add(const Duration(days: 1));
    }

    final earliest = start.subtract(const Duration(minutes: 30));
    final latest = end.add(const Duration(minutes: 30));

    return !now.isBefore(earliest) && !now.isAfter(latest);
  }

  double? get _accuracyMeters {
    final a = _currentPosition?.accuracy;
    if (a == null || a <= 0) return null;
    return a;
  }

  @override
  void initState() {
    super.initState();
    _loadData();
    _startCountdown();
    _startLocationTracking();
    _loadHeadOfficeGeoFence();
    _loadHoliday();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _positionSubscription?.cancel();
    super.dispose();
  }

  void _loadData() {
    final attendance = context.read<AttendanceProvider>();
    attendance.loadShifts();
    attendance.loadHistory();
    // Always fetch today's log separately for accurate check-in state
    attendance.loadTodayLog();
    attendance.loadWeeklySummary();
  }

  Future<void> _loadHoliday() async {
    try {
      final holiday = await HolidayService().getTodayHoliday(countryCode: 'ET');
      if (!mounted) return;
      setState(() => _todayHoliday = holiday);

      if (holiday != null) {
        await NotificationService().notifyHolidayToday(holiday);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _todayHoliday = null);
    }
  }

  Future<void> _loadHeadOfficeGeoFence() async {
    try {
      final service = AttendanceService();
      final geo = await service.getHeadOfficeGeoFence();
      if (!mounted) return;
      if (geo.latitude.abs() < 0.000001 && geo.longitude.abs() < 0.000001) {
        setState(() {
          _headOffice = null;
          _distanceMeters = null;
        });
        return;
      }

      setState(() => _headOffice = geo);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _mapController.move(LatLng(geo.latitude, geo.longitude), 17.0);
      });
      _recomputeDistance();
    } catch (_) {}
  }

  Future<void> _onRefresh() async {
    final attendance = context.read<AttendanceProvider>();
    await Future.wait([
      attendance.loadShifts(),
      attendance.loadHistory(),
      attendance.loadTodayLog(),
      attendance.loadWeeklySummary(),
      _refreshCurrentLocation(),
      _loadHeadOfficeGeoFence(),
      _loadHoliday(),
    ]);
  }

  Future<Position?> _getFreshPosition({
    Duration timeout = const Duration(seconds: 8),
    double desiredAccuracyMeters = 60,
  }) async {
    final hasAccess = await _ensureLocationAccess();
    if (!hasAccess) return null;

    Position? best;
    StreamSubscription<Position>? sub;
    final completer = Completer<Position?>();
    Timer? timer;

    void finish(Position? pos) {
      if (completer.isCompleted) return;
      completer.complete(pos);
    }

    try {
      try {
        best = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
          ),
        );
      } catch (_) {}

      sub =
          Geolocator.getPositionStream(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
              distanceFilter: 0,
            ),
          ).listen((pos) {
            if (best == null || pos.accuracy < best!.accuracy) {
              best = pos;
            }

            if (pos.accuracy <= desiredAccuracyMeters) {
              finish(pos);
            }
          });

      timer = Timer(timeout, () => finish(best));
      return await completer.future;
    } finally {
      timer?.cancel();
      await sub?.cancel();
    }
  }

  void _startCountdown() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final attendance = context.read<AttendanceProvider>();
      final now = DateTime.now();

      if (attendance.isCheckedIn) {
        if (attendance.todayLog?.checkInTime != null) {
          final checkInTimeString = attendance.todayLog!.checkInTime!;

          final parsed = AttendanceLog.parseServerDateTime(checkInTimeString);
          if (parsed != null) {
            final checkInTime = parsed.toLocal();
            setState(() {
              _timerDuration = now.difference(checkInTime);
              _timerLabel = 'WORKED';
            });
            return;
          }
        } else {
          setState(() {
            _timerDuration = Duration.zero;
            _timerLabel = 'WORKED';
          });
          return;
        }
      }

      final shift = attendance.currentShift;
      if (shift != null) {
        final parts = shift.startTime.split(':');
        final shiftStart = DateTime(
          now.year,
          now.month,
          now.day,
          int.tryParse(parts[0]) ?? 8,
          int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 30,
        );

        setState(() {
          if (now.isBefore(shiftStart)) {
            _timerDuration = shiftStart.difference(now);
            _timerLabel = 'TO START';
          } else {
            _timerDuration = Duration.zero;
            _timerLabel = 'READY';
          }
        });
        return;
      }

      setState(() {
        _timerDuration = Duration.zero;
        _timerLabel = 'NO SHIFT';
      });
    });
  }

  Future<bool> _ensureLocationAccess() async {
    try {
      final isEnabled = await Geolocator.isLocationServiceEnabled();
      if (!isEnabled) {
        return false;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return false;
      }

      return true;
    } catch (_) {
      return false;
    }
  }

  void _startLocationTracking() async {
    final hasAccess = await _ensureLocationAccess();
    if (!hasAccess) return;

    final last = await Geolocator.getLastKnownPosition();
    if (last != null && mounted) {
      setState(() => _currentPosition = last);
      _recomputeDistance();
    }

    await _positionSubscription?.cancel();
    _positionSubscription =
        Geolocator.getPositionStream(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.bestForNavigation,
            distanceFilter: 2,
          ),
        ).listen((pos) {
          if (!mounted) return;
          setState(() {
            _currentPosition = pos;
          });

          _mapController.move(LatLng(pos.latitude, pos.longitude), 16.0);
          _recomputeDistance();
        });
  }

  Future<void> _refreshCurrentLocation() async {
    try {
      final position = await _getFreshPosition();
      if (position == null) return;

      if (!mounted) return;
      setState(() => _currentPosition = position);
      _recomputeDistance();
    } catch (_) {}
  }

  void _recomputeDistance() {
    if (_currentPosition == null || _headOffice == null) {
      setState(() => _distanceMeters = null);
      return;
    }

    final d = const Distance().as(
      LengthUnit.Meter,
      LatLng(_headOffice!.latitude, _headOffice!.longitude),
      LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
    );

    setState(() => _distanceMeters = d);
  }

  bool get _isInRange {
    final dist = _distanceMeters;
    final radius = _radiusMeters;
    if (dist == null || radius == null) {
      return false;
    }

    final accuracy = _accuracyMeters ?? 0;
    final effectiveRadius = radius + accuracy;
    return dist <= effectiveRadius;
  }

  void _handleCheckIn() async {
    final attendance = context.read<AttendanceProvider>();

    final isDevMode = !kReleaseMode;

    if (!isDevMode && _isAttendanceBlockedForDay) {
      if (!mounted) return;
      final msg =
          _attendanceBlockedReason ?? 'Attendance is not allowed today.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      return;
    }

    final shift = attendance.currentShift;
    if (!isDevMode && shift != null && !_isWithinWorkingHours(shift)) {
      _showSnack('Check-in is only allowed during working hours.', false);
      return;
    }

    final fresh = await _getFreshPosition(
      timeout: const Duration(seconds: 10),
      desiredAccuracyMeters: 60,
    );
    if (fresh != null && mounted) {
      setState(() => _currentPosition = fresh);
    }
    _recomputeDistance();

    if (_currentPosition == null) {
      _showSnack(
        'Unable to get your current location. Please try again.',
        false,
      );
      return;
    }

    final accuracy = _accuracyMeters;
    if (accuracy != null && accuracy > 80) {
      _showSnack(
        'Location accuracy is low (±${accuracy.toStringAsFixed(0)} m). Move to an open area and try again.',
        false,
      );
      return;
    }

    if (!isDevMode && !_isInRange) {
      _showSnack('You are currently outside the Head Office geo-fence.', false);
      return;
    }

    final success = await attendance.checkIn(
      latitude: _currentPosition!.latitude,
      longitude: _currentPosition!.longitude,
    );

    if (mounted) {
      _showSnack(
        success
            ? 'Checked in successfully!'
            : (attendance.error ?? 'Check-in failed'),
        success,
      );
    }
  }

  void _handleCheckOut() async {
    final isDevMode = !kReleaseMode;
    if (!isDevMode && _isAttendanceBlockedForDay) {
      if (!mounted) return;
      final msg =
          _attendanceBlockedReason ?? 'Attendance is not allowed today.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(
            horizontal: 20,
            vertical: 24,
          ),
          child: GlassSurface(
            borderRadius: BorderRadius.circular(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Confirm Check Out',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textPrimary(context),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Are you sure you want to check out now?',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary(context),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppTheme.error,
                        ),
                        child: const Text('Check Out'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );

    if (confirmed != true || !mounted) return;

    // Read provider before any async gap
    final attendance = context.read<AttendanceProvider>();

    final success = await attendance.checkOut();
    if (mounted) {
      _showSnack(
        success
            ? 'Checked out successfully!'
            : (attendance.error ?? 'Check-out failed'),
        success,
      );
    }
  }

  void _showSnack(String msg, bool ok) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              ok ? Icons.check_circle_outline : Icons.error_outline,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(msg)),
          ],
        ),
        backgroundColor: ok ? AppTheme.success : AppTheme.error,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final user = auth.user;
    final shift = attendance.currentShift;
    final pill = _deriveStatusPill(attendance, shift);
    final displayName = user?.employee?.fullName ?? user?.name ?? 'Employee';
    final jobTitle = user?.employee?.jobTitle ?? 'Employee';

    return Scaffold(
      backgroundColor: AppTheme.background(context),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _onRefresh,
          color: AppTheme.primaryBlue,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                // App Bar
                const AppHeader(title: 'Dashboard'),
                const SizedBox(height: 16),

                // Greeting Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0B1120), Color(0xFF1E3A8A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryDark.withValues(alpha: 0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Good ${_getGreeting()},',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 16,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: pill.color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  pill.label,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        displayName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        jobTitle,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 14,
                        ),
                      ),
                      if (shift != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Shift starts at ${shift.formattedStartTime}',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                Builder(
                  builder: (context) {
                    final todayLog = attendance.todayLog;
                    final needsCheckOut =
                        todayLog != null && todayLog.checkOutTime == null;
                    final isWorking = needsCheckOut;
                    final isCompletedToday =
                        todayLog != null && todayLog.checkOutTime != null;
                    final isDevMode = !kReleaseMode;
                    final isBlocked = !isDevMode && _isAttendanceBlockedForDay;

                    if (shift == null) {
                      return Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppTheme.card(context),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.divider(context)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 14,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.access_time,
                                  color: AppTheme.primaryBlue,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Attendance',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w700,
                                          color: AppTheme.textPrimary(context),
                                        ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.card2(
                                      context,
                                    ).withValues(alpha: 0.55),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: AppTheme.divider(context),
                                    ),
                                  ),
                                  child: Text(
                                    isWorking ? 'Working' : 'Not Checked In',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppTheme.textSecondary(context),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            if (isBlocked) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.card2(
                                    context,
                                  ).withValues(alpha: 0.55),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: AppTheme.divider(context),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.event_busy,
                                      size: 16,
                                      color: AppTheme.textSecondary(context),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _attendanceBlockedReason ??
                                            'Attendance is not allowed today.',
                                        style: TextStyle(
                                          color: AppTheme.textSecondary(
                                            context,
                                          ),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                            ],
                            if (isWorking) ...[
                              Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      '${_timerDuration.inHours.toString().padLeft(2, '0')}:${(_timerDuration.inMinutes % 60).toString().padLeft(2, '0')}:${(_timerDuration.inSeconds % 60).toString().padLeft(2, '0')}',
                                      style: TextStyle(
                                        color: AppTheme.textPrimary(context),
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -0.5,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'WORKED',
                                      style: TextStyle(
                                        color: AppTheme.textSecondary(context),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 2.0,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                              if (isBlocked) ...[
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.card2(
                                      context,
                                    ).withValues(alpha: 0.55),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: AppTheme.divider(context),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.event_busy,
                                        size: 16,
                                        color: AppTheme.textSecondary(context),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          _attendanceBlockedReason ??
                                              'Attendance is not allowed today.',
                                          style: TextStyle(
                                            color: AppTheme.textSecondary(
                                              context,
                                            ),
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                              ],
                            ],
                            SizedBox(
                              height: 54,
                              child: ElevatedButton.icon(
                                onPressed:
                                    (attendance.isCheckingIn ||
                                        isBlocked ||
                                        (!isDevMode && isCompletedToday))
                                    ? null
                                    : needsCheckOut
                                    ? _handleCheckOut
                                    : _handleCheckIn,
                                icon: attendance.isCheckingIn
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Icon(
                                        needsCheckOut
                                            ? Icons.logout_rounded
                                            : Icons.login_rounded,
                                        size: 20,
                                      ),
                                label: Text(
                                  attendance.isCheckingIn
                                      ? (needsCheckOut
                                            ? 'Checking Out...'
                                            : 'Checking In...')
                                      : (!isDevMode && isCompletedToday)
                                      ? 'Completed for Today'
                                      : needsCheckOut
                                      ? 'Check Out'
                                      : 'Check In Now',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryBlue,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    final shiftLabel = 'Morning Shift';
                    final shiftRange =
                        '${shift.formattedStartTime} - ${shift.formattedEndTime}';

                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.card(context),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.divider(context)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.wb_sunny_outlined,
                                color: AppTheme.primaryBlue,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  shiftLabel,
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.textPrimary(context),
                                      ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.card2(
                                    context,
                                  ).withValues(alpha: 0.55),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: AppTheme.divider(context),
                                  ),
                                ),
                                child: Text(
                                  shiftRange,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textSecondary(context),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${_timerDuration.inHours.toString().padLeft(2, '0')}:${(_timerDuration.inMinutes % 60).toString().padLeft(2, '0')}',
                                      style: TextStyle(
                                        color: AppTheme.textPrimary(context),
                                        fontSize: 32,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -0.4,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _timerLabel,
                                      style: TextStyle(
                                        color: AppTheme.textSecondary(context),
                                        fontSize: 11,
                                        letterSpacing: 1.8,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (isWorking)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.success.withValues(
                                      alpha: 0.12,
                                    ),
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(
                                      color: AppTheme.success.withValues(
                                        alpha: 0.25,
                                      ),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        width: 6,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: AppTheme.success,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'ACTIVE',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: AppTheme.success,
                                          letterSpacing: 0.6,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          if (isBlocked) ...[
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.card2(
                                  context,
                                ).withValues(alpha: 0.55),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: AppTheme.divider(context),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.event_busy,
                                    size: 16,
                                    color: AppTheme.textSecondary(context),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _attendanceBlockedReason ??
                                          'Attendance is not allowed today.',
                                      style: TextStyle(
                                        color: AppTheme.textSecondary(context),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                          SizedBox(
                            width: double.infinity,
                            height: 54,
                            child: ElevatedButton.icon(
                              onPressed:
                                  (attendance.isCheckingIn ||
                                      isBlocked ||
                                      (!isDevMode && isCompletedToday))
                                  ? null
                                  : needsCheckOut
                                  ? _handleCheckOut
                                  : _handleCheckIn,
                              icon: attendance.isCheckingIn
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Icon(
                                      needsCheckOut
                                          ? Icons.logout_rounded
                                          : Icons.login_rounded,
                                      size: 20,
                                    ),
                              label: Text(
                                attendance.isCheckingIn
                                    ? 'Processing...'
                                    : needsCheckOut
                                    ? 'Check Out'
                                    : 'Check In Now',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryBlue,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),

                // Map Preview
                Container(
                  width: double.infinity,
                  height: 210,
                  decoration: BoxDecoration(
                    color: AppTheme.card(context),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.divider(context)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    children: [
                      if (_currentPosition != null)
                        FlutterMap(
                          mapController: _mapController,
                          options: MapOptions(
                            initialCenter: LatLng(
                              _currentPosition!.latitude,
                              _currentPosition!.longitude,
                            ),
                            initialZoom: 16.0,
                            interactionOptions: const InteractionOptions(
                              flags: InteractiveFlag.none,
                            ),
                          ),
                          children: [
                            TileLayer(
                              urlTemplate:
                                  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                              userAgentPackageName: 'com.sdb.attendance',
                            ),
                            if (_headOffice != null && _radiusMeters != null)
                              CircleLayer(
                                circles: [
                                  CircleMarker(
                                    point: LatLng(
                                      _headOffice!.latitude,
                                      _headOffice!.longitude,
                                    ),
                                    color: AppTheme.primaryBlue.withValues(
                                      alpha: 0.12,
                                    ),
                                    borderColor: AppTheme.primaryBlue
                                        .withValues(alpha: 0.55),
                                    borderStrokeWidth: 2,
                                    useRadiusInMeter: true,
                                    radius: _radiusMeters!,
                                  ),
                                ],
                              ),
                            MarkerLayer(
                              markers: [
                                if (_headOffice != null)
                                  Marker(
                                    point: LatLng(
                                      _headOffice!.latitude,
                                      _headOffice!.longitude,
                                    ),
                                    width: 40,
                                    height: 40,
                                    child: Icon(
                                      Icons.location_pin,
                                      color: AppTheme.primaryBlue,
                                      size: 38,
                                    ),
                                  ),
                                Marker(
                                  point: LatLng(
                                    _currentPosition!.latitude,
                                    _currentPosition!.longitude,
                                  ),
                                  width: 40,
                                  height: 40,
                                  child: Icon(
                                    Icons.location_pin,
                                    color: AppTheme.info,
                                    size: 38,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        )
                      else
                        Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircularProgressIndicator(
                                color: AppTheme.primaryBlue,
                                strokeWidth: 2,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Loading map...',
                                style: TextStyle(
                                  color: AppTheme.textLight(context),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),

                      Positioned.fill(
                        child: IgnorePointer(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.transparent,
                                  Colors.black.withValues(alpha: 0.55),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                      Positioned(
                        left: 12,
                        right: 12,
                        bottom: 44,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Current Location',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.85),
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.28),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.16),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: _isInRange
                                          ? AppTheme.success
                                          : AppTheme.error,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    _distanceMeters == null
                                        ? '--'
                                        : '${_distanceMeters!.toStringAsFixed(0)}m',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  if (_accuracyMeters != null) ...[
                                    Text(
                                      '  •  ±${_accuracyMeters!.toStringAsFixed(0)}m',
                                      style: TextStyle(
                                        color: Colors.white.withValues(
                                          alpha: 0.85,
                                        ),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          color: Colors.black.withValues(alpha: 0.22),
                          child: Row(
                            children: [
                              Container(
                                width: 26,
                                height: 26,
                                decoration: BoxDecoration(
                                  color:
                                      (_isInRange
                                              ? AppTheme.success
                                              : AppTheme.error)
                                          .withValues(alpha: 0.18),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _isInRange
                                      ? Icons.gps_fixed
                                      : Icons.gps_not_fixed,
                                  size: 16,
                                  color: _isInRange
                                      ? AppTheme.success
                                      : AppTheme.error,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text(
                                _isInRange
                                    ? 'Within Perimeter'
                                    : 'Outside Perimeter',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                (_accuracyMeters != null &&
                                        _accuracyMeters! <= 35)
                                    ? 'GPS Signal Strong'
                                    : 'GPS Signal Weak',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.85),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                Text(
                  'Weekly Summary',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary(context),
                  ),
                ),
                const SizedBox(height: 12),
                Builder(
                  builder: (context) {
                    final summary = attendance.weeklySummary;
                    final isLoading = attendance.isWeeklySummaryLoading;

                    final hoursText = summary != null
                        ? '${summary.workedHours.toStringAsFixed(1)}h'
                        : isLoading
                        ? '--'
                        : '—';

                    final daysText = summary != null
                        ? '${summary.daysPresent}/${summary.daysTotal}'
                        : isLoading
                        ? '--'
                        : '—';

                    return Row(
                      children: [
                        Expanded(
                          child: _SummaryCard(
                            icon: Icons.access_time,
                            value: hoursText,
                            label: 'Hours Worked',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _SummaryCard(
                            icon: Icons.calendar_today,
                            value: daysText,
                            label: 'Days Present',
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }
}

class _SummaryCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _SummaryCard({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card(context),
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppTheme.primaryBlue, size: 24),
          const SizedBox(height: 12),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary(context),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppTheme.textSecondary(context),
            ),
          ),
        ],
      ),
    );
  }
}
