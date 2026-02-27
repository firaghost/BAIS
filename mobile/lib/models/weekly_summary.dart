class WeeklySummary {
  final String weekStart;
  final String weekEnd;
  final int workedSeconds;
  final double workedHours;
  final int daysPresent;
  final int daysTotal;

  WeeklySummary({
    required this.weekStart,
    required this.weekEnd,
    required this.workedSeconds,
    required this.workedHours,
    required this.daysPresent,
    required this.daysTotal,
  });

  factory WeeklySummary.fromJson(Map<String, dynamic> json) {
    return WeeklySummary(
      weekStart: json['week_start'] as String? ?? '',
      weekEnd: json['week_end'] as String? ?? '',
      workedSeconds: (json['worked_seconds'] as num?)?.toInt() ?? 0,
      workedHours: (json['worked_hours'] as num?)?.toDouble() ?? 0,
      daysPresent: (json['days_present'] as num?)?.toInt() ?? 0,
      daysTotal: (json['days_total'] as num?)?.toInt() ?? 0,
    );
  }
}
