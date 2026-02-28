class AttendanceCorrectionRequest {
  final int id;
  final int attendanceLogId;
  final int userId;
  final int? employeeId;
  final DateTime? proposedCheckInTime;
  final DateTime? proposedCheckOutTime;
  final String status;
  final String reason;
  final int? reviewedBy;
  final DateTime? reviewedAt;
  final String? reviewComment;

  AttendanceCorrectionRequest({
    required this.id,
    required this.attendanceLogId,
    required this.userId,
    required this.employeeId,
    required this.proposedCheckInTime,
    required this.proposedCheckOutTime,
    required this.status,
    required this.reason,
    required this.reviewedBy,
    required this.reviewedAt,
    required this.reviewComment,
  });

  factory AttendanceCorrectionRequest.fromJson(Map<String, dynamic> json) {
    DateTime? parseDt(dynamic v) {
      if (v == null) return null;
      if (v is String) return DateTime.tryParse(v);
      return null;
    }

    return AttendanceCorrectionRequest(
      id: (json['id'] as num?)?.toInt() ?? 0,
      attendanceLogId: (json['attendance_log_id'] as num?)?.toInt() ?? 0,
      userId: (json['user_id'] as num?)?.toInt() ?? 0,
      employeeId: (json['employee_id'] as num?)?.toInt(),
      proposedCheckInTime: parseDt(json['proposed_check_in_time']),
      proposedCheckOutTime: parseDt(json['proposed_check_out_time']),
      status: json['status'] as String? ?? 'pending',
      reason: json['reason'] as String? ?? '',
      reviewedBy: (json['reviewed_by'] as num?)?.toInt(),
      reviewedAt: parseDt(json['reviewed_at']),
      reviewComment: json['review_comment'] as String?,
    );
  }

  String get statusLabel {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }
}
