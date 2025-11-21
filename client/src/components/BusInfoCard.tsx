import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Clock, Users, Navigation } from 'lucide-react';
import type { Bus, Route, Stop } from '@shared/schema';

interface BusInfoCardProps {
  bus: Bus;
  route: Route;
  stops: Stop[];
  onClose: () => void;
  onBookSeat: () => void;
}

export default function BusInfoCard({ bus, route, stops, onClose, onBookSeat }: BusInfoCardProps) {
  const routeStops = stops
    .filter(s => s.routeId === route.id)
    .sort((a, b) => a.sequence - b.sequence);

  const currentStop = routeStops[bus.currentStopIndex];
  const nextStop = routeStops[bus.currentStopIndex + 1];

  // Calculate simple ETA (mock calculation based on distance and speed)
  const calculateETA = () => {
    if (!nextStop || bus.speed === 0) return '- min';
    
    // Simple calculation: assume 2-5 minutes between stops
    const baseMinutes = 3;
    const variation = Math.floor(Math.random() * 3);
    return `${baseMinutes + variation} min`;
  };

  const eta = calculateETA();
  const etaMinutes = parseInt(eta);
  const etaColor = etaMinutes < 5 ? 'text-eta-near' : etaMinutes < 10 ? 'text-eta-medium' : 'text-eta-far';

  const availableSeats = bus.capacity - bus.occupiedSeats;
  const occupancyPercent = (bus.occupiedSeats / bus.capacity) * 100;

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
          data-testid="button-close-bus-info"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Current Location */}
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium">Current Location</div>
            <div className="text-sm text-muted-foreground">
              {currentStop?.name || 'In transit'}
            </div>
          </div>
        </div>

        {/* ETA to Next Stop */}
        {nextStop && (
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">Next Stop</div>
              <div className="text-sm text-muted-foreground">{nextStop.name}</div>
              <div className={`text-lg font-semibold mt-1 ${etaColor}`}>
                {eta}
              </div>
            </div>
          </div>
        )}

        {/* Speed */}
        <div className="flex items-start gap-3">
          <Navigation className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium">Speed</div>
            <div className="text-sm text-muted-foreground">{bus.speed} km/h</div>
          </div>
        </div>

        {/* Seat Availability */}
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium mb-2">Seat Availability</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
              <span className="text-sm font-medium whitespace-nowrap">
                {availableSeats}/{bus.capacity}
              </span>
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
      <div className="mt-6 flex gap-2">
        <Button
          className="flex-1"
          variant="outline"
          onClick={onClose}
          data-testid="button-track-bus"
        >
          Track Bus
        </Button>
        <Button
          className="flex-1"
          onClick={onBookSeat}
          disabled={availableSeats === 0}
          data-testid="button-book-seat"
        >
          {availableSeats === 0 ? 'Full' : 'Book Seat'}
        </Button>
      </div>
    </Card>
  );
}
