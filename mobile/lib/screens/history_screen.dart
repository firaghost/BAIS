import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/attendance_provider.dart';
import '../models/attendance_log.dart';
import '../models/attendance_correction_request.dart';
import '../theme/app_theme.dart';
import '../widgets/app_header.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen>
    with WidgetsBindingObserver {
  DateTime _selectedMonth = DateTime.now();
  String? _selectedStatus;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadHistory();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadHistory();
    }
  }

  void _loadHistory() {
    final from = DateTime(_selectedMonth.year, _selectedMonth.month, 1);
    final to = DateTime(_selectedMonth.year, _selectedMonth.month + 1, 0);
    context.read<AttendanceProvider>().loadHistory(
      from: DateFormat('yyyy-MM-dd').format(from),
      to: DateFormat('yyyy-MM-dd').format(to),
      status: _selectedStatus,
    );
  }

  Future<void> _onRefresh() async {
    final from = DateTime(_selectedMonth.year, _selectedMonth.month, 1);
    final to = DateTime(_selectedMonth.year, _selectedMonth.month + 1, 0);
    await context.read<AttendanceProvider>().loadHistory(
      from: DateFormat('yyyy-MM-dd').format(from),
      to: DateFormat('yyyy-MM-dd').format(to),
      status: _selectedStatus,
    );
  }

  @override
  Widget build(BuildContext context) {
    final attendance = context.watch<AttendanceProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background(context),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: const AppHeader(title: 'History'),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: _FilterPill(
                      icon: Icons.calendar_today,
                      label: DateFormat('MMMM yyyy').format(_selectedMonth),
                      onTap: _selectMonth,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatusDropdownPill(
                      value: _selectedStatus,
                      onChanged: (value) {
                        setState(() => _selectedStatus = value);
                        _loadHistory();
                      },
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: attendance.isLoading
                  ? Center(
                      child: CircularProgressIndicator(
                        color: AppTheme.primaryBlue,
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _onRefresh,
                      color: AppTheme.primaryBlue,
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        itemCount: attendance.history.isEmpty
                            ? 1
                            : attendance.history.length + 1,
                        itemBuilder: (context, index) {
                          if (index == 0) {
                            return _MonthHeader(
                              month: _selectedMonth,
                              count: attendance.history.length,
                            );
                          }

                          if (attendance.history.isEmpty) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 60),
                              child: Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.history,
                                      size: 48,
                                      color: AppTheme.textLight(context),
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'No attendance records found',
                                      style: TextStyle(
                                        color: AppTheme.textSecondary(context),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }

                          final log = attendance.history[index - 1];
                          final correction =
                              attendance.correctionsByLogId[log.id];
                          return _HistoryCard(
                            log: log,
                            shiftEndTime: attendance.currentShift?.endTime,
                            correction: correction,
                            onRequestCorrection: () =>
                                _openCorrectionSheet(context, log),
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  void _selectMonth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedMonth,
      firstDate: DateTime(now.year - 2),
      lastDate: now,
      initialEntryMode: DatePickerEntryMode.calendarOnly,
    );
    if (picked != null) {
      setState(() => _selectedMonth = picked);
      _loadHistory();
    }
  }

  Future<void> _openCorrectionSheet(
    BuildContext context,
    AttendanceLog log,
  ) async {
    final parentContext = context;
    final controller = TextEditingController();
    final isSubmitting = ValueNotifier<bool>(false);
    final reason = ValueNotifier<String>('');

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 12,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 16,
          ),
          child: AnimatedBuilder(
            animation: Listenable.merge([isSubmitting, reason]),
            builder: (context, _) {
              final canSubmit =
                  reason.value.trim().length >= 3 &&
                  isSubmitting.value == false;

              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.divider(context),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  Text(
                    'Request Correction',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary(context),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Explain what needs to be corrected for this record.',
                    style: TextStyle(color: AppTheme.textSecondary(context)),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: controller,
                    maxLines: 4,
                    onChanged: (v) => reason.value = v,
                    decoration: const InputDecoration(
                      labelText: 'Reason',
                      hintText: 'e.g. I forgot to check out, please update it',
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: isSubmitting.value
                        ? null
                        : () => Navigator.of(context).pop(),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: canSubmit
                        ? () async {
                            if (!sheetContext.mounted) return;
                            FocusScope.of(sheetContext).unfocus();
                            isSubmitting.value = true;
                            try {
                              await parentContext
                                  .read<AttendanceProvider>()
                                  .requestCorrection(
                                    attendanceLogId: log.id,
                                    reason: controller.text.trim(),
                                  );

                              if (!sheetContext.mounted) return;
                              Navigator.of(sheetContext).pop();

                              if (!parentContext.mounted) return;
                              ScaffoldMessenger.of(parentContext).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Correction request submitted.',
                                  ),
                                ),
                              );
                            } catch (e) {
                              if (!parentContext.mounted) return;
                              ScaffoldMessenger.of(parentContext).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    e
                                        .toString()
                                        .replaceAll(
                                          RegExp(r'^Exception:\s*'),
                                          '',
                                        )
                                        .trim(),
                                  ),
                                ),
                              );
                            } finally {
                              if (sheetContext.mounted) {
                                isSubmitting.value = false;
                              }
                            }
                          }
                        : null,
                    child: isSubmitting.value
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Submit Request'),
                  ),
                ],
              );
            },
          ),
        );
      },
    );

    controller.dispose();
    isSubmitting.dispose();
    reason.dispose();
  }
}

class _FilterPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _FilterPill({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 42,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: AppTheme.card(context),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.divider(context)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: AppTheme.textSecondary(context)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: AppTheme.textPrimary(context)),
              ),
            ),
            Icon(
              Icons.keyboard_arrow_down,
              size: 20,
              color: AppTheme.textSecondary(context),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusDropdownPill extends StatelessWidget {
  final String? value;
  final ValueChanged<String?> onChanged;

  const _StatusDropdownPill({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppTheme.card(context),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.divider(context)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String?>(
          value: value,
          isExpanded: true,
          dropdownColor: AppTheme.card(context),
          icon: Icon(
            Icons.keyboard_arrow_down,
            size: 20,
            color: AppTheme.textSecondary(context),
          ),
          hint: Row(
            children: [
              Icon(
                Icons.filter_list,
                size: 16,
                color: AppTheme.textSecondary(context),
              ),
              const SizedBox(width: 8),
              Text(
                'All Status',
                style: TextStyle(color: AppTheme.textPrimary(context)),
              ),
            ],
          ),
          items: [
            DropdownMenuItem<String?>(
              value: null,
              child: Text(
                'All Status',
                style: TextStyle(color: AppTheme.textPrimary(context)),
              ),
            ),
            DropdownMenuItem<String?>(
              value: 'checked_in',
              child: Text(
                'Checked In',
                style: TextStyle(color: AppTheme.textPrimary(context)),
              ),
            ),
            DropdownMenuItem<String?>(
              value: 'checked_out',
              child: Text(
                'Checked Out',
                style: TextStyle(color: AppTheme.textPrimary(context)),
              ),
            ),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class _MonthHeader extends StatelessWidget {
  final DateTime month;
  final int count;

  const _MonthHeader({required this.month, required this.count});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 6, 4, 10),
      child: Row(
        children: [
          Text(
            DateFormat('MMM yyyy').format(month).toUpperCase(),
            style: TextStyle(
              color: AppTheme.textSecondary(context),
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
          const Spacer(),
          Text(
            'Showing $count records',
            style: TextStyle(
              color: AppTheme.textSecondary(context),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  final AttendanceLog log;
  final String? shiftEndTime;
  final AttendanceCorrectionRequest? correction;
  final VoidCallback onRequestCorrection;

  const _HistoryCard({
    required this.log,
    this.shiftEndTime,
    required this.correction,
    required this.onRequestCorrection,
  });

  @override
  Widget build(BuildContext context) {
    final logDate = DateTime.tryParse(log.logDate);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final checkIn = log.checkInTime != null
        ? _formatTime(log.checkInTime!)
        : '--';
    final checkOut = log.checkOutTime != null
        ? _formatTime(log.checkOutTime!)
        : '--';

    final isLate = log.isLate;

    final correctionPill = _correctionPill(correction);

    final status = _resolveStatus(
      context,
      isLate: isLate,
      logDate: logDate,
      checkOutTime: log.checkOutTime,
      shiftEndTime: shiftEndTime,
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.card(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.divider(context)),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 2,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.card2(context).withValues(alpha: 0.35),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(12),
              ),
              border: Border(
                bottom: BorderSide(color: AppTheme.divider(context)),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    _DateChip(date: logDate),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Regular Shift',
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textPrimary(context),
                                ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            log.branchAndDepartment,
                            style: TextStyle(
                              fontSize: 10,
                              color: AppTheme.textSecondary(context),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    Flexible(child: _StatusPill(status: status)),
                  ],
                ),
                if (correctionPill != null) ...[
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: _StatusPill(status: correctionPill),
                  ),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: _TimeBlock(
                    label: 'Check In',
                    time: checkIn,
                    icon: Icons.login,
                    iconColor: isLate ? AppTheme.warning : AppTheme.info,
                    location: log.branchAndDepartment,
                  ),
                ),
                Container(
                  width: 1,
                  height: 54,
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  color: AppTheme.divider(context),
                ),
                Expanded(
                  child: _TimeBlock(
                    label: 'Check Out',
                    time: checkOut,
                    icon: Icons.logout,
                    iconColor: AppTheme.textSecondary(context),
                    location: log.branchAndDepartment,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: SizedBox(
              height: 34,
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: correction?.status == 'pending'
                    ? null
                    : onRequestCorrection,
                icon: Icon(
                  Icons.rate_review_outlined,
                  size: 16,
                  color: AppTheme.textSecondary(context),
                ),
                label: Text(
                  correction?.status == 'pending'
                      ? 'Correction Pending'
                      : 'Request Correction',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary(context),
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppTheme.divider(context)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  _UiStatus? _correctionPill(AttendanceCorrectionRequest? correction) {
    if (correction == null) return null;

    switch (correction.status) {
      case 'pending':
        return const _UiStatus(
          label: 'Correction Pending',
          dotColor: Color(0xFF0EA5E9),
          background: Color(0x1A0EA5E9),
          border: Color(0x330EA5E9),
        );
      case 'approved':
        return const _UiStatus(
          label: 'Correction Approved',
          dotColor: Color(0xFF22C55E),
          background: Color(0x1A22C55E),
          border: Color(0x3322C55E),
        );
      case 'rejected':
        return const _UiStatus(
          label: 'Correction Rejected',
          dotColor: Color(0xFFEF4444),
          background: Color(0x1AEF4444),
          border: Color(0x33EF4444),
        );
      default:
        return _UiStatus(
          label: 'Correction ${correction.statusLabel}',
          dotColor: const Color(0xFF64748B),
          background: const Color(0x1A64748B),
          border: const Color(0x3364748B),
        );
    }
  }

  _UiStatus _resolveStatus(
    BuildContext context, {
    required bool isLate,
    required DateTime? logDate,
    required String? checkOutTime,
    required String? shiftEndTime,
  }) {
    if (isLate) {
      return const _UiStatus(
        label: 'Late',
        dotColor: Color(0xFFF59E0B),
        background: Color(0x1AF59E0B),
        border: Color(0x33F59E0B),
      );
    }

    if (checkOutTime != null && shiftEndTime != null && logDate != null) {
      final checkOut = DateTime.tryParse(checkOutTime)?.toLocal();
      final shiftEnd = _timeOnDate(logDate, shiftEndTime);
      if (checkOut != null && shiftEnd != null && checkOut.isBefore(shiftEnd)) {
        return const _UiStatus(
          label: 'Early Out',
          dotColor: Color(0xFFA855F7),
          background: Color(0x1AA855F7),
          border: Color(0x33A855F7),
        );
      }
    }

    if (checkOutTime != null) {
      return const _UiStatus(
        label: 'On Time',
        dotColor: Color(0xFF22C55E),
        background: Color(0x1A22C55E),
        border: Color(0x3322C55E),
      );
    }

    return _UiStatus(
      label: log.statusLabel.toUpperCase(),
      dotColor: AppTheme.textLight(context),
      background: AppTheme.textLight(context).withValues(alpha: 0.10),
      border: AppTheme.textLight(context).withValues(alpha: 0.20),
    );
  }

  DateTime? _timeOnDate(DateTime date, String time) {
    final parts = time.split(':');
    if (parts.length < 2) return null;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;
    return DateTime(date.year, date.month, date.day, hour, minute);
  }

  String _formatTime(String dateTimeStr) {
    // Use parseServerDateTime to correctly handle UTC timestamps without timezone suffix
    final dt = AttendanceLog.parseServerDateTime(dateTimeStr);
    if (dt == null) return dateTimeStr;
    return DateFormat('hh:mm a').format(dt.toLocal());
  }
}

class _DateChip extends StatelessWidget {
  final DateTime? date;

  const _DateChip({required this.date});

  @override
  Widget build(BuildContext context) {
    final labelMonth = date != null
        ? DateFormat('MMM').format(date!).toUpperCase()
        : '--';
    final labelDay = date != null ? date!.day.toString().padLeft(2, '0') : '--';

    return Container(
      width: 48,
      constraints: const BoxConstraints(minHeight: 52),
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.card(context),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.divider(context)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            labelMonth,
            style: TextStyle(
              color: AppTheme.textSecondary(context),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            labelDay,
            style: TextStyle(
              color: AppTheme.textPrimary(context),
              fontSize: 18,
              fontWeight: FontWeight.w700,
              height: 1,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _UiStatus {
  final String label;
  final Color dotColor;
  final Color background;
  final Color border;

  const _UiStatus({
    required this.label,
    required this.dotColor,
    required this.background,
    required this.border,
  });
}

class _StatusPill extends StatelessWidget {
  final _UiStatus status;

  const _StatusPill({required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 25,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: status.background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: status.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: status.dotColor,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            status.label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: status.dotColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _TimeBlock extends StatelessWidget {
  final String label;
  final String time;
  final IconData icon;
  final Color iconColor;
  final String location;

  const _TimeBlock({
    required this.label,
    required this.time,
    required this.icon,
    required this.iconColor,
    required this.location,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: AppTheme.textSecondary(context),
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            Icon(icon, size: 14, color: iconColor),
            const SizedBox(width: 6),
            Text(
              time,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary(context),
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          location,
          style: TextStyle(
            fontSize: 10,
            color: AppTheme.textSecondary(context),
          ),
        ),
      ],
    );
  }
}
