import 'package:flutter/foundation.dart';

class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: kReleaseMode
        ? 'https://apiat.mirachpos.com/api'
        : 'http://10.0.2.2:8000/api',
  );
  static const Duration timeout = Duration(seconds: 30);
}
