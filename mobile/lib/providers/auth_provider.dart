import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final LocalAuthentication _localAuth = LocalAuthentication();

  static const _autoLogoutKey = 'auto_logout_minutes';
  static const _lastActiveKey = 'last_active_ms';

  User? _user;
  bool _isLoading = true;
  String? _error;
  String? _deviceIdentifier;
  String? _deviceName;
  bool _isBiometricAvailable = false;
  bool _isBiometricEnabled = false;
  String? _profileImagePath;
  int? _autoLogoutMinutes;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get error => _error;
  bool get isBiometricAvailable => _isBiometricAvailable;
  bool get isBiometricEnabled => _isBiometricEnabled;
  String? get profileImagePath => _profileImagePath;
  int? get autoLogoutMinutes => _autoLogoutMinutes;

  String get deviceIdentifier =>
      _deviceIdentifier ?? 'flutter_${Platform.operatingSystem}_unknown';

  String get deviceName => _deviceName ?? 'Flutter ${Platform.operatingSystem}';

  String _generateStableId() {
    final random = Random.secure();
    int nextByte() => random.nextInt(256);
    String hex(int v) => v.toRadixString(16).padLeft(2, '0');

    final bytes = List<int>.generate(16, (_) => nextByte());
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    final b = bytes.map(hex).join();
    return '${b.substring(0, 8)}-${b.substring(8, 12)}-${b.substring(12, 16)}-${b.substring(16, 20)}-${b.substring(20)}';
  }

  Future<void> _initDeviceIdentifier() async {
    _deviceIdentifier = await _storage.read(key: 'device_identifier');

    if (_deviceIdentifier == null || _deviceIdentifier!.trim().isEmpty) {
      _deviceIdentifier = '${Platform.operatingSystem}_${_generateStableId()}';
      await _storage.write(key: 'device_identifier', value: _deviceIdentifier!);
    }

    _deviceName = await _storage.read(key: 'device_name');
    if (_deviceName == null || _deviceName!.trim().isEmpty) {
      _deviceName = await _resolveDeviceName();
      await _storage.write(key: 'device_name', value: _deviceName!);
    }
  }

  Future<String> _resolveDeviceName() async {
    try {
      final plugin = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final info = await plugin.androidInfo;
        final brand = info.brand.trim();
        final model = info.model.trim();
        final device = info.device.trim();
        final label = brand.isEmpty ? model : '$brand $model';
        return label.trim().isEmpty ? device : label;
      }

      if (Platform.isIOS) {
        final info = await plugin.iosInfo;
        final name = info.name.trim();
        final model = info.model.trim();
        final system = info.systemName.trim();
        if (name.isNotEmpty) return name;
        if (model.isNotEmpty) return model;
        if (system.isNotEmpty) return system;
      }

      return 'Flutter ${Platform.operatingSystem}';
    } catch (_) {
      return 'Flutter ${Platform.operatingSystem}';
    }
  }

  Future<void> _checkBiometricAvailability() async {
    try {
      final isAvailable = await _localAuth.isDeviceSupported();
      final canCheckBio = await _localAuth.canCheckBiometrics;
      _isBiometricAvailable = isAvailable && canCheckBio;

      final enabledFlag = await _storage.read(key: 'biometric_enabled');
      _isBiometricEnabled = enabledFlag == 'true' && _isBiometricAvailable;
    } catch (_) {
      _isBiometricAvailable = false;
      _isBiometricEnabled = false;
    }
  }

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _initDeviceIdentifier();
      await _checkBiometricAvailability();
      _user = await _authService.loadStoredUser();
      _profileImagePath = await _storage.read(key: 'profile_image_path');
      await _loadAutoLogoutSetting();
    } catch (e) {
      _user = null;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String login, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (_deviceIdentifier == null) {
        await _initDeviceIdentifier();
      }

      final result = await _authService.login(
        login: login,
        password: password,
        deviceIdentifier: deviceIdentifier,
        deviceName: deviceName,
      );

      _user = result['user'] as User;
      _profileImagePath = await _storage.read(key: 'profile_image_path');
      await recordActivity();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Biometric login — reuses stored credentials
  Future<bool> loginWithBiometrics() async {
    if (!_isBiometricAvailable || !_isBiometricEnabled) {
      _error = 'Biometric authentication is not enabled';
      notifyListeners();
      return false;
    }

    try {
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Authenticate to sign in to BAIS',
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );

      if (!authenticated) {
        _error = 'Biometric authentication cancelled';
        notifyListeners();
        return false;
      }

      // Load stored credentials
      final savedLogin = await _storage.read(key: 'biometric_login_id');
      final savedPassword = await _storage.read(key: 'biometric_password');

      if (savedLogin == null || savedPassword == null) {
        _error =
            'No saved credentials found. Please log in with your password first.';
        notifyListeners();
        return false;
      }

      return await login(savedLogin, savedPassword);
    } catch (e) {
      _error = 'Biometric authentication failed: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  /// Enable biometric — verifies password first, then stores credentials
  Future<bool> enableBiometric({
    required String loginId,
    required String password,
  }) async {
    if (!_isBiometricAvailable) {
      _error = 'Biometric authentication is not supported on this device';
      notifyListeners();
      return false;
    }

    // Verify credentials before enabling biometric
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Try to authenticate with these credentials first
      if (_deviceIdentifier == null) await _initDeviceIdentifier();
      await _authService.login(
        login: loginId,
        password: password,
        deviceIdentifier: deviceIdentifier,
        deviceName: deviceName,
      );

      // Authenticate biometrically to confirm
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Confirm your identity to enable biometric login',
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );

      if (!authenticated) {
        _error = 'Biometric confirmation cancelled';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Store credentials securely
      await _storage.write(key: 'biometric_login_id', value: loginId);
      await _storage.write(key: 'biometric_password', value: password);
      await _storage.write(key: 'biometric_enabled', value: 'true');
      _isBiometricEnabled = true;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> disableBiometric() async {
    await _storage.delete(key: 'biometric_login_id');
    await _storage.delete(key: 'biometric_password');
    await _storage.write(key: 'biometric_enabled', value: 'false');
    _isBiometricEnabled = false;
    notifyListeners();
  }

  Future<void> updateProfileImage(String path) async {
    _profileImagePath = path;
    await _storage.write(key: 'profile_image_path', value: path);
    notifyListeners();
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _profileImagePath = null;
    await _storage.delete(key: _lastActiveKey);
    notifyListeners();
  }

  Future<void> recordActivity() async {
    if (!isAuthenticated) return;
    await _storage.write(
      key: _lastActiveKey,
      value: DateTime.now().millisecondsSinceEpoch.toString(),
    );
  }

  Future<void> handleLifecycleResume() async {
    if (!isAuthenticated) return;

    final minutes = _autoLogoutMinutes;
    if (minutes == null) {
      await recordActivity();
      return;
    }

    final raw = await _storage.read(key: _lastActiveKey);
    final lastMs = int.tryParse(raw ?? '');
    if (lastMs == null) {
      await recordActivity();
      return;
    }

    final delta = DateTime.now().millisecondsSinceEpoch - lastMs;
    final maxMs = minutes * 60 * 1000;
    if (delta >= maxMs) {
      await logout();
      return;
    }

    await recordActivity();
  }

  Future<void> handleLifecyclePause() async {
    await recordActivity();
  }

  Future<void> setAutoLogoutMinutes(int? minutes) async {
    _autoLogoutMinutes = minutes;
    await _storage.write(key: _autoLogoutKey, value: minutes?.toString() ?? '');
    notifyListeners();
  }

  Future<void> _loadAutoLogoutSetting() async {
    final raw = await _storage.read(key: _autoLogoutKey);
    if (raw == null) {
      _autoLogoutMinutes = 30;
      await _storage.write(key: _autoLogoutKey, value: '30');
      return;
    }

    if (raw.trim().isEmpty) {
      _autoLogoutMinutes = null;
      return;
    }

    _autoLogoutMinutes = int.tryParse(raw) ?? 30;
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
