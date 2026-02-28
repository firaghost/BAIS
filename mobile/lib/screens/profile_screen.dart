import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../theme/app_theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final AuthService _authService = AuthService();
  final NotificationService _notificationService = NotificationService();

  void _showAutoLogoutSheet(AuthProvider auth) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppTheme.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final current = auth.autoLogoutMinutes;

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.divider(ctx),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Auto Logout',
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textPrimary(ctx),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Choose how long the app can stay idle before signing you out.',
                  style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                    color: AppTheme.textSecondary(ctx),
                  ),
                ),
                const SizedBox(height: 16),
                _autoLogoutOption(
                  ctx,
                  label: '30 minutes (default)',
                  valueMinutes: 30,
                  selectedMinutes: current,
                  onSelect: () => auth.setAutoLogoutMinutes(30),
                ),
                _autoLogoutOption(
                  ctx,
                  label: '1 hour',
                  valueMinutes: 60,
                  selectedMinutes: current,
                  onSelect: () => auth.setAutoLogoutMinutes(60),
                ),
                _autoLogoutOption(
                  ctx,
                  label: '8 hours',
                  valueMinutes: 480,
                  selectedMinutes: current,
                  onSelect: () => auth.setAutoLogoutMinutes(480),
                ),
                _autoLogoutOption(
                  ctx,
                  label: 'Never',
                  valueMinutes: null,
                  selectedMinutes: current,
                  onSelect: () => auth.setAutoLogoutMinutes(null),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Done'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _showNotificationPreferences() async {
    await _notificationService.init();
    final enabled = await _notificationService.isEnabled();
    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppTheme.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        var value = enabled;

        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppTheme.divider(ctx),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Notifications',
                      style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textPrimary(ctx),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Enable reminders for your shift and important updates.',
                      style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textSecondary(ctx),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.card2(ctx).withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.divider(ctx)),
                      ),
                      child: SwitchListTile(
                        title: Text(
                          'Enable notifications',
                          style: TextStyle(
                            color: AppTheme.textPrimary(ctx),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        subtitle: Text(
                          value
                              ? 'Reminders are active.'
                              : 'Reminders are disabled.',
                          style: TextStyle(
                            color: AppTheme.textSecondary(ctx),
                            fontSize: 12,
                          ),
                        ),
                        value: value,
                        activeThumbColor: AppTheme.primaryBlue,
                        onChanged: (next) async {
                          setSheetState(() => value = next);
                          await _notificationService.setEnabled(next);
                        },
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Done'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _autoLogoutOption(
    BuildContext context, {
    required String label,
    required int? valueMinutes,
    required int? selectedMinutes,
    required VoidCallback onSelect,
  }) {
    final selected = valueMinutes == selectedMinutes;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        selected ? Icons.radio_button_checked : Icons.radio_button_off,
        color: selected ? AppTheme.primaryBlue : AppTheme.textLight(context),
      ),
      title: Text(
        label,
        style: TextStyle(
          color: AppTheme.textPrimary(context),
          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
        ),
      ),
      onTap: () {
        Navigator.pop(context);
        onSelect();
      },
    );
  }

  Future<void> _reloadProfile() async {
    final auth = context.read<AuthProvider>();
    await auth.init();
  }

  Future<String> _persistProfileImage(String sourcePath) async {
    final dir = await getApplicationDocumentsDirectory();
    final profileDir = Directory('${dir.path}/profile');
    if (!await profileDir.exists()) {
      await profileDir.create(recursive: true);
    }

    final src = File(sourcePath);
    final ext = sourcePath.contains('.') ? sourcePath.split('.').last : 'jpg';
    final dst = File('${profileDir.path}/avatar.$ext');
    await src.copy(dst.path);
    return dst.path;
  }

  Future<void> _pickProfileImage() async {
    final auth = context.read<AuthProvider>();
    final picker = ImagePicker();

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: AppTheme.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.divider(ctx),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Change Profile Photo',
                style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary(ctx),
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.camera_alt_rounded,
                    color: AppTheme.primaryBlue,
                  ),
                ),
                title: Text(
                  'Take a Photo',
                  style: TextStyle(
                    color: AppTheme.textPrimary(ctx),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.photo_library_rounded,
                    color: AppTheme.primaryBlue,
                  ),
                ),
                title: Text(
                  'Choose from Gallery',
                  style: TextStyle(
                    color: AppTheme.textPrimary(ctx),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
              if (auth.profileImagePath != null &&
                  auth.profileImagePath!.isNotEmpty)
                ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.delete_outline_rounded,
                      color: AppTheme.error,
                    ),
                  ),
                  title: Text(
                    'Remove Photo',
                    style: TextStyle(
                      color: AppTheme.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    auth.updateProfileImage('');
                  },
                ),
            ],
          ),
        ),
      ),
    );

    if (source == null) return;

    final image = await picker.pickImage(
      source: source,
      imageQuality: 75,
      maxWidth: 512,
      maxHeight: 512,
    );
    if (image != null) {
      final persistedPath = await _persistProfileImage(image.path);
      await auth.updateProfileImage(persistedPath);
    }
  }

  void _showChangePasswordDialog() {
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        bool isLoading = false;
        String? errorMsg;
        return StatefulBuilder(
          builder: (ctx, setDialogState) => AlertDialog(
            backgroundColor: AppTheme.card(ctx),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.lock_outline,
                    color: AppTheme.primaryBlue,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'Change Password',
                  style: TextStyle(color: AppTheme.textPrimary(ctx)),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (errorMsg != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      errorMsg!,
                      style: const TextStyle(
                        color: AppTheme.error,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: currentCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Current Password',
                    prefixIcon: Icon(Icons.lock_outline),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: newCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'New Password',
                    prefixIcon: Icon(Icons.lock_reset),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: confirmCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Confirm Password',
                    prefixIcon: Icon(Icons.check_circle_outline),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(
                  'Cancel',
                  style: TextStyle(color: AppTheme.textSecondary(ctx)),
                ),
              ),
              ElevatedButton(
                onPressed: isLoading
                    ? null
                    : () async {
                        if (newCtrl.text != confirmCtrl.text) {
                          setDialogState(
                            () => errorMsg = 'Passwords do not match',
                          );
                          return;
                        }
                        if (newCtrl.text.length < 6) {
                          setDialogState(
                            () => errorMsg =
                                'Password must be at least 6 characters',
                          );
                          return;
                        }
                        setDialogState(() {
                          isLoading = true;
                          errorMsg = null;
                        });
                        try {
                          await _authService.changePassword(
                            currentPassword: currentCtrl.text,
                            newPassword: newCtrl.text,
                          );
                          if (ctx.mounted) {
                            Navigator.pop(ctx);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Text(
                                    'Password updated successfully!',
                                  ),
                                  backgroundColor: AppTheme.success,
                                  behavior: SnackBarBehavior.floating,
                                  margin: const EdgeInsets.all(16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              );
                            }
                          }
                        } catch (e) {
                          setDialogState(() {
                            isLoading = false;
                            errorMsg = e.toString().replaceAll(
                              'Exception: ',
                              '',
                            );
                          });
                        }
                      },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(80, 44),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text('Update'),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showEnableBiometricDialog(AuthProvider auth) {
    final loginCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();
    loginCtrl.text =
        auth.user?.employee?.employeeCode ?? auth.user?.login ?? '';

    showDialog(
      context: context,
      builder: (ctx) {
        bool isLoading = false;
        String? errorMsg;
        bool obscure = true;
        return StatefulBuilder(
          builder: (ctx, setDialogState) => AlertDialog(
            backgroundColor: AppTheme.card(ctx),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.fingerprint,
                    color: AppTheme.primaryBlue,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Enable Biometric Login',
                    style: TextStyle(color: AppTheme.textPrimary(ctx)),
                  ),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Verify your password to enable fingerprint/face login.',
                  style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                    color: AppTheme.textSecondary(ctx),
                  ),
                ),
                const SizedBox(height: 16),
                if (errorMsg != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      errorMsg!,
                      style: const TextStyle(
                        color: AppTheme.error,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: loginCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Employee ID',
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passwordCtrl,
                  obscureText: obscure,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        obscure
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                      ),
                      onPressed: () => setDialogState(() => obscure = !obscure),
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(
                  'Cancel',
                  style: TextStyle(color: AppTheme.textSecondary(ctx)),
                ),
              ),
              ElevatedButton(
                onPressed: isLoading
                    ? null
                    : () async {
                        if (loginCtrl.text.isEmpty ||
                            passwordCtrl.text.isEmpty) {
                          setDialogState(
                            () => errorMsg = 'Please fill in all fields',
                          );
                          return;
                        }
                        setDialogState(() {
                          isLoading = true;
                          errorMsg = null;
                        });
                        final result = await auth.enableBiometric(
                          loginId: loginCtrl.text.trim(),
                          password: passwordCtrl.text,
                        );
                        if (ctx.mounted) {
                          if (result) {
                            Navigator.pop(ctx);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Text(
                                    'Biometric login enabled!',
                                  ),
                                  backgroundColor: AppTheme.success,
                                  behavior: SnackBarBehavior.floating,
                                  margin: const EdgeInsets.all(16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              );
                            }
                          } else {
                            setDialogState(() {
                              isLoading = false;
                              errorMsg =
                                  auth.error ?? 'Failed to enable biometric';
                            });
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(80, 44),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text('Enable'),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final employee = user?.employee;
    final firstName = employee?.firstName ?? user?.name ?? 'Employee';
    final lastName = employee?.lastName ?? '';
    final initials =
        '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'
            .toUpperCase();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasProfileImage =
        auth.profileImagePath != null && auth.profileImagePath!.isNotEmpty;

    return Scaffold(
      backgroundColor: AppTheme.background(context),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _reloadProfile,
          color: AppTheme.primaryBlue,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                const SizedBox(height: 8),
                // App Bar
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppTheme.primaryBlue,
                      backgroundImage: hasProfileImage
                          ? FileImage(File(auth.profileImagePath!))
                          : null,
                      child: hasProfileImage
                          ? null
                          : Text(
                              firstName.isNotEmpty
                                  ? firstName[0].toUpperCase()
                                  : 'E',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Profile',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary(context),
                      ),
                    ),
                    const Spacer(),
                  ],
                ),
                const SizedBox(height: 28),

                // Profile avatar with camera
                Stack(
                  children: [
                    Container(
                      width: 104,
                      height: 104,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppTheme.primaryBlue.withValues(alpha: 0.3),
                          width: 3,
                        ),
                      ),
                      child: CircleAvatar(
                        radius: 49,
                        backgroundColor: AppTheme.primaryBlue,
                        backgroundImage: hasProfileImage
                            ? FileImage(File(auth.profileImagePath!))
                            : null,
                        child: hasProfileImage
                            ? null
                            : Text(
                                initials.isEmpty ? 'E' : initials,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 32,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: _pickProfileImage,
                        child: Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryBlue,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppTheme.card(context),
                              width: 2.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.primaryBlue.withValues(
                                  alpha: 0.3,
                                ),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.camera_alt_rounded,
                            size: 16,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  employee?.fullName ?? user?.name ?? 'Employee',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary(context),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withValues(
                      alpha: isDark ? 0.2 : 0.08,
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    employee?.jobTitle ?? 'Employee',
                    style: TextStyle(
                      color: AppTheme.primaryBlue,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Personal Info
                _sectionHeader('Personal Information'),
                const SizedBox(height: 10),
                _infoCard([
                  _infoRow(
                    Icons.badge_outlined,
                    'Employee ID',
                    employee?.employeeCode ?? '--',
                  ),
                  _infoRow(
                    Icons.business_outlined,
                    'Department',
                    employee?.department ?? '--',
                  ),
                  _infoRow(
                    Icons.work_outline,
                    'Job Title',
                    employee?.jobTitle ?? '--',
                  ),
                  _infoRow(
                    Icons.email_outlined,
                    'Email',
                    employee?.email ?? user?.email ?? '--',
                  ),
                  _infoRow(
                    Icons.phone_outlined,
                    'Phone',
                    employee?.phone ?? '--',
                  ),
                ]),
                const SizedBox(height: 20),

                // Settings
                _sectionHeader('Account Settings'),
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.card(context),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: isDark
                        ? []
                        : [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 12,
                              offset: const Offset(0, 3),
                            ),
                          ],
                  ),
                  child: Column(
                    children: [
                      _settingsTile(
                        Icons.lock_outline,
                        'Change Password',
                        'Update your account password',
                        onTap: _showChangePasswordDialog,
                      ),
                      Divider(
                        color: AppTheme.divider(context),
                        height: 1,
                        indent: 56,
                      ),
                      if (auth.isBiometricAvailable) ...[
                        _settingsTile(
                          Icons.fingerprint_rounded,
                          'Biometric Login',
                          auth.isBiometricEnabled
                              ? 'Enabled — tap to disable'
                              : 'Enable fingerprint or face login',
                          trailing: Switch.adaptive(
                            value: auth.isBiometricEnabled,
                            activeTrackColor: AppTheme.primaryBlue.withValues(
                              alpha: 0.4,
                            ),
                            onChanged: (v) => v
                                ? _showEnableBiometricDialog(auth)
                                : auth.disableBiometric(),
                          ),
                          onTap: () => auth.isBiometricEnabled
                              ? null
                              : _showEnableBiometricDialog(auth),
                        ),
                        Divider(
                          color: AppTheme.divider(context),
                          height: 1,
                          indent: 56,
                        ),
                      ],

                      _settingsTile(
                        Icons.timer_outlined,
                        'Auto Logout',
                        (auth.autoLogoutMinutes == null)
                            ? 'Never'
                            : auth.autoLogoutMinutes == 30
                            ? '30 minutes (default)'
                            : auth.autoLogoutMinutes == 60
                            ? '1 hour'
                            : auth.autoLogoutMinutes == 480
                            ? '8 hours'
                            : '${auth.autoLogoutMinutes} min',
                        trailing: const Icon(
                          Icons.chevron_right,
                          color: Colors.grey,
                        ),
                        onTap: () => _showAutoLogoutSheet(auth),
                      ),
                      Divider(
                        color: AppTheme.divider(context),
                        height: 1,
                        indent: 56,
                      ),
                      _settingsTile(
                        Icons.notifications_outlined,
                        'Notifications',
                        'Manage notification preferences',
                        onTap: _showNotificationPreferences,
                      ),
                      Divider(
                        color: AppTheme.divider(context),
                        height: 1,
                        indent: 56,
                      ),
                      _settingsTile(
                        Icons.help_outline,
                        'Help & Support',
                        'Get assistance or report issues',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Logout
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: OutlinedButton.icon(
                    onPressed: () => _confirmLogout(auth),
                    icon: const Icon(Icons.logout, color: AppTheme.error),
                    label: Text(
                      'Logout',
                      style: TextStyle(
                        color: AppTheme.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: AppTheme.error.withValues(alpha: 0.3),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'BAIS Attendance v1.0.0',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppTheme.textLight(context),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmLogout(AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.card(ctx),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.logout, color: AppTheme.error, size: 20),
            ),
            const SizedBox(width: 12),
            Text(
              'Sign Out',
              style: TextStyle(color: AppTheme.textPrimary(ctx)),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to sign out?',
          style: TextStyle(color: AppTheme.textSecondary(ctx)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: TextStyle(color: AppTheme.textSecondary(ctx)),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              auth.logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.error,
              minimumSize: const Size(80, 44),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(String label) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        label,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: AppTheme.textSecondary(context),
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  Widget _infoCard(List<Widget> children) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card(context),
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 12,
                  offset: const Offset(0, 3),
                ),
              ],
      ),
      child: Column(
        children: List.generate(children.length * 2 - 1, (i) {
          if (i.isOdd) {
            return Divider(color: AppTheme.divider(context), height: 24);
          }
          return children[i ~/ 2];
        }),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.primaryBlue),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textSecondary(context),
                ),
              ),
              Text(
                value,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary(context),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _settingsTile(
    IconData icon,
    String label,
    String desc, {
    VoidCallback? onTap,
    Widget? trailing,
  }) {
    return ListTile(
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppTheme.primaryBlue.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppTheme.primaryBlue, size: 20),
      ),
      title: Text(
        label,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w600,
          color: AppTheme.textPrimary(context),
        ),
      ),
      subtitle: Text(
        desc,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
          color: AppTheme.textSecondary(context),
          fontSize: 11,
        ),
      ),
      trailing:
          trailing ??
          Icon(Icons.chevron_right, color: AppTheme.textLight(context)),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }
}
