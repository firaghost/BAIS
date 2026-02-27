import 'dart:io';
import 'package:image/image.dart';

void main() async {
  final bytes = await File('assets/logo.png').readAsBytes();
  final image = decodeImage(bytes);
  if (image == null) {
    stdout.writeln('Failed to decode image.');
    return;
  }

  // The non-transparent area is from x=150 to x=449, y=0 to y=299
  // So we extract a 300x300 square from the middle:
  final cropped = copyCrop(image, x: 150, y: 0, width: 300, height: 300);

  await File('assets/icon.png').writeAsBytes(encodePng(cropped));
  stdout.writeln('Successfully cropped and saved as assets/icon.png');
}
