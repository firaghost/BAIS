import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Primary colors
  static const Color primaryBlue = Color(0xFF3F51B5);
  static const Color primaryDark = Color(0xFF303F9F);
  static const Color primaryLight = Color(0xFFC5CAE9);

  // Status colors
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);

  // Badge colors
  static const Color presentGreen = Color(0xFF10B981);
  static const Color lateRed = Color(0xFFEF4444);
  static const Color halfDayOrange = Color(0xFFF59E0B);

  // ── Light neutrals ──
  static const Color _lightBackground = Color(0xFFF0F2F8);
  static const Color _lightCard = Color(0xFFFFFFFF);
  static const Color _lightTextPrimary = Color(0xFF0D1B2A);
  static const Color _lightTextSecondary = Color(0xFF5A6A72);
  static const Color _lightTextLight = Color(0xFF9CA3AF);
  static const Color _lightDivider = Color(0xFFE5E7EB);

  // ── Dark neutrals ──
  static const Color _darkBackground = Color(0xFF0F1117);
  static const Color _darkCard = Color(0xFF1C1F2E);
  static const Color _darkCard2 = Color(0xFF252839);
  static const Color _darkTextPrimary = Color(0xFFE8EAED);
  static const Color _darkTextSecondary = Color(0xFF9CA3AF);
  static const Color _darkTextLight = Color(0xFF6B7280);
  static const Color _darkDivider = Color(0xFF2D3142);

  // ─────── Context helpers ───────
  static Color background(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? _darkBackground : _lightBackground;
  static Color card(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? _darkCard : _lightCard;
  static Color card2(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? _darkCard2 : const Color(0xFFF8F9FF);
  static Color textPrimary(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? _darkTextPrimary : _lightTextPrimary;
  static Color textSecondary(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? _darkTextSecondary : _lightTextSecondary;
  static Color textLight(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? _darkTextLight : _lightTextLight;
  static Color divider(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? _darkDivider : _lightDivider;
  static Color inputFill(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? _darkCard2 : _lightCard;

  // ─────── LIGHT THEME ───────
  static ThemeData get lightTheme => _buildTheme(Brightness.light);

  // ─────── DARK THEME ───────
  static ThemeData get darkTheme => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final bg = isDark ? _darkBackground : _lightBackground;
    final cardColor = isDark ? _darkCard : _lightCard;
    final textPrimaryColor = isDark ? _darkTextPrimary : _lightTextPrimary;
    final textSecondaryColor = isDark ? _darkTextSecondary : _lightTextSecondary;
    final textLightColor = isDark ? _darkTextLight : _lightTextLight;
    final dividerColor = isDark ? _darkDivider : _lightDivider;
    final inputFillColor = isDark ? _darkCard2 : _lightCard;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryBlue,
        primary: primaryBlue,
        surface: bg,
        brightness: brightness,
      ),
      scaffoldBackgroundColor: bg,
      textTheme: GoogleFonts.interTextTheme(isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme).apply(
        bodyColor: textPrimaryColor,
        displayColor: textPrimaryColor,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: cardColor,
        foregroundColor: textPrimaryColor,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: textPrimaryColor,
        ),
        iconTheme: IconThemeData(color: textPrimaryColor),
      ),
      cardTheme: CardThemeData(
        color: cardColor,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimaryColor,
          minimumSize: const Size(double.infinity, 54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          side: BorderSide(color: dividerColor),
          textStyle: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryBlue,
          textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: inputFillColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: primaryBlue, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: error),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        labelStyle: GoogleFonts.inter(color: textSecondaryColor),
        hintStyle: GoogleFonts.inter(color: textLightColor),
        prefixIconColor: textLightColor,
        suffixIconColor: textLightColor,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: cardColor,
        selectedItemColor: primaryBlue,
        unselectedItemColor: textLightColor,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
        unselectedLabelStyle: GoogleFonts.inter(fontSize: 12),
        elevation: 0,
      ),
      dividerColor: dividerColor,
      dividerTheme: DividerThemeData(color: dividerColor, thickness: 1),
      dialogTheme: DialogThemeData(
        backgroundColor: cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: textPrimaryColor,
        ),
        contentTextStyle: GoogleFonts.inter(fontSize: 14, color: textSecondaryColor),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark ? _darkCard : _lightTextPrimary,
        contentTextStyle: GoogleFonts.inter(color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.inter(color: textPrimaryColor, fontSize: 14),
        elevation: 4,
      ),
      dropdownMenuTheme: DropdownMenuThemeData(
        menuStyle: MenuStyle(
          backgroundColor: WidgetStateProperty.all(cardColor),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: primaryBlue,
        textColor: textPrimaryColor,
        tileColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      iconTheme: IconThemeData(color: textSecondaryColor),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return primaryBlue;
          return textLightColor;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return primaryBlue.withValues(alpha: 0.4);
          return dividerColor;
        }),
      ),
    );
  }
}
