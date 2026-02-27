import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'dart:convert';

import '../models/leave_request.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  static const _channelId = 'bais_general';
  static const _channelName = 'BAIS Notifications';

  static const _clockInNotificationId = 1001;
  static const _fixedReminderBaseId = 11000;

  static const _inAppStorageKey = 'in_app_notifications_v1';
  static const _inAppMaxItems = 50;

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) {
      return;
    }
    tz.initializeTimeZones();

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);

    await _plugin.initialize(initSettings);

    final android = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();

    await android?.requestNotificationsPermission();

    _initialized = true;
  }

  Future<void> scheduleFixedMorningCheckInRemindersMonSat() async {
    if (!_initialized) {
      await init();
    }

    const times = <({int hour, int minute, int offsetMinutes})>[
      (hour: 7, minute: 30, offsetMinutes: 30),
      (hour: 7, minute: 40, offsetMinutes: 20),
      (hour: 7, minute: 50, offsetMinutes: 10),
      (hour: 7, minute: 55, offsetMinutes: 5),
    ];

    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        _channelId,
        _channelName,
        importance: Importance.high,
        priority: Priority.high,
      ),
    );

    for (
      var weekday = DateTime.monday;
      weekday <= DateTime.saturday;
      weekday++
    ) {
      for (var idx = 0; idx < times.length; idx++) {
        await _plugin.cancel(_fixedReminderId(weekday: weekday, index: idx));
      }
    }

    final now = tz.TZDateTime.now(tz.local);
    for (
      var weekday = DateTime.monday;
      weekday <= DateTime.saturday;
      weekday++
    ) {
      for (var idx = 0; idx < times.length; idx++) {
        final t = times[idx];
        final scheduled = _nextWeekdayTime(
          now: now,
          weekday: weekday,
          hour: t.hour,
          minute: t.minute,
        );

        await _zonedScheduleWithFallback(
          id: _fixedReminderId(weekday: weekday, index: idx),
          title: 'Clock-in reminder',
          body: 'Check in in ${t.offsetMinutes} minutes.',
          scheduledDate: scheduled,
          notificationDetails: details,
          matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
        );
      }
    }
  }

  int _fixedReminderId({required int weekday, required int index}) {
    return _fixedReminderBaseId + (weekday * 10) + index;
  }

  tz.TZDateTime _nextWeekdayTime({
    required tz.TZDateTime now,
    required int weekday,
    required int hour,
    required int minute,
  }) {
    final daysAhead = (weekday - now.weekday) % 7;
    var scheduled = tz.TZDateTime(
      tz.local,
      now.year,
      now.month,
      now.day,
      hour,
      minute,
    ).add(Duration(days: daysAhead));

    if (!scheduled.isAfter(now)) {
      scheduled = scheduled.add(const Duration(days: 7));
    }

    return scheduled;
  }

  Future<void> scheduleNextClockInReminder({
    required String shiftStartTime,
    int minutesBefore = 15,
  }) async {
    if (!_initialized) {
      await init();
    }

    final scheduled = _nextOccurrence(shiftStartTime, minutesBefore);
    if (scheduled == null) {
      return;
    }

    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        _channelId,
        _channelName,
        importance: Importance.high,
        priority: Priority.high,
      ),
    );

    await _zonedScheduleWithFallback(
      id: _clockInNotificationId,
      title: 'Clock-in reminder',
      body: 'Your shift starts soon. Don\'t forget to clock in.',
      scheduledDate: scheduled,
      notificationDetails: details,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  Future<void> _zonedScheduleWithFallback({
    required int id,
    required String title,
    required String body,
    required tz.TZDateTime scheduledDate,
    required NotificationDetails notificationDetails,
    required DateTimeComponents matchDateTimeComponents,
  }) async {
    try {
      await _plugin.zonedSchedule(
        id,
        title,
        body,
        scheduledDate,
        notificationDetails,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: matchDateTimeComponents,
      );
    } on PlatformException catch (e) {
      if (e.code != 'exact_alarms_not_permitted') {
        rethrow;
      }

      await _plugin.zonedSchedule(
        id,
        title,
        body,
        scheduledDate,
        notificationDetails,
        androidScheduleMode: AndroidScheduleMode.inexact,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: matchDateTimeComponents,
      );
    }
  }

  tz.TZDateTime? _nextOccurrence(String startTime, int minutesBefore) {
    final parts = startTime.split(':');
    if (parts.length < 2) {
      return null;
    }

    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) {
      return null;
    }

    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(
      tz.local,
      now.year,
      now.month,
      now.day,
      hour,
      minute,
    ).subtract(Duration(minutes: minutesBefore));

    if (scheduled.isBefore(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }

    while (scheduled.weekday == DateTime.sunday) {
      scheduled = scheduled.add(const Duration(days: 1));
    }

    return scheduled;
  }

  Future<void> notifyLeaveStatusChanges(List<LeaveRequest> requests) async {
    if (!_initialized) {
      await init();
    }

    final prefs = await SharedPreferences.getInstance();

    for (final r in requests) {
      final key = 'leave_status_${r.id}';
      final last = prefs.getString(key);
      final current = r.status;

      if (last == null) {
        await prefs.setString(key, current);
        continue;
      }

      if (last == current) {
        continue;
      }

      await prefs.setString(key, current);

      final title = 'Leave request update';
      final body = current == 'approved'
          ? 'Your leave request has been approved.'
          : current == 'rejected'
          ? 'Your leave request has been rejected.'
          : 'Your leave request status changed to ${r.statusLabel}.';

      final details = NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          importance: Importance.defaultImportance,
          priority: Priority.defaultPriority,
        ),
      );

      await _appendInAppNotification(
        id: 200000 + r.id,
        title: title,
        body: body,
        createdAt: DateTime.now(),
      );

      await _plugin.show(200000 + r.id, title, body, details);
    }
  }

  Future<void> _appendInAppNotification({
    required int id,
    required String title,
    required String body,
    required DateTime createdAt,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_inAppStorageKey);

      final List<dynamic> list = raw == null || raw.trim().isEmpty
          ? <dynamic>[]
          : (jsonDecode(raw) as List<dynamic>);

      final next = <Map<String, dynamic>>[];

      for (final item in list) {
        if (item is Map) {
          final m = item.cast<String, dynamic>();
          if ((m['id'] as num?)?.toInt() == id) {
            continue;
          }
          next.add(m);
        }
      }

      next.insert(0, {
        'id': id,
        'title': title,
        'body': body,
        'created_at': createdAt.toIso8601String(),
        'is_read': false,
      });

      if (next.length > _inAppMaxItems) {
        next.removeRange(_inAppMaxItems, next.length);
      }

      await prefs.setString(_inAppStorageKey, jsonEncode(next));
    } catch (_) {}
  }
}
