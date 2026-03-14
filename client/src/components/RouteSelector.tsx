import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, X } from "lucide-react";
import type { Route } from "@shared/schema";

interface RouteSelectorProps {
  routes: Route[];
  selectedRoute: Route | null;
  onSelectRoute: (routeId: string | null) => void;
}

export default function RouteSelector({
  routes,
  selectedRoute,
  onSelectRoute,
}: RouteSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredRoutes = useMemo(() => {
    if (!search.trim()) return routes;
    const q = search.toLowerCase();
    return routes.filter((r) => r.name.toLowerCase().includes(q));
  }, [routes, search]);

  const handleSelect = (routeId: string | null) => {
    onSelectRoute(routeId);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-64 justify-between bg-background"
          data-testid="select-route">
          <span className="flex items-center gap-2 truncate">
            {selectedRoute ? (
              <>
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: selectedRoute.color }}
                />
                <span className="truncate">{selectedRoute.name}</span>
              </>
            ) : (
              "All Routes"
            )}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search routes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
              data-testid="input-route-search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-2.5">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          <button
            className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${
              !selectedRoute ? "bg-accent font-medium" : ""
            }`}
            onClick={() => handleSelect(null)}
            data-testid="option-all-routes">
            All Routes
          </button>
          {filteredRoutes.map((route) => (
            <button
              key={route.id}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors flex items-center gap-2 ${
                selectedRoute?.id === route.id ? "bg-accent font-medium" : ""
              }`}
              onClick={() => handleSelect(route.id)}
              data-testid={`option-route-${route.id}`}>
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: route.color }}
              />
              <span className="truncate">{route.name}</span>
            </button>
          ))}
          {filteredRoutes.length === 0 && (
            <div className="px-3 py-6 text-sm text-muted-foreground text-center">
              No routes found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
