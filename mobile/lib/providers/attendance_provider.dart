import 'package:flutter/material.dart';
import '../models/attendance_log.dart';
import '../models/shift.dart';
import '../services/attendance_service.dart';
import '../services/shift_service.dart';

class AttendanceProvider extends ChangeNotifier {
  final AttendanceService _attendanceService = AttendanceService();
  final ShiftService _shiftService = ShiftService();

  List<AttendanceLog> _history = [];
  List<Shift> _shifts = [];
  AttendanceLog? _todayLog;
  bool _isLoading = false;
  bool _isCheckingIn = false;
  String? _error;

  List<AttendanceLog> get history => _history;
  List<Shift> get shifts => _shifts;
  AttendanceLog? get todayLog => _todayLog;
  bool get isLoading => _isLoading;
  bool get isCheckingIn => _isCheckingIn;
  String? get error => _error;
  bool get isCheckedIn => _todayLog != null && _todayLog!.status == 'checked_in';

  Shift? get currentShift => _shifts.isNotEmpty ? _shifts.first : null;

  Future<void> loadShifts() async {
    try {
      _shifts = await _shiftService.getShifts();
      notifyListeners();
    } catch (e) {
      // silently fail, shifts are supplementary
    }
  }

  Future<void> loadHistory({String? from, String? to, String? status}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _history = await _attendanceService.getHistory(
        from: from,
        to: to,
        status: status,
        perPage: 50,
      );

      // Find today's active log
      final today = DateTime.now().toIso8601String().substring(0, 10);
      _todayLog = _history.where((log) {
        final logDate = log.logDate.substring(0, 10);
        return logDate == today;
      }).firstOrNull;

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> checkIn({
    required int branchId,
    required double latitude,
    required double longitude,
  }) async {
    _isCheckingIn = true;
    _error = null;
    notifyListeners();

    try {
      final log = await _attendanceService.checkIn(
        branchId: branchId,
        latitude: latitude,
        longitude: longitude,
      );
      _todayLog = log;
      _isCheckingIn = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isCheckingIn = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> checkOut({required int branchId}) async {
    _isCheckingIn = true;
    _error = null;
    notifyListeners();

    try {
      final log = await _attendanceService.checkOut(branchId: branchId);
      _todayLog = log;
      _isCheckingIn = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isCheckingIn = false;
      notifyListeners();
      return false;
    }
  }

  // Weekly summary calculations
  double get weeklyHoursWorked {
    final now = DateTime.now();
    final weekStart = now.subtract(Duration(days: now.weekday - 1));
    double totalHours = 0;

    for (final log in _history) {
      final logDate = DateTime.tryParse(log.logDate);
      if (logDate == null) continue;
      if (logDate.isAfter(weekStart.subtract(const Duration(days: 1)))) {
        final dur = log.totalWorked;
        if (dur != null) {
          totalHours += dur.inMinutes / 60.0;
        }
      }
    }
    return totalHours;
  }

  int get weeklyDaysPresent {
    final now = DateTime.now();
    final weekStart = now.subtract(Duration(days: now.weekday - 1));
    final presentDays = <String>{};

    for (final log in _history) {
      final logDate = DateTime.tryParse(log.logDate);
      if (logDate == null) continue;
      if (logDate.isAfter(weekStart.subtract(const Duration(days: 1)))) {
        presentDays.add(log.logDate.substring(0, 10));
      }
    }
    return presentDays.length;
  }
}
