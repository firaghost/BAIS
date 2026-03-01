class Holiday {
  final int id;
  final String countryCode;
  final String holidayDate;
  final String name;
  final String type;
  final bool isActive;
  final String source;

  Holiday({
    required this.id,
    required this.countryCode,
    required this.holidayDate,
    required this.name,
    required this.type,
    required this.isActive,
    required this.source,
  });

  factory Holiday.fromJson(Map<String, dynamic> json) {
    return Holiday(
      id: (json['id'] as num?)?.toInt() ?? 0,
      countryCode: json['country_code'] as String? ?? 'ET',
      holidayDate: json['holiday_date'] as String? ?? '',
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? 'public',
      isActive: json['is_active'] as bool? ?? true,
      source: json['source'] as String? ?? 'manual',
    );
  }
}
