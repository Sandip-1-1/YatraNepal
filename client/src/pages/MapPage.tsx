import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import MapView from '@/components/MapView';
import BusInfoCard from '@/components/BusInfoCard';
import RouteSelector from '@/components/RouteSelector';
import SeatBookingDialog from '@/components/SeatBookingDialog';
import TrafficToggle from '@/components/TrafficToggle';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import type { Bus, Route, Stop, Traffic, User } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function MapPage({
  onOpenNotifications,
  unreadCount,
}: {
  onOpenNotifications: () => void;
  unreadCount: number;
}) {
  const { toast } = useToast();
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  // Fetch data
  const { data: routes = [] } = useQuery<Route[]>({
    queryKey: ['/api/routes'],
  });

  const { data: buses = [] } = useQuery<Bus[]>({
    queryKey: ['/api/buses'],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time tracking
  });

  const { data: stops = [] } = useQuery<Stop[]>({
    queryKey: ['/api/stops'],
  });

  const { data: traffic = [] } = useQuery<Traffic[]>({
    queryKey: ['/api/traffic'],
  });

  const { data: user = null } = useQuery<User | null>({
    queryKey: ['/api/user/current'],
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return await apiRequest('POST', '/api/bookings', {
        ...bookingData,
        userId: user?.id,
        busId: selectedBus?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buses'] });
      // Invalidate all bus booking queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/bus'] });
      toast({
        title: 'Booking Confirmed!',
        description: 'Your seat has been successfully booked.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Unable to book seat. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleBusClick = (bus: Bus) => {
    setSelectedBus(bus);
    const route = routes.find(r => r.id === bus.routeId);
    if (route) {
      setSelectedRoute(route);
    }
  };

  const handleSelectRoute = (routeId: string | null) => {
    const route = routes.find(r => r.id === routeId) || null;
    setSelectedRoute(route);
    setSelectedBus(null);
  };

  const handleBookSeat = () => {
    setBookingDialogOpen(true);
  };

  const handleConfirmBooking = (bookingData: any) => {
    if (!user || !selectedBus) {
      toast({
        title: 'Error',
        description: 'Unable to process booking. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    createBookingMutation.mutate(bookingData);
  };

  const selectedBusRoute = selectedBus
    ? routes.find(r => r.id === selectedBus.routeId)
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
      />

      {/* Top Bar Controls */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex items-center gap-3 flex-wrap">
        <RouteSelector
          routes={routes}
          selectedRoute={selectedRoute}
          onSelectRoute={handleSelectRoute}
        />
        <TrafficToggle showTraffic={showTraffic} onToggle={() => setShowTraffic(!showTraffic)} />
        <div className="ml-auto">
          <Button
            size="icon"
            variant="outline"
            onClick={onOpenNotifications}
            className="relative bg-background"
            data-testid="button-open-notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Bus Info Card */}
      {selectedBus && selectedBusRoute && (
        <BusInfoCard
          bus={selectedBus}
          route={selectedBusRoute}
          stops={stops}
          onClose={() => setSelectedBus(null)}
          onBookSeat={handleBookSeat}
        />
      )}

      {/* Booking Dialog */}
      {selectedBus && selectedBusRoute && (
        <SeatBookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          bus={selectedBus}
          route={selectedBusRoute}
          stops={stops}
          user={user}
          onConfirmBooking={handleConfirmBooking}
        />
      )}
    </div>
  );
}
