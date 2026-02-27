import 'dart:math';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class AppBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const AppBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    const items = <_NavSpec>[
      _NavSpec(
        label: 'Home',
        icon: Icons.dashboard_outlined,
        activeIcon: Icons.dashboard_rounded,
      ),
      _NavSpec(
        label: 'Schedule',
        icon: Icons.calendar_today_outlined,
        activeIcon: Icons.calendar_today_rounded,
      ),
      _NavSpec(
        label: 'History',
        icon: Icons.history_outlined,
        activeIcon: Icons.history_rounded,
      ),
      _NavSpec(
        label: 'Leave',
        icon: Icons.event_note_outlined,
        activeIcon: Icons.event_note_rounded,
      ),
      _NavSpec(
        label: 'Profile',
        icon: Icons.person_outline,
        activeIcon: Icons.person_rounded,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final safeBottom = MediaQuery.of(context).padding.bottom;

        const horizontalPadding = 18.0;
        final usableWidth = width - horizontalPadding * 2;
        final step = usableWidth / (items.length - 1);

        const notchHalfWidth = 56.0;
        const edgeGuard = notchHalfWidth + 12.0;
        final unclampedCenterX = horizontalPadding + step * currentIndex;
        final centerX = unclampedCenterX.clamp(edgeGuard, width - edgeGuard);
        final centerButtonSize = 64.0;
        final centerButtonLeft = centerX - centerButtonSize / 2;

        return SizedBox(
          height: 88 + safeBottom,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _NavCurvePainter(
                    color: AppTheme.card(
                      context,
                    ).withValues(alpha: isDark ? 0.95 : 0.97),
                    shadowColor: isDark
                        ? Colors.black.withValues(alpha: 0.35)
                        : Colors.black.withValues(alpha: 0.08),
                    notchCenterX: centerX,
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: 18,
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: horizontalPadding,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: List.generate(items.length, (index) {
                        final spec = items[index];
                        final selected = currentIndex == index;
                        return _NavItem(
                          icon: spec.icon,
                          activeIcon: spec.activeIcon,
                          label: spec.label,
                          isActive: selected,
                          hideIcon: selected,
                          hideLabel: selected,
                          onTap: () => onTap(index),
                        );
                      }),
                    ),
                  ),
                ),
              ),
              AnimatedPositioned(
                duration: const Duration(milliseconds: 320),
                curve: Curves.easeOutCubic,
                left: centerButtonLeft,
                top: -22,
                child: _CenterActionButton(
                  icon: items[currentIndex].activeIcon,
                  isActive: true,
                  onTap: () => onTap(currentIndex),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _NavSpec {
  final String label;
  final IconData icon;
  final IconData activeIcon;

  const _NavSpec({
    required this.label,
    required this.icon,
    required this.activeIcon,
  });
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isActive;
  final bool hideIcon;
  final bool hideLabel;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isActive,
    required this.hideIcon,
    required this.hideLabel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = AppTheme.primaryBlue;
    final inactiveColor = AppTheme.textLight(context);

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 64,
        child: AnimatedSlide(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutCubic,
          offset: isActive ? const Offset(0, -0.05) : Offset.zero,
          child: AnimatedOpacity(
            duration: const Duration(milliseconds: 200),
            opacity: isActive ? 1 : 0.8,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedScale(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOut,
                  scale: isActive ? 1.05 : 1,
                  child: hideIcon
                      ? const SizedBox(height: 24)
                      : Icon(
                          isActive ? activeIcon : icon,
                          color: isActive ? activeColor : inactiveColor,
                          size: 24,
                        ),
                ),
                const SizedBox(height: 2),
                AnimatedOpacity(
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOut,
                  opacity: hideLabel ? 0 : 1,
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: isActive ? activeColor : inactiveColor,
                      fontSize: 10,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CenterActionButton extends StatefulWidget {
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;

  const _CenterActionButton({
    required this.icon,
    required this.isActive,
    required this.onTap,
  });

  @override
  State<_CenterActionButton> createState() => _CenterActionButtonState();
}

class _CenterActionButtonState extends State<_CenterActionButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        scale: _pressed ? 0.95 : 1,
        child: Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: AppTheme.primaryBlue,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryBlue.withValues(alpha: 0.35),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
            border: Border.all(color: AppTheme.background(context), width: 4),
          ),
          child: Icon(
            widget.icon,
            color: isDark ? Colors.white : Colors.white,
            size: 30,
          ),
        ),
      ),
    );
  }
}

class _NavCurvePainter extends CustomPainter {
  final Color color;
  final Color shadowColor;
  final double notchCenterX;

  const _NavCurvePainter({
    required this.color,
    required this.shadowColor,
    required this.notchCenterX,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;

    final path = Path();
    final w = size.width;
    final h = size.height;

    const top = 0.0;

    final center = notchCenterX.clamp(0.0, w);
    final notchHalfWidth = min(56.0, w * 0.18);
    final notchDepth = min(45.0, h * 0.6);

    path.moveTo(0, top);
    path.cubicTo(
      w * 0.18,
      top,
      center - notchHalfWidth,
      top,
      center - notchHalfWidth,
      top,
    );

    path.cubicTo(
      center - notchHalfWidth * 0.7,
      top,
      center - notchHalfWidth * 0.55,
      top + notchDepth,
      center,
      top + notchDepth,
    );

    path.cubicTo(
      center + notchHalfWidth * 0.55,
      top + notchDepth,
      center + notchHalfWidth * 0.7,
      top,
      center + notchHalfWidth,
      top,
    );

    path.cubicTo(w - w * 0.18, top, w, top, w, top);
    path.lineTo(w, h);
    path.lineTo(0, h);
    path.close();

    canvas.drawShadow(path, shadowColor, 8, true);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _NavCurvePainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.shadowColor != shadowColor ||
        oldDelegate.notchCenterX != notchCenterX;
  }
}
