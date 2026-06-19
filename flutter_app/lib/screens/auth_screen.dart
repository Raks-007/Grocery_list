import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api.dart';
import 'dashboard_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool isLogin = false;
  bool isLoading = false;
  String error = '';

  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  Future<void> submit() async {
    setState(() {
      isLoading = true;
      error = '';
    });

    try {
      final endpoint = isLogin ? '/auth/login' : '/auth/register';
      final payload = isLogin 
        ? {'email': emailController.text, 'password': passwordController.text}
        : {'name': nameController.text, 'email': emailController.text, 'password': passwordController.text};

      final response = await ApiService.post(endpoint, payload);

      if (response['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', response['token']);
        
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen()),
        );
      } else {
        setState(() => error = response['message'] ?? 'Authentication failed');
      }
    } catch (e) {
      setState(() => error = 'An unexpected error occurred.');
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(LucideIcons.package, size: 48, color: Colors.white),
              const SizedBox(height: 24),
              Text(
                isLogin ? 'Welcome back' : 'Create an account',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                isLogin ? 'Enter your credentials to access your account' : 'Enter your details below to get started',
                style: const TextStyle(color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              if (error.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    border: Border.all(color: Colors.red.withOpacity(0.2)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(error, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
                ),
                const SizedBox(height: 16),
              ],
              if (!isLogin) ...[
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(LucideIcons.user, size: 18),
                    hintText: 'Alex Doe',
                    filled: true,
                    fillColor: Color(0xFF18181B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  prefixIcon: Icon(LucideIcons.mail, size: 18),
                  hintText: 'name@example.com',
                  filled: true,
                  fillColor: Color(0xFF18181B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  prefixIcon: Icon(LucideIcons.lock, size: 18),
                  hintText: '••••••••',
                  filled: true,
                  fillColor: Color(0xFF18181B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: isLoading ? null : submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black))
                    : Text(isLogin ? 'Sign In' : 'Create Account'),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  setState(() {
                    isLogin = !isLogin;
                    error = '';
                  });
                },
                child: Text(
                  isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in",
                  style: const TextStyle(color: Colors.grey),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
