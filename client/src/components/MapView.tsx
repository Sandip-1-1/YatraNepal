import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  LayersControl,
  ZoomControl,
  LayerGroup,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Bus, Route, Stop, Traffic } from "@shared/schema";
import { Bus as BusIcon, MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewProps {
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  traffic: Traffic[];
  selectedRoute: Route | null;
  onBusClick: (bus: Bus) => void;
  showTraffic: boolean;
  routeGeometry: [number, number][] | null;
}

// Custom bus icon with route color — cached by color+type to avoid DOM thrashing
const busIconCache = new Map<string, L.DivIcon>();
const getBusIcon = (color: string, vehicleType: string): L.DivIcon => {
  const cacheKey = `${color}-${vehicleType}`;
  const cached = busIconCache.get(cacheKey);
  if (cached) return cached;

  const isBus = vehicleType === "bus";
  const size = isBus ? 32 : 28;
  const half = size / 2;

  // Bus SVG: multi-window bus shape
  const busSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
    <rect x="3" y="4" width="18" height="14" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="4" x2="9" y2="9"/>
    <line x1="15" y1="4" x2="15" y2="9"/>
    <circle cx="7.5" cy="16" r="1.5"/>
    <circle cx="16.5" cy="16" r="1.5"/>
  </svg>`;

  // Minibus SVG: smaller van shape
  const minibusSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
    <path d="M5 6h10l4 4v6a1 1 0 01-1 1H6a1 1 0 01-1-1V6z"/>
    <line x1="5" y1="10" x2="19" y2="10"/>
    <circle cx="8" cy="16" r="1.5"/>
    <circle cx="15" cy="16" r="1.5"/>
  </svg>`;

  const icon = L.divIcon({
    className: "custom-bus-marker",
    html: `
      <div style="position: relative;">
        <div style="
          background: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${isBus ? busSvg : minibusSvg}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
  busIconCache.set(cacheKey, icon);
  return icon;
};

// Custom stop icon
const stopIcon = L.divIcon({
  className: "custom-stop-marker",
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

// Component to auto-fit map bounds — only runs on mount or when selectedRouteId changes
function MapBounds({ stops, selectedRouteId }: { stops: Stop[]; selectedRouteId: string | null }) {
  const map = useMap();
  const prevRouteId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Only fit bounds on initial mount (undefined → any) or when route selection changes
    if (prevRouteId.current === selectedRouteId) return;
    prevRouteId.current = selectedRouteId;

    if (stops.length > 0) {
      const bounds = stops.map(
        (stop) =>
          [parseFloat(stop.latitude), parseFloat(stop.longitude)] as [
            number,
            number,
          ],
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [selectedRouteId, map, stops]);

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
  routeGeometry,
}: MapViewProps) {
  // Default center: Kathmandu
  const [center] = useState<[number, number]>([27.7172, 85.324]);
  const selectedRouteId = selectedRoute?.id ?? null;

  // Stabilize filtered arrays — stops don't change with bus coordinate updates
  const filteredStops = useMemo(
    () =>
      selectedRouteId
        ? stops.filter((s) => s.routeId === selectedRouteId)
        : stops,
    [stops, selectedRouteId],
  );

  // Buses update every WS tick (new positions), so no deep memo — just filter
  const filteredBuses = selectedRouteId
    ? buses.filter((b) => b.routeId === selectedRouteId)
    : buses;

  // Create route polylines — prefer road geometry from OSRM, fall back to stop-to-stop
  const routeLines = useMemo(() => {
    if (!selectedRoute) return [];

    if (routeGeometry && routeGeometry.length > 0) {
      return [
        {
          route: selectedRoute,
          coordinates: routeGeometry,
        },
      ];
    }

    // Fallback: straight lines between stops
    return [
      {
        route: selectedRoute,
        coordinates: [...filteredStops]
          .sort((a, b) => a.sequence - b.sequence)
          .map(
            (stop) =>
              [
                parseFloat(stop.latitude),
                parseFloat(stop.longitude),
              ] as [number, number],
          ),
      },
    ];
  }, [selectedRoute, routeGeometry, filteredStops]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      maxZoom={19}
      className="h-full w-full"
      zoomControl={false}>
      <ZoomControl position="bottomleft" />
      <LayersControl position="bottomleft">
        <LayersControl.BaseLayer checked name="Street Map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <LayerGroup>
            <TileLayer
              attribution='&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={18}
              maxZoom={19}
            />
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
          </LayerGroup>
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* Auto-fit bounds on mount and route selection change only */}
      {filteredStops.length > 0 && <MapBounds stops={filteredStops} selectedRouteId={selectedRouteId} />}

      {/* Route lines */}
      {routeLines.map(({ route, coordinates }) => (
        <Polyline
          key={route.id}
          positions={coordinates}
          pathOptions={{
            color: route.color,
            weight: 4,
            opacity: 0.8,
          }}
        />
      ))}

      {/* Bus stops */}
      {filteredStops.map((stop) => (
        <Marker
          key={stop.id}
          position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
          icon={stopIcon}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{stop.name}</div>
              <div className="text-muted-foreground text-xs mt-1">
                Stop #{stop.sequence}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Buses */}
      {filteredBuses.map((bus) => {
        const route = routes.find((r) => r.id === bus.routeId);
        return (
          <Marker
            key={bus.id}
            position={[
              parseFloat(bus.currentLatitude),
              parseFloat(bus.currentLongitude),
            ]}
            icon={getBusIcon(route?.color || "#2563eb", bus.vehicleType)}
            eventHandlers={{
              click: () => onBusClick(bus),
            }}>
            <Popup>
              <div className="text-sm min-w-[200px]">
                <div className="font-semibold text-base mb-2">
                  {bus.busNumber}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs">
                      {route?.name || "Unknown Route"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs">{bus.speed} km/h</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {bus.vehicleType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {bus.company}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Traffic indicators */}
      {showTraffic &&
        traffic.map((t) => {
          const color =
            t.congestionLevel === "light"
              ? "#22c55e"
              : t.congestionLevel === "medium"
                ? "#fbbf24"
                : "#ef4444";

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
              }}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold capitalize">
                    {t.congestionLevel} Traffic
                  </div>
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
