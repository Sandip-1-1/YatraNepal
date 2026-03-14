import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MapView from "@/components/MapView";
import BusInfoCard from "@/components/BusInfoCard";
import RouteSelector from "@/components/RouteSelector";
import TrafficToggle from "@/components/TrafficToggle";
import LocationSearch from "@/components/LocationSearch";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { Bus, Route, Stop, Traffic, RouteHistory } from "@shared/schema";
import type { BusEtaResult } from "@/hooks/use-websocket";

export default function MapPage() {
  const { user } = useAuth();
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
    enabled: false,
  });

  // Frequent routes for logged-in users
  const { data: frequentRoutes = [] } = useQuery<RouteHistory[]>({
    queryKey: ["/api/frequent-routes"],
    enabled: !!user,
  });

  const frequentRouteIds = frequentRoutes.map((rh) => rh.routeId);

  // Track route views
  const trackRouteViewMutation = useMutation({
    mutationFn: async (routeId: string) => {
      await apiRequest("POST", `/api/route-history/${routeId}`);
    },
  });

  // Set preferred route for notifications
  const setPreferredRouteMutation = useMutation({
    mutationFn: async (routeId: string | null) => {
      if (routeId) {
        await apiRequest("POST", `/api/preferred-route/${routeId}`);
      } else {
        await apiRequest("DELETE", "/api/preferred-route");
      }
    },
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
    if (user && routeId) {
      trackRouteViewMutation.mutate(routeId);
      setPreferredRouteMutation.mutate(routeId);
    } else if (user && !routeId) {
      setPreferredRouteMutation.mutate(null);
    }
  };

  const selectedBusRoute = selectedBus
    ? routes.find((r) => r.id === selectedBus.routeId)
    : null;

  return (
    <div className="relative h-screen w-full pt-14 pb-14 sm:pb-0">
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

      {/* Top Bar Controls — below header */}
      <div className="absolute top-[calc(3.5rem+0.75rem)] left-3 z-[1001] flex items-center gap-2 flex-wrap max-w-[calc(100%-1.5rem)]">
        <LocationSearch
          onSelectLocation={(lat, lon) => setFlyToLocation([lat, lon])}
          onSelectRoute={(routeId) => handleSelectRoute(routeId)}
        />
        <RouteSelector
          routes={routes}
          selectedRoute={selectedRoute}
          onSelectRoute={handleSelectRoute}
          frequentRouteIds={frequentRouteIds}
        />
        <TrafficToggle
          showTraffic={showTraffic}
          onToggle={() => setShowTraffic(!showTraffic)}
        />
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
