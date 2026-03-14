import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MapPage from "@/pages/MapPage";
import NotificationPanel from "@/components/NotificationPanel";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Notification, Route as RouteType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function MainApp() {
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);

  // WebSocket pushes bus_update and notification data into the query cache
  useWebSocket();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    // Initial fetch only — live updates come via WebSocket
  });

  const { data: routes = [] } = useQuery<RouteType[]>({
    queryKey: ["/api/routes"],
  });

  const dismissNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest(
        "DELETE",
        `/api/notifications/${notificationId}`,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const toggleNotificationsMutation = useMutation({
    mutationFn: async ({
      routeId,
      enabled,
    }: {
      routeId: string;
      enabled: boolean;
    }) => {
      return await apiRequest("POST", "/api/notifications/settings", {
        routeId,
        enabled,
      });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Mock notification settings (would come from user preferences)
  const [notificationSettings, setNotificationSettings] = useState<
    Record<string, boolean>
  >({});

  const handleToggleNotifications = (routeId: string, enabled: boolean) => {
    setNotificationSettings((prev) => ({ ...prev, [routeId]: enabled }));
    toggleNotificationsMutation.mutate({ routeId, enabled });
  };

  return (
    <>
      <MapPage
        onOpenNotifications={() => setNotificationsPanelOpen(true)}
        unreadCount={unreadCount}
      />

      {/* Notifications Panel */}
      <Sheet
        open={notificationsPanelOpen}
        onOpenChange={setNotificationsPanelOpen}>
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
