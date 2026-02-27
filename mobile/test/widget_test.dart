import 'package:flutter_test/flutter_test.dart';
import 'package:Attendance/main.dart';

void main() {
  testWidgets('App renders without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const BAISApp());
    expect(find.byType(BAISApp), findsOneWidget);
  });
}
