import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/notifications_provider.dart';
import '../theme/app_theme.dart';
import './glass_surface.dart';

class NotificationsSheet {
  static Future<void> show(BuildContext context) async {
    final provider = context.read<NotificationsProvider>();
    await provider.ensureLoaded();

    if (!context.mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        final maxHeight = MediaQuery.of(sheetContext).size.height * 0.78;
        return SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.only(
              left: 16,
              right: 16,
              bottom: 16,
              top: 10,
            ),
            child: GlassSurface(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(22),
              ),
              padding: EdgeInsets.zero,
              child: ConstrainedBox(
                constraints: BoxConstraints(maxHeight: maxHeight),
                child: const _NotificationsSheetBody(),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _NotificationsSheetBody extends StatelessWidget {
  const _NotificationsSheetBody();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationsProvider>();
    final items = provider.items;

    return SafeArea(
      top: false,
      child: Column(
        children: [
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.divider(context),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Text(
                  'Notifications',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textPrimary(context),
                  ),
                ),
                const Spacer(),
                if (provider.unreadCount > 0)
                  TextButton(
                    onPressed: () =>
                        context.read<NotificationsProvider>().markAllRead(),
                    child: const Text('Mark all read'),
                  )
                else
                  TextButton(
                    onPressed: items.isEmpty
                        ? null
                        : () => context.read<NotificationsProvider>().clear(),
                    child: const Text('Clear'),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Expanded(
            child: items.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.notifications_off_outlined,
                          size: 44,
                          color: AppTheme.textLight(context),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'No new notifications',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(
                                color: AppTheme.textSecondary(context),
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
                    itemCount: items.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final n = items[index];
                      final time = DateFormat(
                        'MMM d • h:mm a',
                      ).format(n.createdAt);

                      return InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => context
                            .read<NotificationsProvider>()
                            .markRead(n.id),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: n.isRead
                                ? AppTheme.card2(
                                    context,
                                  ).withValues(alpha: 0.35)
                                : AppTheme.card(context),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: AppTheme.divider(context),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 34,
                                height: 34,
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryBlue.withValues(
                                    alpha: 0.12,
                                  ),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.notifications,
                                  size: 18,
                                  color: AppTheme.primaryBlue,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            n.title,
                                            style: TextStyle(
                                              fontWeight: n.isRead
                                                  ? FontWeight.w600
                                                  : FontWeight.w800,
                                              color: AppTheme.textPrimary(
                                                context,
                                              ),
                                              fontSize: 14,
                                            ),
                                          ),
                                        ),
                                        if (!n.isRead)
                                          Container(
                                            width: 8,
                                            height: 8,
                                            margin: const EdgeInsets.only(
                                              left: 8,
                                              top: 2,
                                            ),
                                            decoration: const BoxDecoration(
                                              color: AppTheme.primaryBlue,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      n.body,
                                      style: TextStyle(
                                        color: AppTheme.textSecondary(context),
                                        fontSize: 13,
                                        height: 1.25,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      time,
                                      style: TextStyle(
                                        color: AppTheme.textLight(context),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
