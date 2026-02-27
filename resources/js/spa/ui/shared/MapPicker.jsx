import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function MapClickHandler({ onClick }) {
    useMapEvents({
        click(e) {
            onClick?.(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function ChangeView({ center, zoom }) {
    const map = useMap();

    useEffect(() => {
        const id = window.setTimeout(() => {
            map.invalidateSize();
        }, 50);

        return () => window.clearTimeout(id);
    }, [map]);

    useEffect(() => {
        if (center) {
            map.setView(center, zoom ?? map.getZoom(), { animate: true });
        }
    }, [center, zoom, map]);
    return null;
}

export function MapPicker({
    latitude,
    longitude,
    radiusMeters = 100,
    onChange,
    height = '300px',
    markers = [],
    enableSearch = true,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef(null);

    const center = useMemo(() => {
        const lat = Number.isFinite(Number(latitude)) ? Number(latitude) : 0;
        const lng = Number.isFinite(Number(longitude)) ? Number(longitude) : 0;
        return [lat || 40.7128, lng || -74.006];
    }, [latitude, longitude]);

    const handleSearch = async (query) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
                { headers: { 'Accept-Language': 'en' } }
            );
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            setSearchResults(data || []);
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const onSearchInputChange = (value) => {
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => handleSearch(value), 400);
    };

    const selectResult = (item) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            onChange?.(lat, lon);
        }
        setSearchQuery(item.display_name.split(',')[0]);
        setSearchResults([]);
    };

    return (
        <div className="space-y-2">
            {enableSearch && (
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search location (e.g., New York)..."
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0a1f43]"
                        value={searchQuery}
                        onChange={(e) => onSearchInputChange(e.target.value)}
                    />
                    {isSearching && (
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">Searching...</span>
                    )}
                    {searchResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                            {searchResults.map((r) => (
                                <button
                                    key={r.place_id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                    onClick={() => selectResult(r)}
                                >
                                    <div className="font-medium text-slate-800 truncate">{r.display_name.split(',')[0]}</div>
                                    <div className="text-xs text-slate-500 truncate">{r.display_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height }}>
                <MapContainer
                    center={center}
                    zoom={13}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ChangeView center={center} />
                    <MapClickHandler onClick={onChange} />

                    {/* Radius circle for selected location */}
                    {Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Number(radiusMeters) > 0 && (
                        <Circle
                            center={[Number(latitude), Number(longitude)]}
                            radius={Number(radiusMeters)}
                            pathOptions={{ color: '#0a1f43', fillColor: '#0a1f43', fillOpacity: 0.1 }}
                        />
                    )}

                    {/* Draggable main marker */}
                    {Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && (
                        <Marker
                            position={[Number(latitude), Number(longitude)]}
                            icon={defaultIcon}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e) => {
                                    const { lat, lng } = e.target.getLatLng();
                                    onChange?.(lat, lng);
                                },
                            }}
                        >
                            <Popup>
                                Office Location
                                <br />
                                Lat: {Number(latitude).toFixed(6)}
                                <br />
                                Lng: {Number(longitude).toFixed(6)}
                            </Popup>
                        </Marker>
                    )}

                    {/* All workplace markers */}
                    {markers.map((m) => (
                        <Marker
                            key={m.id}
                            position={[Number(m.latitude), Number(m.longitude)]}
                            icon={defaultIcon}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <div className="font-semibold">{m.name}</div>
                                    {m.address && <div className="text-slate-600">{m.address}</div>}
                                    <div className="text-slate-500 text-xs mt-1">
                                        Lat: {Number(m.latitude).toFixed(6)}
                                        <br />
                                        Lng: {Number(m.longitude).toFixed(6)}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Click map to set location or drag marker</span>
                <span>
                    Lat: {Number(latitude || 0).toFixed(6)} | Lng: {Number(longitude || 0).toFixed(6)}
                </span>
            </div>
        </div>
    );
}
