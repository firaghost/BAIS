import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _loginController = TextEditingController();
  final _passwordController = TextEditingController();
  final _loginFocus = FocusNode();
  final _passwordFocus = FocusNode();
  bool _obscurePassword = true;
  bool _rememberLogin = true;
  late AnimationController _animController;
  late Animation<double> _fadeIn;
  late Animation<Offset> _slideIn;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fadeIn = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideIn = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOut));
    _animController.forward();
    _loadSavedLogin();
  }

  @override
  void dispose() {
    _loginController.dispose();
    _passwordController.dispose();
    _loginFocus.dispose();
    _passwordFocus.dispose();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _loadSavedLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('saved_login_id');
    if (saved != null && mounted) {
      setState(() {
        _loginController.text = saved;
        _rememberLogin = true;
      });
    }
  }

  Future<void> _saveLoginIfNeeded(String login) async {
    final prefs = await SharedPreferences.getInstance();
    if (_rememberLogin) {
      await prefs.setString('saved_login_id', login);
    } else {
      await prefs.remove('saved_login_id');
    }
  }

  void _handleLogin() async {
    final login = _normalizeLogin(_loginController.text);
    final password = _passwordController.text;

    if (login.isEmpty || password.isEmpty) {
      _showError('Please enter your Employee ID or email and password');
      return;
    }

    final auth = context.read<AuthProvider>();
    await _saveLoginIfNeeded(login);
    final success = await auth.login(login, password);

    if (!success && mounted) {
      _showError(auth.error ?? 'Login failed. Please check your credentials.');
    }
  }

  void _handleBiometricLogin() async {
    final auth = context.read<AuthProvider>();
    final success = await auth.loginWithBiometrics();
    if (!success && mounted) {
      _showError(auth.error ?? 'Biometric authentication failed');
    }
  }

  void _showError(String message) {
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white, size: 18),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: AppTheme.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppTheme.background(context),
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeIn,
          child: SlideTransition(
            position: _slideIn,
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 48),
                  // Logo & Brand
                  Center(
                    child: Column(
                      children: [
                        Image.asset(
                          'assets/logo.png',
                          width: 84,
                          height: 84,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: 18),
                        Text(
                          'Sign in',
                          style: Theme.of(context).textTheme.headlineMedium
                              ?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textPrimary(context),
                                letterSpacing: -0.5,
                              ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Card form
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppTheme.card(context),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: isDark
                              ? Colors.black.withValues(alpha: 0.3)
                              : Colors.black.withValues(alpha: 0.06),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Employee ID / Email
                        _buildLabel('EMPLOYEE ID OR EMAIL', context),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _loginController,
                          focusNode: _loginFocus,
                          keyboardType: TextInputType.text,
                          textInputAction: TextInputAction.next,
                          onSubmitted: (_) => FocusScope.of(
                            context,
                          ).requestFocus(_passwordFocus),
                          decoration: InputDecoration(
                            hintText: 'SDB0012025 or name@company.com',
                            prefixIcon: Icon(
                              Icons.person_outline,
                              color: AppTheme.textLight(context),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Password
                        _buildLabel('PASSWORD', context),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _passwordController,
                          focusNode: _passwordFocus,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _handleLogin(),
                          decoration: InputDecoration(
                            hintText: 'Enter your password',
                            prefixIcon: Icon(
                              Icons.lock_outline,
                              color: AppTheme.textLight(context),
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                                color: AppTheme.textLight(context),
                              ),
                              onPressed: () => setState(
                                () => _obscurePassword = !_obscurePassword,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Remember me + Forgot
                        Row(
                          children: [
                            GestureDetector(
                              onTap: () => setState(
                                () => _rememberLogin = !_rememberLogin,
                              ),
                              child: Row(
                                children: [
                                  AnimatedContainer(
                                    duration: const Duration(milliseconds: 200),
                                    width: 20,
                                    height: 20,
                                    decoration: BoxDecoration(
                                      color: _rememberLogin
                                          ? AppTheme.primaryBlue
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(5),
                                      border: Border.all(
                                        color: _rememberLogin
                                            ? AppTheme.primaryBlue
                                            : AppTheme.divider(context),
                                        width: 1.5,
                                      ),
                                    ),
                                    child: _rememberLogin
                                        ? const Icon(
                                            Icons.check,
                                            color: Colors.white,
                                            size: 13,
                                          )
                                        : null,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Remember me',
                                    style: Theme.of(context).textTheme.bodySmall
                                        ?.copyWith(
                                          color: AppTheme.textSecondary(
                                            context,
                                          ),
                                          fontWeight: FontWeight.w500,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Login Button
                        SizedBox(
                          width: double.infinity,
                          height: 54,
                          child: ElevatedButton(
                            onPressed: auth.isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryBlue,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              elevation: 0,
                              shadowColor: AppTheme.primaryBlue.withValues(
                                alpha: 0.3,
                              ),
                            ),
                            child: auth.isLoading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.lock_rounded, size: 18),
                                      const SizedBox(width: 8),
                                      const Text(
                                        'Secure Login',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.3,
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Biometric section
                  if (auth.isBiometricAvailable && auth.isBiometricEnabled) ...[
                    Row(
                      children: [
                        Expanded(
                          child: Divider(color: AppTheme.divider(context)),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'OR',
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(
                                  color: AppTheme.textLight(context),
                                  letterSpacing: 2,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ),
                        Expanded(
                          child: Divider(color: AppTheme.divider(context)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Center(
                      child: GestureDetector(
                        onTap: _handleBiometricLogin,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 32,
                            vertical: 16,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.card(context),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: AppTheme.divider(context),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: isDark
                                    ? Colors.black.withValues(alpha: 0.2)
                                    : Colors.black.withValues(alpha: 0.04),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.fingerprint_rounded,
                                size: 44,
                                color: AppTheme.primaryBlue,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Tap to use Biometrics',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color: AppTheme.textSecondary(context),
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _normalizeLogin(String value) {
    final trimmed = value.trim();
    if (trimmed.contains('@')) {
      return trimmed;
    }

    return trimmed.replaceAll(RegExp(r'[^A-Za-z0-9]'), '');
  }

  Widget _buildLabel(String text, BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
        fontWeight: FontWeight.w700,
        color: AppTheme.textSecondary(context),
        letterSpacing: 1.5,
      ),
    );
  }
}
