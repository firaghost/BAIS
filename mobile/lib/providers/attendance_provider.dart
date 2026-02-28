import 'package:flutter/material.dart';
import '../models/attendance_log.dart';
import '../models/attendance_correction_request.dart';
import '../models/shift.dart';
import '../models/weekly_summary.dart';
import '../services/attendance_service.dart';
import '../services/api_service.dart';
import '../services/shift_service.dart';
import '../services/notification_service.dart';

class AttendanceProvider extends ChangeNotifier {
  final AttendanceService _attendanceService = AttendanceService();
  final ShiftService _shiftService = ShiftService();

  List<AttendanceLog> _history = [];
  List<Shift> _shifts = [];
  AttendanceLog? _todayLog;
  WeeklySummary? _weeklySummary;
  Map<int, AttendanceCorrectionRequest> _correctionsByLogId = {};
  bool _isLoading = false;
  bool _isCheckingIn = false;
  bool _isCheckingOut = false; // Added _isCheckingOut flag
  bool _isWeeklySummaryLoading = false;
  String? _error;

  List<AttendanceLog> get history => _history;
  List<Shift> get shifts => _shifts;
  AttendanceLog? get todayLog => _todayLog;
  WeeklySummary? get weeklySummary => _weeklySummary;
  Map<int, AttendanceCorrectionRequest> get correctionsByLogId =>
      Map.unmodifiable(_correctionsByLogId);
  bool get isLoading => _isLoading;
  bool get isCheckingIn => _isCheckingIn;
  bool get isCheckingOut => _isCheckingOut; // Added getter for _isCheckingOut
  bool get isWeeklySummaryLoading => _isWeeklySummaryLoading;
  String? get error => _error;
  bool get isCheckedIn =>
      _todayLog != null &&
      _todayLog!.status == 'checked_in' &&
      !_isCheckingOut; // Fixed isCheckedIn getter

  Shift? get currentShift => _shifts.isNotEmpty ? _shifts.first : null;

  Future<void> loadShifts() async {
    try {
      _shifts = await _shiftService.getShifts();
      notifyListeners();

      final shift = currentShift;
      if (shift != null) {
        await NotificationService().scheduleNextClockInReminder(
          shiftStartTime: shift.startTime,
          minutesBefore: 15,
        );
      }
    } catch (e) {
      // silently fail, shifts are supplementary
    }
  }

  Future<void> loadTodayLog() async {
    try {
      _todayLog = await _attendanceService.fetchTodayLog();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> loadWeeklySummary() async {
    _isWeeklySummaryLoading = true;
    notifyListeners();

    try {
      _weeklySummary = await _attendanceService.getWeeklySummary();
    } catch (_) {
      // keep last summary
    } finally {
      _isWeeklySummaryLoading = false;
      notifyListeners();
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

      try {
        final corrections = await _attendanceService.getCorrections(
          perPage: 100,
        );
        _correctionsByLogId = {
          for (final c in corrections) c.attendanceLogId: c,
        };
        await NotificationService().notifyCorrectionStatusChanges(corrections);
      } catch (_) {
        // keep last corrections map
      }

      // For today's state, fetchTodayLog is more reliable, but also set from history if missing
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final todayFromHistory = _history.where((log) {
        final logDate = log.logDate.substring(0, 10);
        return logDate == today;
      }).firstOrNull;

      // Fixed today log assignment: always update if found in history, or if _todayLog is null
      if (_todayLog == null || todayFromHistory != null) {
        _todayLog = todayFromHistory;
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> checkIn({
    required double latitude,
    required double longitude,
  }) async {
    _isCheckingIn = true;
    _error = null;
    notifyListeners();

    try {
      final log = await _attendanceService.checkIn(
        latitude: latitude,
        longitude: longitude,
      );
      _todayLog = log;
      _isCheckingIn = false;
      notifyListeners();
      // Reload from backend to ensure accuracy (do not block UI)
      await loadTodayLog(); // Awaited loadTodayLog
      return true;
    } catch (e) {
      _error = _friendlyError(e);
      _isCheckingIn = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> checkOut() async {
    _isCheckingOut = true; // Set _isCheckingOut to true
    _error = null;
    notifyListeners();

    try {
      final log = await _attendanceService.checkOut();
      _todayLog = log;
      _isCheckingOut = false; // Set _isCheckingOut to false
      notifyListeners();
      // Reload from backend to ensure accuracy (do not block UI)
      await loadTodayLog(); // Awaited loadTodayLog
      return true;
    } catch (e) {
      _error = _friendlyError(e);
      _isCheckingOut = false; // Set _isCheckingOut to false on error
      notifyListeners();
      return false;
    }
  }

  Future<void> requestCorrection({
    required int attendanceLogId,
    required String reason,
    DateTime? proposedCheckInTime,
    DateTime? proposedCheckOutTime,
  }) async {
    try {
      await _attendanceService.requestCorrection(
        attendanceLogId: attendanceLogId,
        reason: reason,
        proposedCheckInTime: proposedCheckInTime,
        proposedCheckOutTime: proposedCheckOutTime,
      );
    } catch (e) {
      _error = _friendlyError(e);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
      rethrow;
    }
  }

  String _friendlyError(Object e) {
    if (e is ApiException) {
      if (e.statusCode == 403) {
        return 'You do not have permission to request a correction. Please contact HR.';
      }

      final message = e.message.trim();
      final errors = e.body?['errors'];
      if (errors is Map) {
        final first = errors.values
            .cast<dynamic>()
            .expand((v) => v is List ? v : [v])
            .cast<dynamic>()
            .map((v) => v?.toString().trim())
            .where((v) => v != null && v.isNotEmpty)
            .cast<String>()
            .firstOrNull;
        if (first != null) {
          return first;
        }
      }

      if (message.isNotEmpty) {
        return message;
      }
    }

    final raw = e.toString();
    final cleaned = raw
        .replaceAll(RegExp(r'^Exception:\s*'), '')
        .replaceAll(RegExp(r'^ApiException\(\d+\):\s*'), '')
        .trim();

    if (cleaned.isEmpty) {
      return 'Something went wrong. Please try again.';
    }

    return cleaned;
  }
}
