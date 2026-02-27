import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_notification.dart';

class NotificationsProvider extends ChangeNotifier {
  static const _storageKey = 'in_app_notifications_v1';
  static const _maxItems = 50;

  final List<AppNotification> _items = [];
  bool _loaded = false;

  List<AppNotification> get items => List.unmodifiable(_items);

  int get unreadCount => _items.where((n) => !n.isRead).length;

  Future<void> ensureLoaded() async {
    if (_loaded) return;
    _loaded = true;

    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw == null || raw.trim().isEmpty) {
        notifyListeners();
        return;
      }

      final parsed = jsonDecode(raw);
      if (parsed is! List) {
        notifyListeners();
        return;
      }

      _items
        ..clear()
        ..addAll(
          parsed
              .whereType<Map>()
              .map((m) => m.cast<String, dynamic>())
              .map(AppNotification.fromJson)
              .toList(),
        );

      _items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } catch (_) {
      _items.clear();
    }

    notifyListeners();
  }

  Future<void> add({
    required int id,
    required String title,
    required String body,
    DateTime? createdAt,
  }) async {
    await ensureLoaded();

    final now = createdAt ?? DateTime.now();

    _items.removeWhere((n) => n.id == id);
    _items.insert(
      0,
      AppNotification(
        id: id,
        title: title,
        body: body,
        createdAt: now,
        isRead: false,
      ),
    );

    if (_items.length > _maxItems) {
      _items.removeRange(_maxItems, _items.length);
    }

    await _persist();
    notifyListeners();
  }

  Future<void> markAllRead() async {
    await ensureLoaded();

    for (var i = 0; i < _items.length; i++) {
      if (!_items[i].isRead) {
        _items[i] = _items[i].copyWith(isRead: true);
      }
    }

    await _persist();
    notifyListeners();
  }

  Future<void> markRead(int id) async {
    await ensureLoaded();

    for (var i = 0; i < _items.length; i++) {
      if (_items[i].id == id && !_items[i].isRead) {
        _items[i] = _items[i].copyWith(isRead: true);
        await _persist();
        notifyListeners();
        return;
      }
    }
  }

  Future<void> clear() async {
    await ensureLoaded();
    _items.clear();
    await _persist();
    notifyListeners();
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = jsonEncode(_items.map((n) => n.toJson()).toList());
      await prefs.setString(_storageKey, raw);
    } catch (_) {}
  }
}
