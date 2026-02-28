class AttendanceLog {
  final int id;
  final int userId;
  final int? employeeId;
  final int branchId;
  final String logDate;
  final String? checkInTime;
  final String? checkOutTime;
  final int lateMinutes;
  final bool lateExcused;
  final int overtimeMinutes;
  final String status;
  final Map<String, dynamic>? branch;
  final Map<String, dynamic>? employee;

  AttendanceLog({
    required this.id,
    required this.userId,
    this.employeeId,
    required this.branchId,
    required this.logDate,
    this.checkInTime,
    this.checkOutTime,
    this.lateMinutes = 0,
    this.lateExcused = false,
    this.overtimeMinutes = 0,
    required this.status,
    this.branch,
    this.employee,
  });

  String get branchName => branch?['name'] as String? ?? 'Unknown Branch';
  String get departmentName => employee?['department'] as String? ?? 'Unknown Department';
  String get branchAndDepartment => '$branchName / $departmentName';

  String get statusLabel {
    if (status == 'checked_in') return 'Checked In';
    if (status == 'checked_out') {
      if (isLate) return 'Late';
      return 'Present';
    }
    return status;
  }

  bool get isLate => lateMinutes > 0 && lateExcused == false;

  /// Parse a server timestamp to a UTC DateTime.
  /// The server returns timestamps without timezone suffix (e.g. "2026-02-28 09:00:00").
  /// Flutter would interpret those as LOCAL time — we must treat them as UTC.
  static DateTime? parseServerDateTime(String raw) {
    final v = raw.trim();
    if (v.isEmpty) return null;

    // Normalize space separator to T
    var normalized = v.contains('T') ? v : v.replaceFirst(' ', 'T');

    // If no timezone offset (+XX:XX or Z), the server timestamp is UTC — append Z
    final hasTimezone = normalized.endsWith('Z') ||
        normalized.contains('+') ||
        (normalized.length > 19 && normalized[19] == '-');
    if (!hasTimezone) {
      normalized = '${normalized}Z';
    }

    return DateTime.tryParse(normalized); // Returns UTC DateTime
  }

  Duration? get totalWorked {
    if (checkInTime == null || checkOutTime == null) return null;
    final inTime = parseServerDateTime(checkInTime!);
    final outTime = parseServerDateTime(checkOutTime!);
    if (inTime == null || outTime == null) return null;

    final localIn = inTime.toLocal();
    final localOut = outTime.toLocal();
    return localOut.difference(localIn);
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
      lateExcused: (json['late_excused'] as bool?) ?? false,
      overtimeMinutes: (json['overtime_minutes'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'unknown',
      branch: json['branch'] as Map<String, dynamic>?,
      employee: json['employee'] as Map<String, dynamic>?,
    );
  }
}
