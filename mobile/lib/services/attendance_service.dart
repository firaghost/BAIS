import '../models/attendance_log.dart';
import 'api_service.dart';

class AttendanceService {
  final ApiService _api = ApiService();

  Future<AttendanceLog> checkIn({
    required int branchId,
    required double latitude,
    required double longitude,
  }) async {
    final result = await _api.post('/attendance/check-in', body: {
      'branch_id': branchId,
      'latitude': latitude,
      'longitude': longitude,
    });

    return AttendanceLog.fromJson(result['data'] as Map<String, dynamic>);
  }

  Future<AttendanceLog> checkOut({required int branchId}) async {
    final result = await _api.post('/attendance/check-out', body: {
      'branch_id': branchId,
    });

    return AttendanceLog.fromJson(result['data'] as Map<String, dynamic>);
  }

  Future<List<AttendanceLog>> getHistory({
    String? from,
    String? to,
    String? status,
    int? branchId,
    int perPage = 20,
  }) async {
    final params = <String, String>{
      'per_page': perPage.toString(),
    };
    if (from != null) params['from'] = from;
    if (to != null) params['to'] = to;
    if (status != null) params['status'] = status;
    if (branchId != null) params['branch_id'] = branchId.toString();

    final result = await _api.get('/attendance/history', queryParams: params);

    final data = result['data'];
    List<dynamic> items;

    if (data is Map<String, dynamic>) {
      // Paginated response
      items = data['data'] as List<dynamic>? ?? [];
    } else if (data is List) {
      items = data;
    } else {
      items = [];
    }

    return items
        .map((e) => AttendanceLog.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
