import '../models/shift.dart';
import 'api_service.dart';

class ShiftService {
  final ApiService _api = ApiService();

  Future<List<Shift>> getShifts() async {
    final result = await _api.get('/shifts');
    final data = result['data'];
    List<dynamic> items;

    if (data is Map<String, dynamic>) {
      items = data['data'] as List<dynamic>? ?? [];
    } else if (data is List) {
      items = data;
    } else {
      items = [];
    }

    return items
        .map((e) => Shift.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
