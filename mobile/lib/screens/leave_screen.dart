import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/leave_provider.dart';
import '../theme/app_theme.dart';

class LeaveScreen extends StatefulWidget {
  const LeaveScreen({super.key});

  @override
  State<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen> {
  String? _selectedType;
  DateTime? _startDate;
  DateTime? _endDate;
  final _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final leave = context.read<LeaveProvider>();
    leave.loadBalance();
    leave.loadRequests();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  int get _totalDays {
    if (_startDate == null || _endDate == null) return 0;
    return _endDate!.difference(_startDate!).inDays + 1;
  }

  Future<void> _onRefresh() async {
    final leave = context.read<LeaveProvider>();
    await leave.loadBalance();
    await leave.loadRequests();
  }

  void _pickDate(bool isStart) async {
    final now = DateTime.now();
    final first = DateTime(now.year, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart
          ? (_startDate ?? first)
          : (_endDate ?? _startDate ?? first),
      firstDate: first,
      lastDate: DateTime(now.year + 1),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate != null && _endDate!.isBefore(picked)) _endDate = picked;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  void _submitRequest() async {
    if (_selectedType == null || _startDate == null || _endDate == null) {
      _showSnack('Please fill in all required fields', false);
      return;
    }

    if (_endDate!.isBefore(_startDate!)) {
      _showSnack('End date cannot be before start date', false);
      return;
    }

    final leave = context.read<LeaveProvider>();
    final success = await leave.submitRequest(
      leaveType: _selectedType!,
      startDate: DateFormat('yyyy-MM-dd').format(_startDate!),
      endDate: DateFormat('yyyy-MM-dd').format(_endDate!),
      reason: _reasonController.text.isNotEmpty ? _reasonController.text : null,
    );

    if (mounted) {
      _showSnack(
        success
            ? 'Leave request submitted successfully!'
            : (leave.error ?? 'Submission failed'),
        success,
      );
      if (success) {
        setState(() {
          _selectedType = null;
          _startDate = null;
          _endDate = null;
          _reasonController.clear();
        });
      }
    }
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
    final auth = context.watch<AuthProvider>();
    final leave = context.watch<LeaveProvider>();
    final user = auth.user;
    final firstName = user?.employee?.firstName ?? user?.name ?? 'E';
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
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppTheme.primaryBlue,
                      child: Text(
                        firstName.isNotEmpty ? firstName[0].toUpperCase() : 'E',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Leave Request',
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
                          onPressed: () {},
                        ),
                        Positioned(
                          right: 8,
                          top: 8,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppTheme.error,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Balance Cards
                Row(
                  children: [
                    Expanded(
                      child: _BalanceCard(
                        title: 'Annual Leave',
                        days: balance?.annual ?? 0,
                        icon: Icons.flight_takeoff_rounded,
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _BalanceCard(
                        title: 'Sick Leave',
                        days: balance?.sick ?? 0,
                        icon: Icons.local_hospital_rounded,
                        color: AppTheme.warning,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Leave Form
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.card(context),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: isDark
                        ? []
                        : [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Section header
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: AppTheme.primaryBlue.withValues(
                                alpha: 0.1,
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.edit_calendar_rounded,
                              color: AppTheme.primaryBlue,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'New Request',
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textPrimary(context),
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Leave Type
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
                          _typeChip(
                            'annual',
                            'Annual',
                            Icons.flight_takeoff_rounded,
                            AppTheme.primaryBlue,
                          ),
                          _typeChip(
                            'sick',
                            'Sick',
                            Icons.local_hospital_rounded,
                            AppTheme.warning,
                          ),
                          _typeChip(
                            'personal',
                            'Personal',
                            Icons.person_outline,
                            AppTheme.info,
                          ),
                          _typeChip(
                            'other',
                            'Other',
                            Icons.more_horiz,
                            AppTheme.textSecondary(context),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Date Row
                      Row(
                        children: [
                          Expanded(
                            child: _dateField(
                              'Start Date',
                              _startDate,
                              () => _pickDate(true),
                              icon: Icons.calendar_month_outlined,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _dateField(
                              'End Date',
                              _endDate,
                              () => _pickDate(false),
                              icon: Icons.event_available_outlined,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Total days
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: _totalDays > 0
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
                              color: _totalDays > 0
                                  ? AppTheme.primaryBlue
                                  : AppTheme.textLight(context),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Total',
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    color: _totalDays > 0
                                        ? AppTheme.primaryBlue
                                        : AppTheme.textSecondary(context),
                                  ),
                            ),
                            const Spacer(),
                            TweenAnimationBuilder<int>(
                              tween: IntTween(begin: 0, end: _totalDays),
                              duration: const Duration(milliseconds: 350),
                              builder: (context, value, _) {
                                return Text(
                                  '$value day${value == 1 ? '' : 's'}',
                                  style: Theme.of(context).textTheme.bodyMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: _totalDays > 0
                                            ? AppTheme.primaryBlue
                                            : AppTheme.textSecondary(context),
                                      ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Reason
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
                        controller: _reasonController,
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
                      const SizedBox(height: 24),

                      // Submit button
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton.icon(
                          onPressed: leave.isSubmitting ? null : _submitRequest,
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
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _typeChip(String type, String label, IconData icon, Color color) {
    final selected = _selectedType == type;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => setState(() => _selectedType = type),
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

  Widget _dateField(
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
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
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
                Icon(Icons.chevron_right, color: AppTheme.textLight(context)),
              ],
            ),
          ),
        ),
      ],
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
