import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../models/attendance_log.dart';
import '../theme/app_theme.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  DateTime _selectedMonth = DateTime.now();
  String? _selectedStatus;

  @override
  void initState() {
    super.initState();
    _loadHistory();
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
    _loadHistory();
    await Future.delayed(const Duration(milliseconds: 500));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final user = auth.user;
    final firstName = user?.employee?.firstName ?? user?.name ?? 'E';

    return Scaffold(
      backgroundColor: AppTheme.background(context),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(children: [
                const SizedBox(height: 8),
                // App Bar
                Row(children: [
                  CircleAvatar(
                    radius: 20, backgroundColor: AppTheme.primaryBlue,
                    child: Text(firstName.isNotEmpty ? firstName[0].toUpperCase() : 'E',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(width: 12),
                  Text('History', style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700, color: AppTheme.textPrimary(context))),
                  const Spacer(),
                  Stack(children: [
                    IconButton(icon: Icon(Icons.notifications_outlined, color: AppTheme.textPrimary(context)), onPressed: () {}),
                    Positioned(right: 8, top: 8, child: Container(
                      width: 8, height: 8,
                      decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle),
                    )),
                  ]),
                ]),
                const SizedBox(height: 16),
                // Filters
                Row(children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: _selectMonth,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppTheme.card(context), borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.divider(context)),
                        ),
                        child: Row(children: [
                          Icon(Icons.calendar_today, size: 16, color: AppTheme.textSecondary(context)),
                          const SizedBox(width: 8),
                          Text(DateFormat('MMMM yyyy').format(_selectedMonth),
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500, color: AppTheme.textPrimary(context))),
                          const Spacer(),
                          Icon(Icons.keyboard_arrow_down, size: 20, color: AppTheme.textSecondary(context)),
                        ]),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.card(context), borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.divider(context)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedStatus,
                          isExpanded: true,
                          dropdownColor: AppTheme.card(context),
                          icon: Icon(Icons.keyboard_arrow_down, size: 20, color: AppTheme.textSecondary(context)),
                          hint: Row(children: [
                            Icon(Icons.filter_list, size: 16, color: AppTheme.textSecondary(context)),
                            const SizedBox(width: 8),
                            Text('All Status', style: TextStyle(color: AppTheme.textPrimary(context))),
                          ]),
                          items: [
                            DropdownMenuItem(value: null, child: Text('All Status', style: TextStyle(color: AppTheme.textPrimary(context)))),
                            DropdownMenuItem(value: 'checked_in', child: Text('Checked In', style: TextStyle(color: AppTheme.textPrimary(context)))),
                            DropdownMenuItem(value: 'checked_out', child: Text('Checked Out', style: TextStyle(color: AppTheme.textPrimary(context)))),
                          ],
                          onChanged: (value) {
                            setState(() => _selectedStatus = value);
                            _loadHistory();
                          },
                        ),
                      ),
                    ),
                  ),
                ]),
                const SizedBox(height: 16),
              ]),
            ),
            // History List
            Expanded(
              child: attendance.isLoading
                ? Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue))
                : attendance.history.isEmpty
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.history, size: 48, color: AppTheme.textLight(context)),
                      const SizedBox(height: 12),
                      Text('No attendance records found', style: TextStyle(color: AppTheme.textSecondary(context))),
                    ]))
                  : RefreshIndicator(
                      onRefresh: _onRefresh,
                      color: AppTheme.primaryBlue,
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: attendance.history.length,
                        itemBuilder: (context, index) {
                          return _HistoryCard(
                            log: attendance.history[index],
                            shiftStartTime: attendance.currentShift?.startTime,
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
}

class _HistoryCard extends StatelessWidget {
  final AttendanceLog log;
  final String? shiftStartTime;

  const _HistoryCard({required this.log, this.shiftStartTime});

  @override
  Widget build(BuildContext context) {
    final logDate = DateTime.tryParse(log.logDate);
    final dayName = logDate != null ? DateFormat('EEE').format(logDate).toUpperCase() : '';
    final dayNum = logDate?.day.toString() ?? '';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final checkIn = log.checkInTime != null ? _formatTime(log.checkInTime!) : '--';
    final checkOut = log.checkOutTime != null ? _formatTime(log.checkOutTime!) : '--';

    // Fixed late detection: use lateMinutes from backend, which properly compares
    // check-in time against the shift schedule. 8:00 AM is NOT late if shift starts at 8:00 AM.
    final isLate = log.lateMinutes > 0;

    Color statusColor;
    String statusText;
    IconData statusIcon;
    if (isLate) {
      statusColor = AppTheme.lateRed;
      statusText = 'Late';
      statusIcon = Icons.warning_amber_rounded;
    } else if (log.status == 'checked_out') {
      statusColor = AppTheme.presentGreen;
      statusText = 'Present';
      statusIcon = Icons.check_circle_outline;
    } else if (log.status == 'checked_in') {
      statusColor = AppTheme.info;
      statusText = 'Working';
      statusIcon = Icons.access_time;
    } else {
      statusColor = AppTheme.textLight(context);
      statusText = log.statusLabel;
      statusIcon = Icons.circle_outlined;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card(context), borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? [] : [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Date column
          Container(
            width: 52, padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(children: [
              Text(dayName, style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppTheme.textSecondary(context), fontWeight: FontWeight.w600)),
              Text(dayNum, style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700, color: AppTheme.primaryBlue)),
            ]),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Regular Shift', style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              fontWeight: FontWeight.w600, color: AppTheme.textPrimary(context))),
            Text(log.branchName, style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppTheme.textSecondary(context))),
          ])),
          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: statusColor.withValues(alpha: 0.3)),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(statusIcon, size: 12, color: statusColor),
              const SizedBox(width: 4),
              Text(statusText, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w600)),
            ]),
          ),
        ]),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.card2(context), borderRadius: BorderRadius.circular(12),
          ),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('CHECK IN', style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppTheme.textLight(context), letterSpacing: 0.8, fontSize: 10)),
              const SizedBox(height: 2),
              Text(checkIn, style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: isLate ? AppTheme.lateRed : AppTheme.textPrimary(context))),
            ])),
            Container(width: 1, height: 28, color: AppTheme.divider(context)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('CHECK OUT', style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppTheme.textLight(context), letterSpacing: 0.8, fontSize: 10)),
              const SizedBox(height: 2),
              Text(checkOut, style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700, color: AppTheme.textPrimary(context))),
            ])),
            Container(width: 1, height: 28, color: AppTheme.divider(context)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('TOTAL', style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppTheme.textLight(context), letterSpacing: 0.8, fontSize: 10)),
              const SizedBox(height: 2),
              Text(log.totalWorkedFormatted, style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700, color: AppTheme.primaryBlue)),
            ])),
          ]),
        ),
      ]),
    );
  }

  String _formatTime(String dateTimeStr) {
    final dt = DateTime.tryParse(dateTimeStr);
    if (dt == null) return dateTimeStr;
    return DateFormat('hh:mm a').format(dt.toLocal());
  }
}
