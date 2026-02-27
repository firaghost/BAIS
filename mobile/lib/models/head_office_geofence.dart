class HeadOfficeGeoFence {
  final double latitude;
  final double longitude;
  final int radiusMeters;

  const HeadOfficeGeoFence({
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
  });

  factory HeadOfficeGeoFence.fromJson(Map<String, dynamic> json) {
    return HeadOfficeGeoFence(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      radiusMeters: (json['radius_meters'] as num?)?.toInt() ?? 0,
    );
  }
}
