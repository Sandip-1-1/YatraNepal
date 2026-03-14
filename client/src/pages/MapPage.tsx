import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MapView from "@/components/MapView";
import BusInfoCard from "@/components/BusInfoCard";
import RouteSelector from "@/components/RouteSelector";
import TrafficToggle from "@/components/TrafficToggle";
import LocationSearch from "@/components/LocationSearch";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import type { Bus, Route, Stop, Traffic } from "@shared/schema";
import type { BusEtaResult } from "@/hooks/use-websocket";

export default function MapPage({
  onOpenNotifications,
  unreadCount,
}: {
  onOpenNotifications: () => void;
  unreadCount: number;
}) {
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<[number, number] | null>(null);

  // Fetch data
  const { data: routes = [] } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  const { data: buses = [] } = useQuery<Bus[]>({
    queryKey: ["/api/buses"],
    // Initial fetch only — live updates come via WebSocket (use-websocket.ts)
  });

  const { data: stops = [] } = useQuery<Stop[]>({
    queryKey: ["/api/stops"],
  });

  const { data: traffic = [] } = useQuery<Traffic[]>({
    queryKey: ["/api/traffic"],
  });

  // ETAs pushed via WebSocket into this cache key
  const { data: allEtas = [] } = useQuery<BusEtaResult[]>({
    queryKey: ["/api/etas"],
    // No queryFn — populated exclusively via WebSocket setQueryData
    enabled: false,
  });

  // Route geometry (road polyline from OSRM, cached in DB)
  const { data: routeGeometry = null } = useQuery<[number, number][] | null>({
    queryKey: ["/api/routes", selectedRoute?.id, "geometry"],
    queryFn: async () => {
      if (!selectedRoute) return null;
      const res = await fetch(`/api/routes/${selectedRoute.id}/geometry`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedRoute,
    staleTime: Infinity,
  });

  const handleBusClick = (bus: Bus) => {
    setSelectedBus(bus);
    const route = routes.find((r) => r.id === bus.routeId);
    if (route) {
      setSelectedRoute(route);
    }
  };

  const handleSelectRoute = (routeId: string | null) => {
    const route = routes.find((r) => r.id === routeId) || null;
    setSelectedRoute(route);
    setSelectedBus(null);
  };

  const selectedBusRoute = selectedBus
    ? routes.find((r) => r.id === selectedBus.routeId)
    : null;

  return (
    <div className="relative h-screen w-full">
      {/* Map */}
      <MapView
        buses={buses}
        routes={routes}
        stops={stops}
        traffic={traffic}
        selectedRoute={selectedRoute}
        onBusClick={handleBusClick}
        showTraffic={showTraffic}
        routeGeometry={routeGeometry}
        flyToLocation={flyToLocation}
      />

      {/* Top Bar Controls */}
      <div className="absolute top-4 left-4 z-[1001] flex items-center gap-3 flex-wrap">
        <LocationSearch
          onSelectLocation={(lat, lon) => setFlyToLocation([lat, lon])}
          onSelectRoute={(routeId) => handleSelectRoute(routeId)}
        />
        <RouteSelector
          routes={routes}
          selectedRoute={selectedRoute}
          onSelectRoute={handleSelectRoute}
        />
        <TrafficToggle
          showTraffic={showTraffic}
          onToggle={() => setShowTraffic(!showTraffic)}
        />
      </div>

      {/* Notification Button — top right */}
      <div className="absolute top-4 right-4 z-[1001]">
        <Button
          size="icon"
          variant="outline"
          onClick={onOpenNotifications}
          className="relative bg-background"
          data-testid="button-open-notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Bus Info Card */}
      {selectedBus && selectedBusRoute && (
        <BusInfoCard
          bus={selectedBus}
          route={selectedBusRoute}
          stops={stops}
          busEtas={allEtas.find((e) => e.busId === selectedBus.id)?.etas ?? []}
          onClose={() => setSelectedBus(null)}
        />
      )}
    </div>
  );
}
