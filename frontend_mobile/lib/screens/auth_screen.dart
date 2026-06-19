import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api.dart';
import '../data/repository.dart';
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
          : {
              'name': nameController.text,
              'email': emailController.text,
              'password': passwordController.text
            };

      final response = await ApiService.post(endpoint, payload);

      if (response['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', response['token']);

        // Trigger initial offline-first sync
        await Repository().onLoginSuccess();

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
              const Icon(Icons.shopping_cart_rounded, size: 56, color: Color(0xFF9333EA)),
              const SizedBox(height: 8),
              const Text('GrocerySync', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              Text(
                isLogin ? 'Welcome back' : 'Create an account',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                isLogin
                    ? 'Enter your credentials to access your account'
                    : 'Enter your details below to get started',
                style: const TextStyle(color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              if (error.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(error,
                      style: const TextStyle(color: Colors.red),
                      textAlign: TextAlign.center),
                ),
                const SizedBox(height: 16),
              ],
              if (!isLogin) ...[
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.person_outline),
                    hintText: 'Your full name',
                    labelText: 'Name',
                  ),
                ),
                const SizedBox(height: 16),
              ],
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.email_outlined),
                  hintText: 'name@example.com',
                  labelText: 'Email',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.lock_outline),
                  hintText: '••••••••',
                  labelText: 'Password',
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: isLoading ? null : submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF9333EA),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(isLogin ? 'Sign In' : 'Create Account',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => setState(() {
                  isLogin = !isLogin;
                  error = '';
                }),
                child: Text(
                  isLogin
                      ? "Don't have an account? Sign up"
                      : "Already have an account? Sign in",
                  style: const TextStyle(color: Color(0xFF9333EA)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
