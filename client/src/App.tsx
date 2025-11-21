import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MapPage from "@/pages/MapPage";
import BookingsPage from "@/pages/BookingsPage";
import NotificationPanel from "@/components/NotificationPanel";
import { Button } from "@/components/ui/button";
import { Map, Ticket, X } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Notification, Route as RouteType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MainApp} />
      <Route path="/bookings" component={BookingsPageWrapper} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainApp() {
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: routes = [] } = useQuery<RouteType[]>({
    queryKey: ['/api/routes'],
  });

  const dismissNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest('DELETE', `/api/notifications/${notificationId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const toggleNotificationsMutation = useMutation({
    mutationFn: async ({ routeId, enabled }: { routeId: string; enabled: boolean }) => {
      return await apiRequest('POST', '/api/notifications/settings', { routeId, enabled });
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mock notification settings (would come from user preferences)
  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({});

  const handleToggleNotifications = (routeId: string, enabled: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [routeId]: enabled }));
    toggleNotificationsMutation.mutate({ routeId, enabled });
  };

  return (
    <>
      <MapPage
        onOpenNotifications={() => setNotificationsPanelOpen(true)}
        unreadCount={unreadCount}
      />

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-[1001] md:hidden bg-background border-t">
        <div className="flex items-center justify-around p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto gap-1 flex-1"
            asChild
            data-testid="nav-map"
          >
            <a href="/">
              <Map className="w-5 h-5" />
              <span className="text-xs">Map</span>
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto gap-1 flex-1"
            asChild
            data-testid="nav-bookings"
          >
            <a href="/bookings">
              <Ticket className="w-5 h-5" />
              <span className="text-xs">Bookings</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:block fixed bottom-6 right-6 z-[1001]">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          asChild
          data-testid="button-view-bookings"
        >
          <a href="/bookings">
            <Ticket className="w-5 h-5 mr-2" />
            View Bookings
          </a>
        </Button>
      </div>

      {/* Notifications Panel */}
      <Sheet open={notificationsPanelOpen} onOpenChange={setNotificationsPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <NotificationPanel
                notifications={notifications}
                routes={routes}
                onDismiss={(id) => dismissNotificationMutation.mutate(id)}
                onToggleNotifications={handleToggleNotifications}
                notificationSettings={notificationSettings}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function BookingsPageWrapper() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            data-testid="button-back-to-map"
          >
            <a href="/" className="gap-2">
              <Map className="w-4 h-4" />
              <span>Back to Map</span>
            </a>
          </Button>
        </div>
      </header>

      <BookingsPage />

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t">
        <div className="flex items-center justify-around p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto gap-1 flex-1"
            asChild
            data-testid="nav-map"
          >
            <a href="/">
              <Map className="w-5 h-5" />
              <span className="text-xs">Map</span>
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto gap-1 flex-1 bg-accent"
            asChild
            data-testid="nav-bookings"
          >
            <a href="/bookings">
              <Ticket className="w-5 h-5" />
              <span className="text-xs">Bookings</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
