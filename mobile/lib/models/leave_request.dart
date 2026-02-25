class LeaveRequest {
  final int id;
  final int userId;
  final int? employeeId;
  final String leaveType;
  final String startDate;
  final String endDate;
  final String status;
  final String? reason;
  final String? rejectionReason;
  final String? createdAt;

  LeaveRequest({
    required this.id,
    required this.userId,
    this.employeeId,
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.status,
    this.reason,
    this.rejectionReason,
    this.createdAt,
  });

  String get leaveTypeLabel {
    switch (leaveType) {
      case 'annual':
        return 'Annual Leave';
      case 'sick':
        return 'Sick Leave';
      case 'personal':
        return 'Personal Leave';
      default:
        return 'Other';
    }
  }

  String get statusLabel {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'pending_hr':
        return 'Pending HR';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  int get totalDays {
    final start = DateTime.tryParse(startDate);
    final end = DateTime.tryParse(endDate);
    if (start == null || end == null) return 0;
    return end.difference(start).inDays + 1;
  }

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    return LeaveRequest(
      id: json['id'] as int,
      userId: (json['user_id'] as num?)?.toInt() ?? 0,
      employeeId: (json['employee_id'] as num?)?.toInt(),
      leaveType: json['leave_type'] as String? ?? 'other',
      startDate: json['start_date'] as String? ?? '',
      endDate: json['end_date'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      reason: json['reason'] as String?,
      rejectionReason: json['rejection_reason'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}

class LeaveBalance {
  final int annual;
  final int sick;
  final int personal;

  LeaveBalance({
    required this.annual,
    required this.sick,
    required this.personal,
  });

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    return LeaveBalance(
      annual: (json['annual'] as num?)?.toInt() ?? 0,
      sick: (json['sick'] as num?)?.toInt() ?? 0,
      personal: (json['personal'] as num?)?.toInt() ?? 0,
    );
  }
}
