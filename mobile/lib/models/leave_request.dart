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

  DateTime? get startDateTime {
    return DateTime.tryParse(startDate);
  }

  DateTime? get endDateTime {
    return DateTime.tryParse(endDate);
  }

  String get startDateLabel {
    final d = startDateTime;
    if (d == null) return startDate;
    return '${_monthLabel(d.month)} ${d.day.toString().padLeft(2, '0')}, ${d.year}';
  }

  String get endDateLabel {
    final d = endDateTime;
    if (d == null) return endDate;
    return '${_monthLabel(d.month)} ${d.day.toString().padLeft(2, '0')}, ${d.year}';
  }

  static String _monthLabel(int month) {
    switch (month) {
      case 1:
        return 'Jan';
      case 2:
        return 'Feb';
      case 3:
        return 'Mar';
      case 4:
        return 'Apr';
      case 5:
        return 'May';
      case 6:
        return 'Jun';
      case 7:
        return 'Jul';
      case 8:
        return 'Aug';
      case 9:
        return 'Sep';
      case 10:
        return 'Oct';
      case 11:
        return 'Nov';
      case 12:
        return 'Dec';
      default:
        return '';
    }
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
  final int annualRemaining;
  final int annualTotal;
  final int annualUsed;
  final int sickRemaining;
  final int sickTotal;
  final int sickUsed;
  final int personalRemaining;
  final int personalTotal;
  final int personalUsed;

  LeaveBalance({
    required this.annualRemaining,
    required this.annualTotal,
    required this.annualUsed,
    required this.sickRemaining,
    required this.sickTotal,
    required this.sickUsed,
    required this.personalRemaining,
    required this.personalTotal,
    required this.personalUsed,
  });

  int get annual => annualRemaining;
  int get sick => sickRemaining;
  int get personal => personalRemaining;

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    final annualDetail = json['annual_detail'] as Map<String, dynamic>?;
    final sickDetail = json['sick_detail'] as Map<String, dynamic>?;
    final personalDetail = json['personal_detail'] as Map<String, dynamic>?;

    return LeaveBalance(
      annualRemaining:
          (annualDetail?['remaining'] as num?)?.toInt() ??
          (json['annual'] as num?)?.toInt() ??
          0,
      annualTotal: (annualDetail?['total'] as num?)?.toInt() ?? 0,
      annualUsed: (annualDetail?['used'] as num?)?.toInt() ?? 0,
      sickRemaining:
          (sickDetail?['remaining'] as num?)?.toInt() ??
          (json['sick'] as num?)?.toInt() ??
          0,
      sickTotal: (sickDetail?['total'] as num?)?.toInt() ?? 0,
      sickUsed: (sickDetail?['used'] as num?)?.toInt() ?? 0,
      personalRemaining:
          (personalDetail?['remaining'] as num?)?.toInt() ??
          (json['personal'] as num?)?.toInt() ??
          0,
      personalTotal: (personalDetail?['total'] as num?)?.toInt() ?? 0,
      personalUsed: (personalDetail?['used'] as num?)?.toInt() ?? 0,
    );
  }
}
