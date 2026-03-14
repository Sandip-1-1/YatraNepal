import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import MapPage from "@/pages/MapPage";
import NotificationPanel from "@/components/NotificationPanel";
import Header from "@/components/Header";
import MobileBottomNav from "@/components/MobileBottomNav";
import AuthDialog from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Notification, Route as RouteType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
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
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainApp() {
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // WebSocket pushes bus_update and notification data into the query cache
  useWebSocket();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
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

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/notifications/mark-all-read");
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

  const [notificationSettings, setNotificationSettings] = useState<
    Record<string, boolean>
  >({});

  const handleToggleNotifications = (routeId: string, enabled: boolean) => {
    setNotificationSettings((prev) => ({ ...prev, [routeId]: enabled }));
    toggleNotificationsMutation.mutate({ routeId, enabled });
  };

  return (
    <>
      <Header
        onOpenNotifications={() => setNotificationsPanelOpen(true)}
        onOpenAuth={() => navigate("/auth")}
        unreadCount={unreadCount}
      />

      <MapPage />

      <MobileBottomNav
        onOpenNotifications={() => setNotificationsPanelOpen(true)}
        onOpenAuth={() => navigate("/auth")}
        unreadCount={unreadCount}
      />

      {/* Auth Dialog */}
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />

      {/* Notifications Panel */}
      <Sheet
        open={notificationsPanelOpen}
        onOpenChange={setNotificationsPanelOpen}
      >
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle>Notifications</SheetTitle>
                {user && unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </Button>
                )}
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <NotificationPanel
                notifications={notifications}
                routes={routes}
                onDismiss={(id) => dismissNotificationMutation.mutate(id)}
                onToggleNotifications={handleToggleNotifications}
                notificationSettings={notificationSettings}
                user={user}
                onOpenAuth={() => {
                  setNotificationsPanelOpen(false);
                  navigate("/auth");
                }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function App() {
  useEffect(() => {
    // Hide loading screen once React has mounted
    const loader = document.getElementById("loading-screen");
    if (loader) {
      loader.classList.add("ls-hidden");
      setTimeout(() => loader.remove(), 500);
    }
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
