import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../services/attendance_service.dart';
import '../models/head_office_geofence.dart';
import '../theme/app_theme.dart';
import 'notifications_screen.dart';

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

  double? get _radiusMeters {
    final r = _headOffice?.radiusMeters;
    if (r == null || r <= 0) return null;
    return r.toDouble();
  }

  double? get _accuracyMeters {
    final a = _currentPosition?.accuracy;
    if (a == null || a <= 0) return null;
    return a;
  }

  String _formatDistance(double meters) {
    if (meters >= 1000) {
      return '${(meters / 1000).toStringAsFixed(1)} km';
    }
    return '${meters.toStringAsFixed(0)} m';
  }

  @override
  void initState() {
    super.initState();
    _loadData();
    _startCountdown();
    _startLocationTracking();
    _loadHeadOfficeGeoFence();
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
      _recomputeDistance();
    } catch (_) {}
  }

  Future<void> _onRefresh() async {
    final attendance = context.read<AttendanceProvider>();
    await Future.wait([
      attendance.loadShifts(),
      attendance.loadHistory(),
      _refreshCurrentLocation(),
      _loadHeadOfficeGeoFence(),
    ]);
  }

  Future<Position?> _getFreshPosition({
    Duration timeout = const Duration(seconds: 12),
    double desiredAccuracyMeters = 35,
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
            accuracy: LocationAccuracy.bestForNavigation,
          ),
        );
      } catch (_) {}

      sub =
          Geolocator.getPositionStream(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.bestForNavigation,
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
          // Combine today with the parsed time to formulate a proper DateTime object
          final parts = checkInTimeString.split(':');
          if (parts.length >= 2) {
            final checkInTime = DateTime(
              now.year,
              now.month,
              now.day,
              int.tryParse(parts[0]) ?? now.hour,
              int.tryParse(parts[1]) ?? now.minute,
              parts.length > 2 ? (int.tryParse(parts[2]) ?? 0) : 0,
            );
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
            distanceFilter: 5,
          ),
        ).listen((pos) {
          if (!mounted) return;
          setState(() => _currentPosition = pos);
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

    final fresh = await _getFreshPosition(
      timeout: const Duration(seconds: 14),
      desiredAccuracyMeters: 35,
    );
    if (fresh != null && mounted) {
      setState(() => _currentPosition = fresh);
      _recomputeDistance();
    }

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

    if (!_isInRange) {
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
    final attendance = context.read<AttendanceProvider>();

    await _refreshCurrentLocation();

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
    final firstName = user?.employee?.firstName ?? user?.name ?? 'Employee';
    final lastInitial = user?.employee?.lastName.isNotEmpty == true
        ? '.${user!.employee!.lastName[0]}'
        : '';
    final jobTitle = user?.employee?.jobTitle ?? 'Employee';
    final hasProfileImage =
        auth.profileImagePath != null && auth.profileImagePath!.isNotEmpty;

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
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppTheme.primaryBlue,
                      backgroundImage: hasProfileImage
                          ? FileImage(File(auth.profileImagePath!))
                          : null,
                      child: hasProfileImage
                          ? null
                          : Text(
                              firstName.isNotEmpty
                                  ? firstName[0].toUpperCase()
                                  : 'E',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Dashboard',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary(context),
                      ),
                    ),
                    const Spacer(),
                    Stack(
                      children: [
                        IconButton(
                          icon: Icon(
                            Icons.notifications_outlined,
                            color: AppTheme.textPrimary(context),
                          ),
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const NotificationsScreen(),
                            ),
                          ),
                        ),
                        Positioned(
                          right: 8,
                          top: 8,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppTheme.error,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Greeting Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF303F9F), Color(0xFF3949AB)],
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
                            jobTitle,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 14,
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
                                    color: attendance.isCheckedIn
                                        ? AppTheme.warning
                                        : AppTheme.success,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  attendance.isCheckedIn
                                      ? 'Working'
                                      : 'On Time',
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
                        'Good ${_getGreeting()},',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        '$firstName$lastInitial',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        shift != null
                            ? 'Your shift starts at ${shift.formattedStartTime}'
                            : 'No shift assigned today',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Shift Info
                if (shift != null) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Morning Shift',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary(context),
                            ),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        '${shift.formattedStartTime} - ${shift.formattedEndTime}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.textSecondary(context),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],

                // Countdown Timer
                Center(
                  child: SizedBox(
                    width: 160,
                    height: 160,
                    child: CustomPaint(
                      painter: _CountdownPainter(
                        progress:
                            _timerLabel == 'WORKED' ||
                                _timerDuration.inSeconds > 0
                            ? min(1.0, _timerDuration.inSeconds / 3600.0)
                            : 0.0,
                        dividerColor: AppTheme.divider(context),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              !(_timerDuration.inSeconds == 0 &&
                                      _timerLabel == 'NO SHIFT')
                                  ? '${_timerDuration.inHours.toString().padLeft(2, '0')}:${(_timerDuration.inMinutes % 60).toString().padLeft(2, '0')}:${(_timerDuration.inSeconds % 60).toString().padLeft(2, '0')}'
                                  : '00:00:00',
                              style: Theme.of(context).textTheme.headlineMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textPrimary(context),
                                  ),
                            ),
                            Text(
                              _timerLabel,
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    color: AppTheme.textSecondary(context),
                                    letterSpacing: 1.5,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Check In/Out Button
                Center(
                  child: SizedBox(
                    width: 220,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: attendance.isCheckingIn
                          ? null
                          : attendance.isCheckedIn
                          ? _handleCheckOut
                          : _handleCheckIn,
                      icon: Icon(
                        attendance.isCheckedIn ? Icons.logout : Icons.login,
                        size: 20,
                      ),
                      label: Text(
                        attendance.isCheckingIn
                            ? 'Processing...'
                            : attendance.isCheckedIn
                            ? 'Check Out'
                            : 'Check In',
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: attendance.isCheckedIn
                            ? AppTheme.warning
                            : AppTheme.primaryBlue,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Map Preview
                Container(
                  width: double.infinity,
                  height: 200,
                  decoration: BoxDecoration(
                    color: AppTheme.card(context),
                    borderRadius: BorderRadius.circular(16),
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
                              flags:
                                  InteractiveFlag.all & ~InteractiveFlag.rotate,
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
                                    color: AppTheme.primaryBlue.withValues(alpha: 0.15),
                                    borderColor: AppTheme.primaryBlue.withValues(alpha: 0.5),
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
                                      Icons.business,
                                      color: AppTheme.primaryBlue,
                                      size: 32,
                                    ),
                                  ),
                                Marker(
                                  point: LatLng(
                                    _currentPosition!.latitude,
                                    _currentPosition!.longitude,
                                  ),
                                  width: 40,
                                  height: 40,
                                  child: Center(
                                    child: Container(
                                      width: 18,
                                      height: 18,
                                      decoration: BoxDecoration(
                                        color: Colors.blue,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                            color: Colors.white, width: 3),
                                        boxShadow: const [
                                          BoxShadow(
                                            color: Colors.black26,
                                            blurRadius: 4,
                                          ),
                                        ],
                                      ),
                                    ),
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
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.3),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 12,
                        bottom: 12,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_headOffice != null)
                              Container(
                                margin: const EdgeInsets.only(bottom: 6),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.business,
                                      color: AppTheme.primaryBlue,
                                      size: 14,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Head Office',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.w600,
                                            color: Colors.black87,
                                            fontSize: 11,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 10,
                                    height: 10,
                                    decoration: BoxDecoration(
                                      color: Colors.blue,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                          color: AppTheme.primaryBlue,
                                          width: 2),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'You are here',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(
                                          fontWeight: FontWeight.w600,
                                          color: Colors.black87,
                                          fontSize: 11,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Positioned(
                        right: 8,
                        bottom: 8,
                        child: FloatingActionButton.small(
                          heroTag: 'recenter_dash_map',
                          backgroundColor: Colors.white,
                          onPressed: () {
                            if (_currentPosition != null) {
                              _mapController.move(
                                LatLng(
                                  _currentPosition!.latitude,
                                  _currentPosition!.longitude,
                                ),
                                16.0,
                              );
                            }
                          },
                          child: Icon(
                            Icons.my_location,
                            color: AppTheme.primaryBlue,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),

                // Location Status
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Location Status',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: AppTheme.textSecondary(context),
                                ),
                          ),
                          Text(
                            _currentPosition != null && _headOffice != null
                                ? (_isInRange
                                      ? 'Within range of Head Office'
                                      : 'Outside Head Office range')
                                : 'Checking location...',
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary(context),
                                ),
                          ),
                          if (_currentPosition != null && _headOffice != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                _distanceMeters != null && _radiusMeters != null
                                    ? 'Dist: ${_formatDistance(_distanceMeters!)} • Rad: ${_formatDistance(_radiusMeters!)}${_accuracyMeters != null ? ' • Acc: ±${_formatDistance(_accuracyMeters!)}' : ''}'
                                    : (_accuracyMeters != null
                                          ? 'Accuracy: ±${_accuracyMeters!.toStringAsFixed(0)} m'
                                          : ''),
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color: AppTheme.textSecondary(context),
                                    ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          if (_headOffice != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                'Head Office: ${_headOffice!.latitude.toStringAsFixed(6)}, ${_headOffice!.longitude.toStringAsFixed(6)}',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color: AppTheme.textSecondary(context),
                                    ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 1,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color:
                              (_currentPosition != null &&
                                  _headOffice != null &&
                                  _isInRange)
                              ? AppTheme.success.withValues(alpha: 0.1)
                              : AppTheme.error.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color:
                                    (_currentPosition != null &&
                                        _headOffice != null)
                                    ? (_isInRange
                                          ? AppTheme.success
                                          : AppTheme.error)
                                    : AppTheme.textLight(context),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                _currentPosition != null && _headOffice != null
                                    ? (_isInRange ? 'In Range' : 'Out of Range')
                                    : 'Checking...',
                                style: TextStyle(
                                  color:
                                      (_currentPosition != null &&
                                          _headOffice != null)
                                      ? (_isInRange
                                            ? AppTheme.success
                                            : AppTheme.error)
                                      : AppTheme.textLight(context),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Weekly Summary
                Text(
                  'Weekly Summary',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary(context),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _SummaryCard(
                        icon: Icons.access_time,
                        value:
                            '${attendance.weeklyHoursWorked.toStringAsFixed(1)}h',
                        label: 'Hours Worked',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _SummaryCard(
                        icon: Icons.calendar_today,
                        value: '${attendance.weeklyDaysPresent}/6',
                        label: 'Days Present',
                      ),
                    ),
                  ],
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

class _CountdownPainter extends CustomPainter {
  final double progress;
  final Color dividerColor;

  _CountdownPainter({required this.progress, required this.dividerColor});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 8;

    final bgPaint = Paint()
      ..color = dividerColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6;
    canvas.drawCircle(center, radius, bgPaint);

    final progressPaint = Paint()
      ..color = AppTheme.primaryBlue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2,
      2 * pi * progress,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _CountdownPainter oldDelegate) =>
      oldDelegate.progress != progress;
}
