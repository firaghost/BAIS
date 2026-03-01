import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/holiday.dart';
import '../services/api_service.dart';
import '../services/holiday_service.dart';
import '../theme/app_theme.dart';
import './glass_surface.dart';

class HolidaySheet extends StatefulWidget {
  const HolidaySheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        final height = MediaQuery.of(sheetContext).size.height * 0.75;
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
                top: Radius.circular(24),
              ),
              padding: EdgeInsets.zero,
              child: SizedBox(height: height, child: const HolidaySheet()),
            ),
          ),
        );
      },
    );
  }

  @override
  State<HolidaySheet> createState() => _HolidaySheetState();
}

class _HolidaySheetState extends State<HolidaySheet> {
  final _holidayService = HolidayService();
  bool _isLoading = true;
  String? _error;
  List<Holiday> _holidays = [];

  @override
  void initState() {
    super.initState();
    _fetchHolidays();
  }

  Future<void> _fetchHolidays() async {
    try {
      final list = await _holidayService.getUpcomingHolidays();
      if (!mounted) return;
      setState(() {
        _holidays = list;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (e is ApiException) {
          _error = 'Failed to load holidays (${e.statusCode}): ${e.message}';
        } else {
          _error = 'Failed to load holidays';
        }
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Drag handle
        Container(
          margin: const EdgeInsets.only(top: 12, bottom: 8),
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: Colors.grey.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        // Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.event_available_rounded,
                  color: AppTheme.primaryBlue,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Holidays',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary(context),
                  ),
                ),
              ),
              IconButton(
                icon: Icon(
                  Icons.close_rounded,
                  color: AppTheme.textPrimary(context),
                ),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
        ),
        Divider(color: AppTheme.divider(context), height: 1),
        // Content
        Expanded(child: _buildContent(context)),
      ],
    );
  }

  Widget _buildContent(BuildContext context) {
    if (_isLoading) {
      return Center(
        child: CircularProgressIndicator(color: AppTheme.primaryBlue),
      );
    }
    if (_error != null) {
      return Center(
        child: Text(
          _error!,
          style: TextStyle(color: AppTheme.textSecondary(context)),
        ),
      );
    }
    if (_holidays.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_today_rounded,
              size: 64,
              color: AppTheme.textLight(context),
            ),
            const SizedBox(height: 16),
            Text(
              'No upcoming holidays',
              style: TextStyle(
                color: AppTheme.textSecondary(context),
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }

    final entries = _buildEntries();

    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: entries.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final entry = entries[index];
        if (entry is _HolidayMonthHeader) {
          return Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 4),
            child: Text(
              entry.label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: AppTheme.textSecondary(context),
              ),
            ),
          );
        }

        final item = entry as _HolidayItem;
        final holiday = item.holiday;
        final dateObj = item.date;
        final dateFormatted = DateFormat('EEEE, MMM d, yyyy').format(dateObj);

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.card(context),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.divider(context)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primaryBlue, AppTheme.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    DateFormat('d').format(dateObj),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      holiday.name,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary(context),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.calendar_today_outlined,
                          size: 14,
                          color: AppTheme.textSecondary(context),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          dateFormatted,
                          style: TextStyle(
                            fontSize: 13,
                            color: AppTheme.textSecondary(context),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  List<Object> _buildEntries() {
    final parsed = <_HolidayItem>[];
    for (final h in _holidays) {
      final d = DateTime.tryParse(h.holidayDate);
      if (d == null) continue;
      parsed.add(_HolidayItem(h, d));
    }

    parsed.sort((a, b) => a.date.compareTo(b.date));

    final entries = <Object>[];
    String? current;
    for (final item in parsed) {
      final key =
          '${item.date.year}-${item.date.month.toString().padLeft(2, '0')}';
      if (key != current) {
        current = key;
        entries.add(
          _HolidayMonthHeader(DateFormat('MMMM yyyy').format(item.date)),
        );
      }
      entries.add(item);
    }

    return entries;
  }
}

class _HolidayMonthHeader {
  final String label;

  _HolidayMonthHeader(this.label);
}

class _HolidayItem {
  final Holiday holiday;
  final DateTime date;

  _HolidayItem(this.holiday, this.date);
}
