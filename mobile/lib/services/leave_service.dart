import '../models/leave_request.dart';
import 'api_service.dart';

class LeaveService {
  final ApiService _api = ApiService();

  Future<LeaveBalance> getBalance({int? year}) async {
    final params = <String, String>{};
    if (year != null) params['year'] = year.toString();

    final result = await _api.get('/leaves/balance', queryParams: params.isNotEmpty ? params : null);
    return LeaveBalance.fromJson(result['data'] as Map<String, dynamic>);
  }

  Future<List<LeaveRequest>> getRequests() async {
    final result = await _api.get('/leaves/requests');
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
        .map((e) => LeaveRequest.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<LeaveRequest> createRequest({
    required String leaveType,
    required String startDate,
    required String endDate,
    String? reason,
  }) async {
    final result = await _api.post('/leaves/requests', body: {
      'leave_type': leaveType,
      'start_date': startDate,
      'end_date': endDate,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });

    return LeaveRequest.fromJson(result['data'] as Map<String, dynamic>);
  }
}
