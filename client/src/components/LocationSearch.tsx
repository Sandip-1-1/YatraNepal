import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, MapPin, Loader2 } from "lucide-react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface LocationSearchProps {
  onSelectLocation: (lat: number, lon: number, name: string) => void;
}

export default function LocationSearch({ onSelectLocation }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
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

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const shortName = result.display_name.split(",")[0];
    onSelectLocation(parseFloat(result.lat), parseFloat(result.lon), shortName);
    setQuery(shortName);
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
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
          placeholder="Search location..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
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
        <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-[1100] overflow-hidden">
          {results.map((r) => (
            <button
              key={r.place_id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-start gap-2"
              onClick={() => handleSelect(r)}>
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
