import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/leave_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_header.dart';
import '../widgets/glass_surface.dart';

class LeaveScreen extends StatefulWidget {
  const LeaveScreen({super.key});

  @override
  State<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen> {
  Color _statusColor(String status) {
    switch (status) {
      case 'approved':
        return AppTheme.success;
      case 'rejected':
        return AppTheme.error;
      case 'pending_hr':
        return AppTheme.warning;
      case 'pending':
      default:
        return AppTheme.info;
    }
  }

  Future<void> _openNewRequestModal(LeaveProvider leave) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        String? selectedType;
        DateTime? startDate;
        DateTime? endDate;
        final reasonCtrl = TextEditingController();

        int totalDays() {
          if (startDate == null || endDate == null) return 0;
          return endDate!.difference(startDate!).inDays + 1;
        }

        Future<void> pickDate(
          bool isStart,
          void Function(void Function()) setSheetState,
        ) async {
          final now = DateTime.now();
          final first = DateTime(now.year, now.month, now.day);
          final picked = await showDatePicker(
            context: sheetCtx,
            initialDate: isStart
                ? (startDate ?? first)
                : (endDate ?? startDate ?? first),
            firstDate: first,
            lastDate: DateTime(now.year + 1),
          );
          if (picked == null) return;

          setSheetState(() {
            if (isStart) {
              startDate = picked;
              if (endDate != null && endDate!.isBefore(picked)) {
                endDate = picked;
              }
            } else {
              endDate = picked;
            }
          });
        }

        Widget typeChip(
          String type,
          String label,
          IconData icon,
          Color color,
          void Function(void Function()) setSheetState,
        ) {
          final selected = selectedType == type;
          return InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => setSheetState(() => selectedType = type),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: selected
                    ? color.withValues(alpha: 0.12)
                    : AppTheme.inputFill(context),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: selected
                      ? color.withValues(alpha: 0.7)
                      : AppTheme.divider(context),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    icon,
                    size: 18,
                    color: selected ? color : AppTheme.textLight(context),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: TextStyle(
                      color: selected
                          ? AppTheme.textPrimary(context)
                          : AppTheme.textSecondary(context),
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        Widget dateField(
          String label,
          DateTime? date,
          VoidCallback onTap, {
          required IconData icon,
        }) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary(context),
                ),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: onTap,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.inputFill(context),
                    border: Border.all(color: AppTheme.divider(context)),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        icon,
                        size: 18,
                        color: date != null
                            ? AppTheme.primaryBlue
                            : AppTheme.textLight(context),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        date != null
                            ? DateFormat('MMM dd, yyyy').format(date)
                            : 'Select date',
                        style: TextStyle(
                          color: date != null
                              ? AppTheme.textPrimary(context)
                              : AppTheme.textLight(context),
                          fontWeight: date != null
                              ? FontWeight.w500
                              : FontWeight.w400,
                        ),
                      ),
                      const Spacer(),
                      Icon(
                        Icons.chevron_right,
                        color: AppTheme.textLight(context),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        }

        return StatefulBuilder(
          builder: (sheetCtx, setSheetState) {
            final isDark = Theme.of(context).brightness == Brightness.dark;
            final days = totalDays();
            final canSubmit =
                selectedType != null && startDate != null && endDate != null;

            return SafeArea(
              top: false,
              child: Padding(
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  top: 10,
                  bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 16,
                ),
                child: GlassSurface(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(22),
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: AppTheme.divider(context),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppTheme.primaryBlue.withValues(
                                  alpha: 0.1,
                                ),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                Icons.edit_calendar_rounded,
                                color: AppTheme.primaryBlue,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'New Leave Request',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.textPrimary(context),
                                    ),
                              ),
                            ),
                            IconButton(
                              onPressed: () => Navigator.pop(sheetCtx),
                              icon: Icon(
                                Icons.close,
                                color: AppTheme.textSecondary(context),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        Text(
                          'Leave Type',
                          style: Theme.of(context).textTheme.labelMedium
                              ?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textSecondary(context),
                              ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: [
                            typeChip(
                              'annual',
                              'Annual',
                              Icons.flight_takeoff_rounded,
                              AppTheme.primaryBlue,
                              setSheetState,
                            ),
                            typeChip(
                              'sick',
                              'Sick',
                              Icons.local_hospital_rounded,
                              AppTheme.warning,
                              setSheetState,
                            ),
                            typeChip(
                              'personal',
                              'Personal',
                              Icons.person_outline,
                              AppTheme.info,
                              setSheetState,
                            ),
                            typeChip(
                              'other',
                              'Other',
                              Icons.more_horiz,
                              AppTheme.textSecondary(context),
                              setSheetState,
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        Row(
                          children: [
                            Expanded(
                              child: dateField(
                                'Start Date',
                                startDate,
                                () => pickDate(true, setSheetState),
                                icon: Icons.calendar_month_outlined,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: dateField(
                                'End Date',
                                endDate,
                                () => pickDate(false, setSheetState),
                                icon: Icons.event_available_outlined,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: days > 0
                                ? AppTheme.primaryBlue.withValues(
                                    alpha: isDark ? 0.15 : 0.07,
                                  )
                                : AppTheme.card2(context),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.timelapse_rounded,
                                size: 18,
                                color: days > 0
                                    ? AppTheme.primaryBlue
                                    : AppTheme.textLight(context),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Total',
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(
                                      color: days > 0
                                          ? AppTheme.primaryBlue
                                          : AppTheme.textSecondary(context),
                                    ),
                              ),
                              const Spacer(),
                              Text(
                                '$days day${days == 1 ? '' : 's'}',
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: days > 0
                                          ? AppTheme.primaryBlue
                                          : AppTheme.textSecondary(context),
                                    ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text(
                          'Reason for Leave',
                          style: Theme.of(context).textTheme.labelMedium
                              ?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textSecondary(context),
                              ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: reasonCtrl,
                          maxLines: 4,
                          decoration: InputDecoration(
                            hintText:
                                'Describe the reason for your leave request...',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: BorderSide(
                                color: AppTheme.divider(context),
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: BorderSide(
                                color: AppTheme.divider(context),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        SizedBox(
                          width: double.infinity,
                          height: 54,
                          child: ElevatedButton.icon(
                            onPressed: leave.isSubmitting
                                ? null
                                : () async {
                                    if (!canSubmit) {
                                      _showSnack(
                                        'Please fill in all required fields',
                                        false,
                                      );
                                      return;
                                    }

                                    if (endDate!.isBefore(startDate!)) {
                                      _showSnack(
                                        'End date cannot be before start date',
                                        false,
                                      );
                                      return;
                                    }

                                    final success = await leave.submitRequest(
                                      leaveType: selectedType!,
                                      startDate: DateFormat(
                                        'yyyy-MM-dd',
                                      ).format(startDate!),
                                      endDate: DateFormat(
                                        'yyyy-MM-dd',
                                      ).format(endDate!),
                                      reason: reasonCtrl.text.isNotEmpty
                                          ? reasonCtrl.text
                                          : null,
                                    );

                                    if (success) {
                                      if (!sheetCtx.mounted) return;
                                      Navigator.pop(sheetCtx);
                                    }

                                    _showSnack(
                                      success
                                          ? 'Leave request submitted successfully!'
                                          : (leave.error ??
                                                'Submission failed'),
                                      success,
                                    );
                                  },
                            icon: leave.isSubmitting
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.send_rounded, size: 20),
                            label: Text(
                              leave.isSubmitting
                                  ? 'Submitting...'
                                  : 'Submit Request',
                            ),
                            style: ElevatedButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  void initState() {
    super.initState();
    final leave = context.read<LeaveProvider>();
    leave.loadBalance();
    leave.loadRequests();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _onRefresh() async {
    final leave = context.read<LeaveProvider>();
    await leave.loadBalance();
    await leave.loadRequests();
  }

  void _showSnack(String msg, bool ok) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              ok ? Icons.check_circle_outline : Icons.error_outline,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(msg)),
          ],
        ),
        backgroundColor: ok ? AppTheme.success : AppTheme.error,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final leave = context.watch<LeaveProvider>();
    final balance = leave.balance;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppTheme.background(context),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _onRefresh,
          color: AppTheme.primaryBlue,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                // App Bar
                const AppHeader(title: 'Leave Request'),
                const SizedBox(height: 20),

                // Balance Cards
                if (leave.isBalanceLoading)
                  SizedBox(
                    height: 90,
                    child: Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                  )
                else if (balance == null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.card(context),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.divider(context)),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: AppTheme.textSecondary(context),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            leave.error?.isNotEmpty == true
                                ? leave.error!
                                : 'Unable to load your leave balance right now.',
                            style: TextStyle(
                              color: AppTheme.textSecondary(context),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: () => leave.loadBalance(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: _BalanceCard(
                          title: 'Annual Leave',
                          days: balance.annual,
                          icon: Icons.flight_takeoff_rounded,
                          color: AppTheme.primaryBlue,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _BalanceCard(
                          title: 'Sick Leave',
                          days: balance.sick,
                          icon: Icons.local_hospital_rounded,
                          color: AppTheme.warning,
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton.icon(
                    onPressed: leave.isSubmitting
                        ? null
                        : () => _openNewRequestModal(leave),
                    icon: const Icon(Icons.add_rounded, size: 20),
                    label: const Text('New Leave Request'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryBlue,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'History',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textPrimary(context),
                      ),
                    ),
                    if (leave.isLoading)
                      SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTheme.primaryBlue,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (!leave.isLoading && leave.requests.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.card(context),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      'No leave requests yet.',
                      style: TextStyle(
                        color: AppTheme.textSecondary(context),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: leave.requests.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (ctx, i) {
                      final r = leave.requests[i];
                      final statusColor = _statusColor(r.status);
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppTheme.card(context),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: isDark
                              ? []
                              : [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 10,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                r.status == 'approved'
                                    ? Icons.verified_rounded
                                    : r.status == 'rejected'
                                    ? Icons.cancel_rounded
                                    : Icons.hourglass_bottom_rounded,
                                color: statusColor,
                                size: 20,
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
                                          r.leaveTypeLabel,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodyMedium
                                              ?.copyWith(
                                                fontWeight: FontWeight.w800,
                                                color: AppTheme.textPrimary(
                                                  context,
                                                ),
                                              ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: statusColor.withValues(
                                            alpha: 0.1,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            999,
                                          ),
                                        ),
                                        child: Text(
                                          r.statusLabel,
                                          style: TextStyle(
                                            color: statusColor,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    '${r.startDateLabel}  →  ${r.endDateLabel}',
                                    style: TextStyle(
                                      color: AppTheme.textSecondary(context),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${r.totalDays} day${r.totalDays == 1 ? '' : 's'}',
                                    style: TextStyle(
                                      color: AppTheme.textLight(context),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (r.status == 'rejected' &&
                                      (r.rejectionReason ?? '').isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(
                                        r.rejectionReason!,
                                        style: TextStyle(
                                          color: AppTheme.error,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final String title;
  final int days;
  final IconData icon;
  final Color color;

  const _BalanceCard({
    required this.title,
    required this.days,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card(context),
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: color, width: 3)),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textSecondary(context),
                ),
              ),
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 8),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: '$days ',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary(context),
                  ),
                ),
                TextSpan(
                  text: 'days available',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppTheme.textSecondary(context),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
