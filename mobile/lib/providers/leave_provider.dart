import 'package:flutter/material.dart';
import '../models/leave_request.dart';
import '../services/leave_service.dart';

class LeaveProvider extends ChangeNotifier {
  final LeaveService _leaveService = LeaveService();

  LeaveBalance? _balance;
  List<LeaveRequest> _requests = [];
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _error;

  LeaveBalance? get balance => _balance;
  List<LeaveRequest> get requests => _requests;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get error => _error;

  Future<void> loadBalance({int? year}) async {
    try {
      _balance = await _leaveService.getBalance(year: year);
      notifyListeners();
    } catch (e) {
      // Balance might not be available
    }
  }

  Future<void> loadRequests() async {
    _isLoading = true;
    notifyListeners();

    try {
      _requests = await _leaveService.getRequests();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
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

      // Reload data
      await loadBalance();
      await loadRequests();
      return true;
    } catch (e) {
      _error = e.toString();
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }
}
