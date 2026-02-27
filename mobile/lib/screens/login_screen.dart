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

    return Scaffold(
      backgroundColor: AppTheme.background(context),
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeIn,
          child: SlideTransition(
            position: _slideIn,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final maxW = constraints.maxWidth.clamp(0, 420).toDouble();
                return Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxW),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        children: [
                          const Spacer(flex: 2),
                          Image.asset(
                            'assets/logo.png',
                            width: 72,
                            height: 72,
                            fit: BoxFit.contain,
                          ),
                          const SizedBox(height: 28),
                          Text(
                            'Welcome Back',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.headlineMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.textPrimary(context),
                                  letterSpacing: -0.6,
                                ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Sign in to your employee account',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: AppTheme.textSecondary(context),
                                  fontWeight: FontWeight.w500,
                                ),
                          ),
                          const SizedBox(height: 44),
                          _UnderlineFloatingField(
                            controller: _loginController,
                            focusNode: _loginFocus,
                            keyboardType: TextInputType.text,
                            textInputAction: TextInputAction.next,
                            icon: Icons.work_outline,
                            label: 'Employee ID / Email',
                            onSubmitted: (_) => FocusScope.of(
                              context,
                            ).requestFocus(_passwordFocus),
                          ),
                          const SizedBox(height: 26),
                          _UnderlineFloatingField(
                            controller: _passwordController,
                            focusNode: _passwordFocus,
                            keyboardType: TextInputType.visiblePassword,
                            textInputAction: TextInputAction.done,
                            icon: Icons.lock_open,
                            label: 'Password',
                            obscureText: _obscurePassword,
                            suffix: IconButton(
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
                            onSubmitted: (_) => _handleLogin(),
                          ),
                          const SizedBox(height: 30),
                          SizedBox(
                            width: double.infinity,
                            height: 54,
                            child: ElevatedButton(
                              onPressed: auth.isLoading ? null : _handleLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryBlue,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                elevation: 0,
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
                                  : const Text(
                                      'Continue',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                            ),
                          ),
                          const Spacer(flex: 3),
                          if (auth.isBiometricAvailable &&
                              auth.isBiometricEnabled)
                            IconButton(
                              onPressed: _handleBiometricLogin,
                              iconSize: 32,
                              icon: Icon(
                                Icons.fingerprint,
                                color: AppTheme.textSecondary(context),
                              ),
                              style: IconButton.styleFrom(
                                backgroundColor: AppTheme.card(context),
                                padding: const EdgeInsets.all(14),
                                shape: const CircleBorder(),
                                side: BorderSide(
                                  color: AppTheme.divider(context),
                                ),
                              ),
                            ),
                          const SizedBox(height: 14),
                          Text(
                            'Help & Security',
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(
                                  color: AppTheme.textLight(context),
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.2,
                                ),
                          ),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ),
                );
              },
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
}

class _UnderlineFloatingField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final TextInputType keyboardType;
  final TextInputAction textInputAction;
  final IconData icon;
  final String label;
  final bool obscureText;
  final Widget? suffix;
  final void Function(String)? onSubmitted;

  const _UnderlineFloatingField({
    required this.controller,
    required this.focusNode,
    required this.keyboardType,
    required this.textInputAction,
    required this.icon,
    required this.label,
    this.obscureText = false,
    this.suffix,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    final baseColor = AppTheme.textLight(context);
    final activeColor = AppTheme.primaryBlue;

    return TextField(
      controller: controller,
      focusNode: focusNode,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      obscureText: obscureText,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        labelText: label,
        floatingLabelBehavior: FloatingLabelBehavior.auto,
        prefixIcon: Icon(icon, color: baseColor),
        suffixIcon: suffix,
        border: const UnderlineInputBorder(),
        enabledBorder: UnderlineInputBorder(
          borderSide: BorderSide(color: AppTheme.divider(context)),
        ),
        focusedBorder: UnderlineInputBorder(
          borderSide: BorderSide(color: activeColor, width: 1.6),
        ),
      ),
    );
  }
}
