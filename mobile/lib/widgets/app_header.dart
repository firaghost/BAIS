import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/notifications_provider.dart';
import '../theme/app_theme.dart';
import 'notifications_sheet.dart';

class AppHeader extends StatelessWidget {
  final String title;
  final bool showNotificationBadge;

  const AppHeader({
    super.key,
    required this.title,
    this.showNotificationBadge = true,
  });

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final notifications = context.watch<NotificationsProvider>();
    final user = auth.user;
    final firstName = user?.employee?.firstName ?? user?.name ?? 'Employee';
    final hasProfileImage =
        auth.profileImagePath != null && auth.profileImagePath!.isNotEmpty;

    return Row(
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
                  firstName.isNotEmpty ? firstName[0].toUpperCase() : 'E',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            color: AppTheme.textPrimary(context),
          ),
        ),
        const Spacer(),
        Stack(
          children: [
            IconButton(
              icon: Icon(
                Icons.notifications_outlined,
                color: AppTheme.textPrimary(context),
              ),
              onPressed: () => NotificationsSheet.show(context),
            ),
            if (showNotificationBadge && notifications.unreadCount > 0)
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 2,
                  ),
                  decoration: const BoxDecoration(
                    color: AppTheme.error,
                    borderRadius: BorderRadius.all(Radius.circular(999)),
                  ),
                  child: Text(
                    '${notifications.unreadCount}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      height: 1.0,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
