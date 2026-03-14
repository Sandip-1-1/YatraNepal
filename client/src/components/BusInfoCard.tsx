import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Clock, Navigation, Bus as BusIcon, Building2 } from "lucide-react";
import type { Bus, Route, Stop } from "@shared/schema";
import type { StopEta } from "@/hooks/use-websocket";

interface BusInfoCardProps {
  bus: Bus;
  route: Route;
  stops: Stop[];
  busEtas: StopEta[];
  onClose: () => void;
}

export default function BusInfoCard({
  bus,
  route,
  stops,
  busEtas,
  onClose,
}: BusInfoCardProps) {
  const routeStops = stops
    .filter((s) => s.routeId === route.id)
    .sort((a, b) => a.sequence - b.sequence);

  const currentStop = routeStops[bus.currentStopIndex];
  const nextStop = routeStops[bus.currentStopIndex + 1];

  // Use server-computed ETA for the next stop (first entry in the etas array)
  const nextStopEta = busEtas.length > 0 ? busEtas[0] : null;
  const etaMinutes = nextStopEta ? nextStopEta.etaMinutes : null;
  const etaDisplay = etaMinutes !== null ? `${etaMinutes} min` : "- min";
  const etaColor =
    etaMinutes !== null && etaMinutes < 5
      ? "text-eta-near"
      : etaMinutes !== null && etaMinutes < 10
        ? "text-eta-medium"
        : "text-eta-far";

  return (
    <Card className="absolute bottom-6 left-6 right-6 md:left-auto md:w-96 p-6 shadow-xl z-[1000] bg-card/95 backdrop-blur-md">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: route.color }}
            />
            <h3 className="text-xl font-semibold">{bus.busNumber}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{route.name}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          data-testid="button-close-bus-info">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Vehicle Type */}
        <div className="flex items-start gap-3">
          <BusIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium">Vehicle Type</div>
            <Badge variant="secondary" className="mt-1 capitalize">
              {bus.vehicleType}
            </Badge>
          </div>
        </div>

        {/* Company */}
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium">Company</div>
            <div className="text-sm text-muted-foreground">{bus.company}</div>
          </div>
        </div>

        {/* Current Location */}
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium">Current Location</div>
            <div className="text-sm text-muted-foreground">
              {currentStop?.name || "In transit"}
            </div>
          </div>
        </div>

        {/* ETA to Next Stop */}
        {nextStop && (
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">Next Stop</div>
              <div className="text-sm text-muted-foreground">
                {nextStop.name}
              </div>
              <div className={`text-lg font-semibold mt-1 ${etaColor}`}>
                {etaDisplay}
              </div>
            </div>
          </div>
        )}

        {/* Speed */}
        <div className="flex items-start gap-3">
          <Navigation className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium">Speed</div>
            <div className="text-sm text-muted-foreground">
              {bus.speed} km/h
            </div>
          </div>
        </div>

        {/* Live Badge */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            LIVE TRACKING
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6">
        <Button
          className="w-full"
          variant="outline"
          onClick={onClose}
          data-testid="button-track-bus">
          Track Bus
        </Button>
      </div>
    </Card>
  );
}
