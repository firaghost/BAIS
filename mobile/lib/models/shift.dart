class Shift {
  final int id;
  final int branchId;
  final String startTime;
  final String endTime;
  final int graceMinutes;
  final int overtimeThreshold;

  Shift({
    required this.id,
    required this.branchId,
    required this.startTime,
    required this.endTime,
    required this.graceMinutes,
    required this.overtimeThreshold,
  });

  factory Shift.fromJson(Map<String, dynamic> json) {
    return Shift(
      id: json['id'] as int,
      branchId: (json['branch_id'] as num?)?.toInt() ?? 0,
      startTime: json['start_time'] as String? ?? '08:30:00',
      endTime: json['end_time'] as String? ?? '17:00:00',
      graceMinutes: (json['grace_minutes'] as num?)?.toInt() ?? 0,
      overtimeThreshold: (json['overtime_threshold'] as num?)?.toInt() ?? 0,
    );
  }

  String get formattedStartTime {
    return _formatTime(startTime);
  }

  String get formattedEndTime {
    return _formatTime(endTime);
  }

  String _formatTime(String time) {
    final parts = time.split(':');
    if (parts.length < 2) return time;
    int hour = int.tryParse(parts[0]) ?? 0;
    int minute = int.tryParse(parts[1]) ?? 0;
    String period = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour == 0) hour = 12;
    return '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $period';
  }
}
