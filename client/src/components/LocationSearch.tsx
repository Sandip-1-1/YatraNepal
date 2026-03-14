import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, MapPin, Loader2, Bus, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface NearbyRoute {
  route: { id: string; name: string; color: string };
  nearestStop: { name: string };
  distanceKm: number;
  activeBuses: number;
}

interface LocationSearchProps {
  onSelectLocation: (lat: number, lon: number, name: string) => void;
  onSelectRoute: (routeId: string) => void;
}

export default function LocationSearch({ onSelectLocation, onSelectRoute }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [nearbyRoutes, setNearbyRoutes] = useState<NearbyRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        format: "json",
        limit: "5",
        countrycodes: "np",
        addressdetails: "1",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "Accept-Language": "en" } },
      );
      if (res.ok) {
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      }
    } catch {
      // Silently ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNearbyRoutes = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/nearby-routes?lat=${lat}&lon=${lon}&radius=1.5`);
      if (res.ok) {
        const data: NearbyRoute[] = await res.json();
        setNearbyRoutes(data);
      }
    } catch {
      setNearbyRoutes([]);
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setSelectedLocation(null);
    setNearbyRoutes([]);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const shortName = result.display_name.split(",")[0];
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    onSelectLocation(lat, lon, shortName);
    setQuery(shortName);
    setSelectedLocation(shortName);
    setResults([]);
    setOpen(true);
    fetchNearbyRoutes(lat, lon);
  };

  const handleRouteClick = (routeId: string) => {
    onSelectRoute(routeId);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setNearbyRoutes([]);
    setSelectedLocation(null);
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search destination..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => (results.length > 0 || nearbyRoutes.length > 0) && setOpen(true)}
          className="pl-8 pr-8 h-9 bg-background"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {!loading && query && (
          <button onClick={handleClear} className="absolute right-2.5 top-2.5">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-[1100] overflow-hidden max-h-80 overflow-y-auto">
          {/* Location search results */}
          {results.length > 0 && (
            <>
              {results.map((r) => (
                <button
                  key={r.place_id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-start gap-2"
                  onClick={() => handleSelect(r)}>
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              ))}
            </>
          )}

          {/* Nearby routes after location selection */}
          {selectedLocation && nearbyRoutes.length > 0 && (
            <>
              <div className="px-3 py-2 bg-muted/50 border-t">
                <p className="text-xs font-medium text-muted-foreground">
                  <Navigation className="w-3 h-3 inline mr-1" />
                  Routes near {selectedLocation}
                </p>
              </div>
              {nearbyRoutes.map((nr) => (
                <button
                  key={nr.route.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => handleRouteClick(nr.route.id)}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: nr.route.color }}
                    />
                    <span className="font-medium truncate">{nr.route.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-5 text-xs text-muted-foreground">
                    <span>Nearest: {nr.nearestStop.name} ({nr.distanceKm} km)</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Bus className="w-3 h-3 mr-0.5" />
                      {nr.activeBuses}
                    </Badge>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* No nearby routes */}
          {selectedLocation && nearbyRoutes.length === 0 && !loading && (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">
              No routes found near this location
            </div>
          )}
        </div>
      )}
    </div>
  );
}
