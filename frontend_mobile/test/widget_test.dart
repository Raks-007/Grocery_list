import 'package:flutter_test/flutter_test.dart';
import 'package:grocery_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const GrocerySyncApp());
    // App should render without crashing
    expect(find.byType(GrocerySyncApp), findsOneWidget);
  });
}
