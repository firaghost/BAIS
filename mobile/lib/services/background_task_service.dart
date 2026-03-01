import 'package:workmanager/workmanager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'notification_service.dart';
import 'holiday_service.dart';
import '../models/leave_request.dart';
import '../models/attendance_correction_request.dart';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      // If there's no active user session, do nothing.
      if (token == null || token.isEmpty) {
        return Future.value(true);
      }

      final notifService = NotificationService();
      await notifService.init();

      // Ensure API service has token for HTTP calls
      final api = ApiService();

      // 1. Check Holidays
      final holidayService = HolidayService();
      final todayHoliday = await holidayService.getTodayHoliday();
      if (todayHoliday != null) {
        await notifService.notifyHolidayToday(todayHoliday);
      }

      // 2. Sync Leave Requests
      try {
        final leaveRes = await api.get('/leaves');
        final leaveData = leaveRes['data'] as List?;
        if (leaveData != null) {
            final leaves = leaveData
                .map((e) => LeaveRequest.fromJson(e as Map<String, dynamic>))
                .toList();
            await notifService.notifyLeaveStatusChanges(leaves);
        }
      } catch (_) {}

      // 3. Sync Correction Requests
      try {
        final correctionRes = await api.get('/attendance-corrections');
        final correctionData = correctionRes['data'] as List?;
        if (correctionData != null) {
          final corrections = correctionData
              .map((e) => AttendanceCorrectionRequest.fromJson(e as Map<String, dynamic>))
              .toList();
          await notifService.notifyCorrectionStatusChanges(corrections);
        }
      } catch (_) {}

    } catch (_) {}

    return Future.value(true);
  });
}
