class ApiConfig {
  // For Android emulator use 10.0.2.2, for real device use your machine's IP
  static const String baseUrl = 'http://10.0.2.2:8000/api';
  static const Duration timeout = Duration(seconds: 30);
}
