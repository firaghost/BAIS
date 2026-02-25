class AttendanceLog {
  final int id;
  final int userId;
  final int? employeeId;
  final int branchId;
  final String logDate;
  final String? checkInTime;
  final String? checkOutTime;
  final int lateMinutes;
  final int overtimeMinutes;
  final String status;
  final Map<String, dynamic>? branch;

  AttendanceLog({
    required this.id,
    required this.userId,
    this.employeeId,
    required this.branchId,
    required this.logDate,
    this.checkInTime,
    this.checkOutTime,
    this.lateMinutes = 0,
    this.overtimeMinutes = 0,
    required this.status,
    this.branch,
  });

  String get branchName => branch?['name'] as String? ?? 'Unknown Branch';

  String get statusLabel {
    if (status == 'checked_in') return 'Checked In';
    if (status == 'checked_out') {
      if (lateMinutes > 0) return 'Late';
      return 'Present';
    }
    return status;
  }

  bool get isLate => lateMinutes > 0;

  Duration? get totalWorked {
    if (checkInTime == null || checkOutTime == null) return null;
    final inTime = DateTime.tryParse(checkInTime!);
    final outTime = DateTime.tryParse(checkOutTime!);
    if (inTime == null || outTime == null) return null;
    return outTime.difference(inTime);
  }

  String get totalWorkedFormatted {
    final dur = totalWorked;
    if (dur == null) return '--';
    final hours = dur.inHours;
    final mins = dur.inMinutes % 60;
    return '${hours}h ${mins}m';
  }

  factory AttendanceLog.fromJson(Map<String, dynamic> json) {
    return AttendanceLog(
      id: json['id'] as int,
      userId: (json['user_id'] as num?)?.toInt() ?? 0,
      employeeId: (json['employee_id'] as num?)?.toInt(),
      branchId: (json['branch_id'] as num?)?.toInt() ?? 0,
      logDate: json['log_date'] as String? ?? '',
      checkInTime: json['check_in_time'] as String?,
      checkOutTime: json['check_out_time'] as String?,
      lateMinutes: (json['late_minutes'] as num?)?.toInt() ?? 0,
      overtimeMinutes: (json['overtime_minutes'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'unknown',
      branch: json['branch'] as Map<String, dynamic>?,
    );
  }
}
