import 'package:flutter/material.dart';
import '../models/leave_request.dart';
import '../services/leave_service.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

class LeaveProvider extends ChangeNotifier {
  final LeaveService _leaveService = LeaveService();

  LeaveBalance? _balance;
  List<LeaveRequest> _requests = [];
  bool _isLoading = false;
  bool _isBalanceLoading = false;
  bool _isSubmitting = false;
  String? _error;

  LeaveBalance? get balance => _balance;
  List<LeaveRequest> get requests => _requests;
  bool get isLoading => _isLoading;
  bool get isBalanceLoading => _isBalanceLoading;
  bool get isSubmitting => _isSubmitting;
  String? get error => _error;

  Future<void> loadBalance({int? year}) async {
    _isBalanceLoading = true;
    _error = null;
    notifyListeners();

    try {
      _balance = await _leaveService.getBalance(year: year);
      _isBalanceLoading = false;
      notifyListeners();
    } catch (e) {
      _error = _friendlyError(e);
      _isBalanceLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadRequests() async {
    _isLoading = true;
    notifyListeners();

    try {
      _requests = await _leaveService.getRequests();
      _isLoading = false;
      notifyListeners();

      await NotificationService().notifyLeaveStatusChanges(_requests);
    } catch (e) {
      _error = _friendlyError(e);
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> submitRequest({
    required String leaveType,
    required String startDate,
    required String endDate,
    String? reason,
  }) async {
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    try {
      await _leaveService.createRequest(
        leaveType: leaveType,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
      );
      _isSubmitting = false;
      notifyListeners();

      // Reload data after successful submission
      await loadBalance();
      await loadRequests();
      return true;
    } catch (e) {
      _error = _friendlyError(e);
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }

  /// Extracts a user-friendly error message from any exception.
  /// Handles ApiException bodies with validation error maps.
  String _friendlyError(Object e) {
    if (e is ApiException) {
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
        if (first != null) return first;
      }
      if (message.isNotEmpty) return message;
    }

    return e
        .toString()
        .replaceAll(RegExp(r'^Exception:\s*'), '')
        .replaceAll(RegExp(r'^ApiException\(\d+\):\s*'), '')
        .trim()
        .let((s) => s.isEmpty ? 'Something went wrong. Please try again.' : s);
  }
}

extension _StringLet on String {
  T let<T>(T Function(String) f) => f(this);
}

