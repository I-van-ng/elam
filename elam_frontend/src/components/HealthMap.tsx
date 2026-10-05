import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { buildGoogleMapsUrl, buildOsmUrl, formatCoordinates } from '../utils/locationLinks';

// Fix for default Leaflet icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const pharmacyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const dutyPharmacyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const doctorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const clinicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  type: 'PHARMACY' | 'DOCTOR' | 'CLINIC';
  isOnDuty?: boolean;
  phone?: string;
  badge?: string;
  zone?: string;
  positionConfirmed?: boolean;
}

interface HealthMapProps {
  center: [number, number];
  markers: MarkerItem[];
  userLocation?: [number, number];
  heightClass?: string;
}

// Helper to recenter map when center changes
const MapViewport: React.FC<{ center: [number, number]; markers: MarkerItem[]; userLocation?: [number, number] }> = ({
  center,
  markers,
  userLocation,
}) => {
  const map = useMap();
  useEffect(() => {
    const points = [
      ...markers.map((marker) => [marker.lat, marker.lng] as [number, number]),
      ...(userLocation ? [userLocation] : []),
    ];

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 14 });
      return;
    }

    map.setView(center, 13);
  }, [center, map, markers, userLocation]);
  return null;
};

export const HealthMap: React.FC<HealthMapProps> = ({
  center,
  markers,
  userLocation,
  heightClass = 'h-80 sm:h-96',
}) => {
  const stats = useMemo(() => {
    const pharmacies = markers.filter((marker) => marker.type === 'PHARMACY').length;
    const doctors = markers.filter((marker) => marker.type === 'DOCTOR').length;
    const clinics = markers.filter((marker) => marker.type === 'CLINIC').length;
    const zones = Array.from(new Set(markers.map((marker) => marker.zone).filter(Boolean)));

    return { pharmacies, doctors, clinics, zones };
  }, [markers]);

  return (
    <div className={`w-full ${heightClass} rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative bg-slate-100`}>
      <div className="absolute left-3 right-3 top-3 z-[500] flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="rounded-2xl bg-white/95 px-3 py-2 shadow-sm border border-slate-200">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Grand Libreville</p>
          <p className="text-xs font-extrabold text-slate-900">
            {markers.length} points visibles
          </p>
          <p className="text-[10px] font-semibold text-slate-500">
            {stats.zones.slice(0, 4).join(' • ')}
            {stats.zones.length > 4 ? ` +${stats.zones.length - 4}` : ''}
          </p>
        </div>

        <div className="rounded-2xl bg-white/95 px-3 py-2 shadow-sm border border-slate-200 flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-amber-400" /> {stats.pharmacies} pharmacies</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-blue-500" /> {stats.doctors} médecins</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-rose-500" /> {stats.clinics} urgences</span>
        </div>
      </div>

      <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="w-full h-full">
        <MapViewport center={center} markers={markers} userLocation={userLocation} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User position */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-slate-900">📍 Votre position actuelle</p>
                <p className="text-slate-600">Position patient</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Markers */}
        {markers.map((item) => {
          let icon = pharmacyIcon;
          if (item.type === 'PHARMACY') {
            icon = item.isOnDuty ? dutyPharmacyIcon : pharmacyIcon;
          } else if (item.type === 'DOCTOR') {
            icon = doctorIcon;
          } else if (item.type === 'CLINIC') {
            icon = clinicIcon;
          }

          return (
            <Marker key={item.id} position={[item.lat, item.lng]} icon={icon}>
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    {item.isOnDuty && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        De Garde
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600">{item.subtitle}</p>
                  {item.zone && <p className="text-slate-500">Zone : {item.zone}</p>}
                  <p className="text-slate-500">GPS : {formatCoordinates(item.lat, item.lng)}</p>
                  {item.phone && (
                    <p className="text-emerald-700 font-semibold flex items-center gap-1">
                      📞 {item.phone}
                    </p>
                  )}
                  {item.badge && (
                    <span className="inline-block bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {item.badge}
                    </span>
                  )}
                  <div className="flex items-center gap-1 pt-1">
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      item.positionConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {item.positionConfirmed ? 'Position confirmée' : 'Position à vérifier'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-bold">
                    <a
                      href={buildOsmUrl(item.lat, item.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:text-emerald-800"
                    >
                      OSM
                    </a>
                    <a
                      href={buildGoogleMapsUrl(item.lat, item.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:text-blue-800"
                    >
                      Google Maps
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
