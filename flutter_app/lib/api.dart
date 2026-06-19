import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static String get _baseUrl {
    // Handling localhost routing for Web, iOS (localhost works), and Android Emulator (10.0.2.2 is mapped host).
    if (kIsWeb) return 'http://localhost:3000/api';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:3000/api';
    } catch(e) {} 
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

  static Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('$_baseUrl$endpoint');
    final response = await http.post(url, headers: await _getHeaders(), body: jsonEncode(body));
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> get(String endpoint) async {
    final url = Uri.parse('$_baseUrl$endpoint');
    final response = await http.get(url, headers: await _getHeaders());
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> put(String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('$_baseUrl$endpoint');
    final response = await http.put(url, headers: await _getHeaders(), body: jsonEncode(body));
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> delete(String endpoint) async {
    final url = Uri.parse('$_baseUrl$endpoint');
    final response = await http.delete(url, headers: await _getHeaders());
    return jsonDecode(response.body);
  }
}
