import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import type { Bus, Route, Stop, Traffic } from '@shared/schema';
import { Bus as BusIcon, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  traffic: Traffic[];
  selectedRoute: Route | null;
  onBusClick: (bus: Bus) => void;
  showTraffic: boolean;
}

// Custom bus icon with route color
const createBusIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div style="position: relative;">
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <rect x="3" y="6" width="18" height="12" rx="2"/>
            <path d="M3 10h18"/>
            <circle cx="8" cy="16" r="1"/>
            <circle cx="16" cy="16" r="1"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Custom stop icon
const stopIcon = L.divIcon({
  className: 'custom-stop-marker',
  html: `
    <div style="
      background: white;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid #2563eb;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    "></div>
  `,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Component to auto-fit map bounds
function MapBounds({ stops }: { stops: Stop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length > 0) {
      const bounds = stops.map(stop => [
        parseFloat(stop.latitude),
        parseFloat(stop.longitude),
      ] as [number, number]);
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [stops, map]);

  return null;
}

export default function MapView({
  buses,
  routes,
  stops,
  traffic,
  selectedRoute,
  onBusClick,
  showTraffic,
}: MapViewProps) {
  // Default center: Kathmandu
  const [center] = useState<[number, number]>([27.7172, 85.3240]);

  // Filter stops and buses by selected route
  const filteredStops = selectedRoute
    ? stops.filter(s => s.routeId === selectedRoute.id)
    : stops;

  const filteredBuses = selectedRoute
    ? buses.filter(b => b.routeId === selectedRoute.id)
    : buses;

  // Get route color
  const getRouteColor = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route?.color || '#2563eb';
  };

  // Create route polylines
  const routeLines = selectedRoute ? [{
    route: selectedRoute,
    coordinates: filteredStops
      .sort((a, b) => a.sequence - b.sequence)
      .map(stop => [parseFloat(stop.latitude), parseFloat(stop.longitude)] as [number, number]),
  }] : [];

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Auto-fit bounds when route selected */}
      {filteredStops.length > 0 && <MapBounds stops={filteredStops} />}

      {/* Route lines */}
      {routeLines.map(({ route, coordinates }) => (
        <Polyline
          key={route.id}
          positions={coordinates}
          pathOptions={{
            color: route.color,
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10',
          }}
        />
      ))}

      {/* Bus stops */}
      {filteredStops.map(stop => (
        <Marker
          key={stop.id}
          position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
          icon={stopIcon}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{stop.name}</div>
              <div className="text-muted-foreground text-xs mt-1">Stop #{stop.sequence}</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Buses */}
      {filteredBuses.map(bus => {
        const route = routes.find(r => r.id === bus.routeId);
        return (
          <Marker
            key={bus.id}
            position={[parseFloat(bus.currentLatitude), parseFloat(bus.currentLongitude)]}
            icon={createBusIcon(route?.color || '#2563eb')}
            eventHandlers={{
              click: () => onBusClick(bus),
            }}
          >
            <Popup>
              <div className="text-sm min-w-[200px]">
                <div className="font-semibold text-base mb-2">{bus.busNumber}</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs">{route?.name || 'Unknown Route'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs">{bus.speed} km/h</span>
                  </div>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {bus.capacity - bus.occupiedSeats} seats available
                    </Badge>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Traffic indicators */}
      {showTraffic && traffic.map(t => {
        const color = 
          t.congestionLevel === 'light' ? '#22c55e' :
          t.congestionLevel === 'medium' ? '#fbbf24' :
          '#ef4444';
        
        return (
          <Circle
            key={t.id}
            center={[parseFloat(t.latitude), parseFloat(t.longitude)]}
            radius={200}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.2,
              color: color,
              weight: 2,
              opacity: 0.5,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold capitalize">{t.congestionLevel} Traffic</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(t.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </MapContainer>
  );
}
