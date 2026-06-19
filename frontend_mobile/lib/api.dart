import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static String get _baseUrl {
    // Android Emulator: 10.0.2.2 maps to host machine's localhost
    if (kIsWeb) return 'http://localhost:3000/api';
    // Use the machine's local IP address so physical devices on the same Wi-Fi can connect
    return 'http://192.168.29.193:3000/api';
    return 'http://localhost:3000/api';
  }

  static Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<Map<String, dynamic>> post(
      String endpoint, Map<String, dynamic> body) async {
    try {
      final url = Uri.parse('$_baseUrl$endpoint');
      final response = await http.post(url,
          headers: await _getHeaders(), body: jsonEncode(body));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> get(String endpoint) async {
    try {
      final url = Uri.parse('$_baseUrl$endpoint');
      final response =
          await http.get(url, headers: await _getHeaders());
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> put(
      String endpoint, Map<String, dynamic> body) async {
    try {
      final url = Uri.parse('$_baseUrl$endpoint');
      final response = await http.put(url,
          headers: await _getHeaders(), body: jsonEncode(body));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> delete(String endpoint) async {
    try {
      final url = Uri.parse('$_baseUrl$endpoint');
      final response =
          await http.delete(url, headers: await _getHeaders());
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
