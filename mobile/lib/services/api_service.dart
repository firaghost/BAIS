import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _token;

  Future<void> setToken(String token) async {
    _token = token;
    await _storage.write(key: 'auth_token', value: token);
  }

  Future<String?> getToken() async {
    _token ??= await _storage.read(key: 'auth_token');
    return _token;
  }

  Future<void> clearToken() async {
    _token = null;
    await _storage.delete(key: 'auth_token');
  }

  Future<Map<String, String>> _headers() async {
    await getToken();
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParams,
  }) async {
    final uri = Uri.parse(
      '${ApiConfig.baseUrl}$endpoint',
    ).replace(queryParameters: queryParams);

    try {
      final response = await http
          .get(uri, headers: await _headers())
          .timeout(ApiConfig.timeout);
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(0, 'Request timed out. Please try again.');
    } on SocketException {
      throw ApiException(0, 'No internet connection. Please try again.');
    } on http.ClientException {
      throw ApiException(0, 'Network error. Please try again.');
    }
  }

  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint');

    try {
      final response = await http
          .post(
            uri,
            headers: await _headers(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(ApiConfig.timeout);
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(0, 'Request timed out. Please try again.');
    } on SocketException {
      throw ApiException(0, 'No internet connection. Please try again.');
    } on http.ClientException {
      throw ApiException(0, 'Network error. Please try again.');
    }
  }

  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint');

    try {
      final response = await http
          .put(
            uri,
            headers: await _headers(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(ApiConfig.timeout);
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(0, 'Request timed out. Please try again.');
    } on SocketException {
      throw ApiException(0, 'No internet connection. Please try again.');
    } on http.ClientException {
      throw ApiException(0, 'Network error. Please try again.');
    }
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    final raw = response.body.trim();

    Map<String, dynamic> body;
    if (raw.isEmpty) {
      body = <String, dynamic>{};
    } else {
      try {
        final decoded = jsonDecode(raw);
        body = decoded is Map<String, dynamic>
            ? decoded
            : <String, dynamic>{'message': 'Invalid server response'};
      } catch (_) {
        body = <String, dynamic>{'message': 'Invalid server response'};
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    final message = body['message'] as String? ?? 'Request failed';
    throw ApiException(response.statusCode, message, body);
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final Map<String, dynamic>? body;

  ApiException(this.statusCode, this.message, [this.body]);

  @override
  String toString() => 'ApiException($statusCode): $message';
}
