import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api = ApiService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> login({
    required String login,
    required String password,
    required String deviceIdentifier,
    String deviceName = 'flutter_mobile',
  }) async {
    final result = await _api.post('/auth/login', body: {
      'login': login,
      'password': password,
      'device_identifier': deviceIdentifier,
      'device_name': deviceName,
    });

    final token = result['token'] as String;
    await _api.setToken(token);

    // Store user data
    final user = User.fromJson(result['user'] as Map<String, dynamic>);
    await _storage.write(key: 'user_data', value: jsonEncode(result['user']));

    return {
      'token': token,
      'user': user,
      'must_change_password': result['must_change_password'] ?? false,
    };
  }

  Future<User?> loadStoredUser() async {
    final token = await _api.getToken();
    if (token == null) return null;

    final userData = await _storage.read(key: 'user_data');
    if (userData == null) return null;

    return User.fromJson(jsonDecode(userData) as Map<String, dynamic>);
  }

  Future<void> logout() async {
    await _api.clearToken();
    await _storage.delete(key: 'user_data');
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _api.post('/auth/change-password', body: {
      'current_password': currentPassword,
      'new_password': newPassword,
      'new_password_confirmation': newPassword,
    });
  }
}
