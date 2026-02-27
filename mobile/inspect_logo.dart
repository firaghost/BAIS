import 'dart:io';
import 'package:image/image.dart';

void main() async {
  final bytes = await File('assets/logo.png').readAsBytes();
  final image = decodeImage(bytes);
  if (image == null) {
    print('Failed to decode image.');
    return;
  }
  print('Width: ${image.width}, Height: ${image.height}');
  
  // Find non-transparent bounds
  int minX = image.width, minY = image.height, maxX = 0, maxY = 0;
  for (int y = 0; y < image.height; y++) {
    for (int x = 0; x < image.width; x++) {
      final pixel = image.getPixel(x, y);
      if (pixel.a > 10) { // arbitrary small non-transparent threshold
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  print('Non-transparent bounds: ($minX, $minY) to ($maxX, $maxY)');
  
  // What color is the center?
  final cx = image.width ~/ 2;
  final cy = image.height ~/ 2;
  final centerPixel = image.getPixel(cx, cy);
  print('Center pixel: R=${centerPixel.r}, G=${centerPixel.g}, B=${centerPixel.b}, A=${centerPixel.a}');
  
  // What color is the edge?
  final pxIn10 = image.getPixel(cx, minY + 10);
  print('Edge inside bound y+10: R=${pxIn10.r}, G=${pxIn10.g}, B=${pxIn10.b}, A=${pxIn10.a}');
  
  int rSum = 0, gSum = 0, bSum = 0, cnt = 0;
  for (int x = minX; x < maxX; x+=10) {
      for (int y = minY; y < maxY; y+=10) {
          final p = image.getPixel(x,y);
          if (p.a > 200) { rSum+=p.r.toInt(); gSum+=p.g.toInt(); bSum+=p.b.toInt(); cnt++; }
      }
  }
  if (cnt > 0) print('Avg color of non-transparent: R=${rSum~/cnt}, G=${gSum~/cnt}, B=${bSum~/cnt}');
}
