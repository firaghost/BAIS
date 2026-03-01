import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../providers/attendance_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_header.dart';
import '../widgets/holiday_sheet.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  late DateTime _selectedDate;
  late DateTime _weekStart;
  Position? _currentPosition;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
    _weekStart = _selectedDate.subtract(
      Duration(days: _selectedDate.weekday - 1),
    );
    _loadData();
    _getCurrentLocation();
  }

  void _loadData() {
    context.read<AttendanceProvider>().loadShifts();
  }

  Future<void> _onRefresh() async {
    _loadData();
    await _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    try {
      bool svc = await Geolocator.isLocationServiceEnabled();
      if (!svc) return;
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
        if (perm == LocationPermission.denied) return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      if (mounted) setState(() => _currentPosition = pos);
    } catch (_) {}
  }

  void _previousWeek() => setState(() {
    _weekStart = _weekStart.subtract(const Duration(days: 7));
    _selectedDate = _weekStart;
  });

  void _nextWeek() => setState(() {
    _weekStart = _weekStart.add(const Duration(days: 7));
    _selectedDate = _weekStart;
  });

  @override
  Widget build(BuildContext context) {
    final attendance = context.watch<AttendanceProvider>();
    final shift = attendance.currentShift;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final weekDays = List.generate(7, (i) => _weekStart.add(Duration(days: i)));

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
                const AppHeader(title: 'Schedule'),
                const SizedBox(height: 16),

                // Month header
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.card(context),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: isDark
                        ? []
                        : [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        DateFormat('MMMM yyyy').format(_weekStart),
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary(context),
                            ),
                      ),
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () => HolidaySheet.show(context),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.event_available_rounded, size: 16, color: AppTheme.primaryBlue),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Holidays',
                                    style: TextStyle(
                                      color: AppTheme.primaryBlue,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          _navButton(
                            Icons.chevron_left,
                            _previousWeek,
                            context,
                          ),
                          const SizedBox(width: 4),
                          _navButton(Icons.chevron_right, _nextWeek, context),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Week day strip
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppTheme.card(context),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: isDark
                        ? []
                        : [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                  ),
                  child: Row(
                    children: weekDays.map((date) {
                      final isSelected =
                          date.day == _selectedDate.day &&
                          date.month == _selectedDate.month;
                      final isToday =
                          date.day == DateTime.now().day &&
                          date.month == DateTime.now().month &&
                          date.year == DateTime.now().year;
                      final dayName = DateFormat(
                        'E',
                      ).format(date).substring(0, 2);
                      return Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedDate = date),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.all(2),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppTheme.primaryBlue
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  dayName,
                                  style: TextStyle(
                                    color: isSelected
                                        ? Colors.white.withValues(alpha: 0.8)
                                        : AppTheme.textSecondary(context),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${date.day}',
                                  style: TextStyle(
                                    color: isSelected
                                        ? Colors.white
                                        : AppTheme.textPrimary(context),
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? Colors.white
                                        : (isToday
                                              ? AppTheme.primaryBlue
                                              : Colors.transparent),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),

                // Map preview with real location
                Container(
                  width: double.infinity,
                  height: 140,
                  decoration: BoxDecoration(
                    color: AppTheme.card(context),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    children: [
                      if (_currentPosition != null)
                        FlutterMap(
                          options: MapOptions(
                            initialCenter: LatLng(
                              _currentPosition!.latitude,
                              _currentPosition!.longitude,
                            ),
                            initialZoom: 15.0,
                            interactionOptions: const InteractionOptions(
                              flags:
                                  InteractiveFlag.all & ~InteractiveFlag.rotate,
                            ),
                          ),
                          children: [
                            TileLayer(
                              urlTemplate:
                                  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              userAgentPackageName: 'com.sdb.attendance',
                            ),
                            MarkerLayer(
                              markers: [
                                Marker(
                                  point: LatLng(
                                    _currentPosition!.latitude,
                                    _currentPosition!.longitude,
                                  ),
                                  width: 40,
                                  height: 40,
                                  child: Icon(
                                    Icons.location_on,
                                    color: AppTheme.primaryBlue,
                                    size: 40,
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
                              Icon(
                                Icons.map_outlined,
                                size: 36,
                                color: AppTheme.textLight(context),
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
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.location_on,
                                color: AppTheme.primaryBlue,
                                size: 16,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Head Office',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      fontWeight: FontWeight.w600,
                                      color: Colors.black87,
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

                // Schedule items
                ..._buildScheduleItems(context, shift, isDark),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navButton(IconData icon, VoidCallback onTap, BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: AppTheme.card2(context),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 18, color: AppTheme.textSecondary(context)),
      ),
    );
  }

  List<Widget> _buildScheduleItems(
    BuildContext context,
    dynamic shift,
    bool isDark,
  ) {
    final items = <Widget>[];
    final dates = [
      _selectedDate,
      _selectedDate.add(const Duration(days: 1)),
      _selectedDate.add(const Duration(days: 2)),
    ];

    for (int i = 0; i < dates.length; i++) {
      final date = dates[i];
      final isToday =
          date.day == DateTime.now().day &&
          date.month == DateTime.now().month &&
          date.year == DateTime.now().year;

      items.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isToday
                      ? AppTheme.primaryBlue.withValues(alpha: 0.1)
                      : AppTheme.card2(context),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.access_time,
                  size: 14,
                  color: isToday
                      ? AppTheme.primaryBlue
                      : AppTheme.textSecondary(context),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                isToday
                    ? 'TODAY, ${DateFormat('MMM d').format(date).toUpperCase()}'
                    : DateFormat('EEE, MMM d').format(date).toUpperCase(),
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isToday
                      ? AppTheme.primaryBlue
                      : AppTheme.textSecondary(context),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
      );

      if (shift != null) {
        final isAfternoon = i == 1;
        items.add(
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.card(context),
              borderRadius: BorderRadius.circular(16),
              border: Border(
                left: BorderSide(
                  color: isAfternoon ? AppTheme.warning : AppTheme.primaryBlue,
                  width: 3,
                ),
              ),
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: isAfternoon
                            ? AppTheme.warning.withValues(alpha: 0.1)
                            : AppTheme.primaryBlue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isAfternoon ? 'Afternoon Shift' : 'Morning Shift',
                        style: TextStyle(
                          color: isAfternoon
                              ? AppTheme.warning
                              : AppTheme.primaryBlue,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (isToday)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Active',
                          style: TextStyle(
                            color: AppTheme.success,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  isAfternoon
                      ? '01:00 PM - 09:30 PM'
                      : '${shift.formattedStartTime} - ${shift.formattedEndTime}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary(context),
                  ),
                ),
                if (isToday) ...[
                  Text(
                    '8h 30m Duration',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppTheme.textSecondary(context),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _shiftDetailRow(
                    Icons.business_outlined,
                    'Head Office',
                    'Main Branch',
                    context,
                  ),
                  const SizedBox(height: 8),
                  _shiftDetailRow(
                    Icons.person_outline,
                    'Shift Supervisor',
                    'On duty',
                    context,
                  ),
                ] else ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        Icons.business_outlined,
                        size: 14,
                        color: AppTheme.textSecondary(context),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Head Office',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.textSecondary(context),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      } else {
        items.add(
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.card(context),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.divider(context),
                style: BorderStyle.solid,
              ),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.event_busy_outlined,
                  size: 32,
                  color: AppTheme.textLight(context),
                ),
                const SizedBox(height: 8),
                Text(
                  'No shift scheduled',
                  style: TextStyle(
                    color: AppTheme.textSecondary(context),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        );
      }
    }
    return items;
  }

  Widget _shiftDetailRow(
    IconData icon,
    String title,
    String subtitle,
    BuildContext context,
  ) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: AppTheme.primaryBlue.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 14, color: AppTheme.primaryBlue),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary(context),
              ),
            ),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.textSecondary(context),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
