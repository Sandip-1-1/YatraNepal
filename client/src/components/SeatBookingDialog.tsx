import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Bus, Route, Stop, User, Booking } from '@shared/schema';
import { format, isSameDay } from 'date-fns';
import { CalendarIcon, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeatBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus: Bus;
  route: Route;
  stops: Stop[];
  user: User | null;
  onConfirmBooking: (booking: {
    seatNumber: number;
    travelDate: Date;
    fromStopId: string;
    toStopId: string;
  }) => void;
}

export default function SeatBookingDialog({
  open,
  onOpenChange,
  bus,
  route,
  stops,
  user,
  onConfirmBooking,
}: SeatBookingDialogProps) {
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [travelDate, setTravelDate] = useState<Date>(new Date());
  const [fromStopId, setFromStopId] = useState<string>('');
  const [toStopId, setToStopId] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(false);

  const routeStops = stops
    .filter(s => s.routeId === route.id)
    .sort((a, b) => a.sequence - b.sequence);

  // Fetch actual bookings for this bus
  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ['/api/bookings/bus', bus.id],
    enabled: open,
  });

  // Calculate booked seats for the selected date and overlapping segments
  const bookedSeats = new Set(
    allBookings
      .filter(booking => {
        // Check if same bus and date (timezone-agnostic comparison)
        const bookingDate = new Date(booking.travelDate).toISOString().split('T')[0];
        const selectedDate = travelDate.toISOString().split('T')[0];
        
        if (booking.busId !== bus.id || bookingDate !== selectedDate) {
          return false;
        }

        // If no stops selected yet, show all booked seats for this date
        if (!fromStopId || !toStopId) {
          return true;
        }

        // Get stop sequences
        const bookingFromStop = stops.find(s => s.id === booking.fromStopId);
        const bookingToStop = stops.find(s => s.id === booking.toStopId);
        const selectedFromStop = stops.find(s => s.id === fromStopId);
        const selectedToStop = stops.find(s => s.id === toStopId);

        if (!bookingFromStop || !bookingToStop || !selectedFromStop || !selectedToStop) {
          return true; // Show as booked if we can't determine
        }

        // Both segments go forward (fromSequence < toSequence)
        // Treat segments as half-open intervals [start, end) where end is exclusive
        // This allows consecutive trips: [A,B) and [B,C) don't conflict
        const bookingStart = bookingFromStop.sequence;
        const bookingEnd = bookingToStop.sequence;
        const selectedStart = selectedFromStop.sequence;
        const selectedEnd = selectedToStop.sequence;

        // Segments overlap if they share occupied stops (half-open intervals)
        return selectedStart < bookingEnd && bookingStart < selectedEnd;
      })
      .map(booking => booking.seatNumber)
  );

  const seats = Array.from({ length: bus.capacity }, (_, i) => i + 1);

  const handleConfirm = () => {
    if (selectedSeat && fromStopId && toStopId) {
      onConfirmBooking({
        seatNumber: selectedSeat,
        travelDate,
        fromStopId,
        toStopId,
      });
      onOpenChange(false);
      setSelectedSeat(null);
      setFromStopId('');
      setToStopId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: route.color }}
            />
            Book Seat - {bus.busNumber}
          </DialogTitle>
          <DialogDescription>
            {route.name} • {bus.capacity - bus.occupiedSeats} seats available
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Travel Date</Label>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
              onClick={() => setShowCalendar(!showCalendar)}
              data-testid="button-select-date"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {travelDate ? format(travelDate, 'PPP') : <span>Pick a date</span>}
            </Button>
            {showCalendar && (
              <Calendar
                mode="single"
                selected={travelDate}
                onSelect={(date) => {
                  if (date) {
                    setTravelDate(date);
                    setShowCalendar(false);
                  }
                }}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
                data-testid="calendar-travel-date"
              />
            )}
          </div>

          {/* From/To Stops */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={fromStopId} onValueChange={setFromStopId}>
                <SelectTrigger data-testid="select-from-stop">
                  <SelectValue placeholder="Select stop" />
                </SelectTrigger>
                <SelectContent>
                  {routeStops.map((stop) => (
                    <SelectItem key={stop.id} value={stop.id} data-testid={`option-from-${stop.id}`}>
                      {stop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={toStopId} onValueChange={setToStopId}>
                <SelectTrigger data-testid="select-to-stop">
                  <SelectValue placeholder="Select stop" />
                </SelectTrigger>
                <SelectContent>
                  {routeStops.map((stop) => {
                    const fromStop = routeStops.find(s => s.id === fromStopId);
                    const isInvalid = fromStop && stop.sequence <= fromStop.sequence;
                    return (
                      <SelectItem 
                        key={stop.id} 
                        value={stop.id}
                        disabled={isInvalid}
                        data-testid={`option-to-${stop.id}`}
                      >
                        {stop.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seat Selection */}
          <div className="space-y-3">
            <Label>Select Your Seat</Label>
            <div className="grid grid-cols-5 gap-3">
              {seats.map((seatNum) => {
                const isBooked = bookedSeats.has(seatNum);
                const isSelected = selectedSeat === seatNum;

                return (
                  <button
                    key={seatNum}
                    onClick={() => !isBooked && setSelectedSeat(seatNum)}
                    disabled={isBooked}
                    className={cn(
                      'h-12 rounded-md border-2 font-medium transition-all',
                      'hover-elevate active-elevate-2',
                      isBooked && 'bg-muted text-muted-foreground cursor-not-allowed opacity-50',
                      !isBooked && !isSelected && 'border-border bg-background',
                      isSelected && 'border-primary bg-primary text-primary-foreground'
                    )}
                    data-testid={`seat-${seatNum}`}
                  >
                    {seatNum}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-border bg-background" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                <span>Selected</span>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          {selectedSeat && fromStopId && toStopId && (
            <div className="p-4 rounded-lg bg-accent/50 space-y-2">
              <h4 className="font-semibold text-sm">Booking Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Seat:</div>
                <div className="font-medium">#{selectedSeat}</div>
                <div className="text-muted-foreground">Date:</div>
                <div className="font-medium">{format(travelDate, 'PP')}</div>
                <div className="text-muted-foreground">Route:</div>
                <div className="font-medium">{route.name}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-booking"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSeat || !fromStopId || !toStopId || !user}
            data-testid="button-confirm-booking"
          >
            Confirm Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
