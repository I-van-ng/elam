import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

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
}

interface HealthMapProps {
  center: [number, number];
  markers: MarkerItem[];
  userLocation?: [number, number];
  heightClass?: string;
}

// Helper to recenter map when center changes
const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
};

export const HealthMap: React.FC<HealthMapProps> = ({
  center,
  markers,
  userLocation,
  heightClass = 'h-80 sm:h-96',
}) => {
  return (
    <div className={`w-full ${heightClass} rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative`}>
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="w-full h-full">
        <MapRecenter center={center} />
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
                <p className="text-slate-600">Akanda, Libreville</p>
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
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
