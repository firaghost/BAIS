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

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final user = auth.user;
    final firstName = user?.employee?.firstName ?? user?.name ?? 'E';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
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
                        child: Text(
                          firstName.isNotEmpty ? firstName[0].toUpperCase() : 'E',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'History',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const Spacer(),
                      Stack(
                        children: [
                          IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
                          Positioned(
                            right: 8, top: 8,
                            child: Container(
                              width: 8, height: 8,
                              decoration: BoxDecoration(color: AppTheme.error, shape: BoxShape.circle),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Filters
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: _selectMonth,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.divider),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.calendar_today, size: 16, color: AppTheme.textSecondary),
                                const SizedBox(width: 8),
                                Text(
                                  DateFormat('MMMM yyyy').format(_selectedMonth),
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        fontWeight: FontWeight.w500,
                                      ),
                                ),
                                const Spacer(),
                                Icon(Icons.keyboard_arrow_down, size: 20, color: AppTheme.textSecondary),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.divider),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedStatus,
                              isExpanded: true,
                              icon: Icon(Icons.keyboard_arrow_down, size: 20, color: AppTheme.textSecondary),
                              hint: Row(
                                children: [
                                  Icon(Icons.filter_list, size: 16, color: AppTheme.textSecondary),
                                  const SizedBox(width: 8),
                                  Text('All Status'),
                                ],
                              ),
                              items: [
                                DropdownMenuItem(value: null, child: Text('All Status')),
                                DropdownMenuItem(value: 'checked_in', child: Text('Checked In')),
                                DropdownMenuItem(value: 'checked_out', child: Text('Checked Out')),
                              ],
                              onChanged: (value) {
                                setState(() => _selectedStatus = value);
                                _loadHistory();
                              },
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
            // History List
            Expanded(
              child: attendance.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : attendance.history.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.history, size: 48, color: AppTheme.textLight),
                              const SizedBox(height: 12),
                              Text('No attendance records found',
                                  style: TextStyle(color: AppTheme.textSecondary)),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: attendance.history.length,
                          itemBuilder: (context, index) {
                            return _HistoryCard(log: attendance.history[index]);
                          },
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

  const _HistoryCard({required this.log});

  @override
  Widget build(BuildContext context) {
    final logDate = DateTime.tryParse(log.logDate);
    final dayName = logDate != null ? DateFormat('EEE').format(logDate).toUpperCase() : '';
    final dayNum = logDate?.day.toString() ?? '';

    final checkIn = log.checkInTime != null ? _formatTime(log.checkInTime!) : '--';
    final checkOut = log.checkOutTime != null ? _formatTime(log.checkOutTime!) : '--';

    Color statusColor;
    String statusText;
    if (log.isLate) {
      statusColor = AppTheme.lateRed;
      statusText = 'Late';
    } else if (log.status == 'checked_out') {
      statusColor = AppTheme.presentGreen;
      statusText = 'Present';
    } else if (log.status == 'checked_in') {
      statusColor = AppTheme.info;
      statusText = 'Working';
    } else {
      statusColor = AppTheme.textLight;
      statusText = log.statusLabel;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Date column
              Container(
                width: 48,
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  children: [
                    Text(
                      dayName,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppTheme.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    Text(
                      dayNum,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryBlue,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Regular Shift',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    Text(
                      log.branchName,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.textSecondary,
                          ),
                    ),
                  ],
                ),
              ),
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Time row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CHECK IN',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppTheme.textLight,
                            letterSpacing: 0.8,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      checkIn,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: log.isLate ? AppTheme.lateRed : AppTheme.textPrimary,
                          ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CHECK OUT',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppTheme.textLight,
                            letterSpacing: 0.8,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      checkOut,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'TOTAL HRS',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppTheme.textLight,
                            letterSpacing: 0.8,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      log.totalWorkedFormatted,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryBlue,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatTime(String dateTimeStr) {
    final dt = DateTime.tryParse(dateTimeStr);
    if (dt == null) return dateTimeStr;
    final hour = dt.hour;
    final minute = dt.minute;
    final period = hour >= 12 ? 'PM' : 'AM';
    final h = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '${h.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $period';
  }
}
