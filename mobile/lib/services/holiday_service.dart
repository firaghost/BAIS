import '../models/holiday.dart';
import 'api_service.dart';

class HolidayService {
  final ApiService _api = ApiService();

  Future<Holiday?> getTodayHoliday({String countryCode = 'ET'}) async {
    final result = await _api.get(
      '/holidays/today',
      queryParams: {'country_code': countryCode},
    );

    final data = result['data'];
    if (data is! Map<String, dynamic>) return null;

    final isHoliday = data['is_holiday'] as bool? ?? false;
    if (!isHoliday) return null;

    final holiday = data['holiday'];
    if (holiday is! Map<String, dynamic>) return null;

    return Holiday.fromJson(holiday);
  }

  Future<List<Holiday>> getUpcomingHolidays({
    String countryCode = 'ET',
    String? from,
    String? to,
  }) async {
    final now = DateTime.now();
    final fromValue = from ?? _toYmd(now);
    final toValue = to ?? _toYmd(now.add(const Duration(days: 365)));

    final result = await _api.get(
      '/holidays/upcoming',
      queryParams: {
        'country_code': countryCode,
        'from': fromValue,
        'to': toValue,
      },
    );

    final data = result['data'];
    if (data is! Map<String, dynamic>) return [];

    final items = data['items'];
    if (items is! List) return [];

    return items
        .whereType<Map<String, dynamic>>()
        .map(Holiday.fromJson)
        .toList();
  }

  String _toYmd(DateTime value) {
    final y = value.year.toString().padLeft(4, '0');
    final m = value.month.toString().padLeft(2, '0');
    final d = value.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}
