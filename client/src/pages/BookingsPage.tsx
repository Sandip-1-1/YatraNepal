import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, MapPin, Ticket, Bus as BusIcon } from 'lucide-react';
import type { Booking, Bus, Route, Stop } from '@shared/schema';
import { format } from 'date-fns';

export default function BookingsPage() {
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings'],
  });

  const { data: buses = [] } = useQuery<Bus[]>({
    queryKey: ['/api/buses'],
  });

  const { data: routes = [] } = useQuery<Route[]>({
    queryKey: ['/api/routes'],
  });

  const { data: stops = [] } = useQuery<Stop[]>({
    queryKey: ['/api/stops'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading bookings...</div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Ticket className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          You haven't made any seat bookings. Start by selecting a bus from the map view.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">My Bookings</h1>
        <p className="text-muted-foreground">
          View and manage your bus seat reservations
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4">
          {bookings.map((booking) => {
            const bus = buses.find(b => b.id === booking.busId);
            const route = routes.find(r => r.id === bus?.routeId);
            const fromStop = stops.find(s => s.id === booking.fromStopId);
            const toStop = stops.find(s => s.id === booking.toStopId);

            return (
              <Card key={booking.id} data-testid={`booking-${booking.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: route?.color || '#2563eb' }}
                      />
                      <div>
                        <CardTitle className="text-lg">{bus?.busNumber}</CardTitle>
                        <CardDescription>{route?.name}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                      data-testid={`badge-status-${booking.id}`}
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Ticket className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Seat Number</div>
                        <div className="text-2xl font-bold text-primary">
                          #{booking.seatNumber}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Travel Date</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(booking.travelDate), 'PPP')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{fromStop?.name}</div>
                      <div className="text-xs text-muted-foreground">to</div>
                      <div className="text-sm font-medium">{toStop?.name}</div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Booked {format(new Date(booking.createdAt), 'PPp')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
