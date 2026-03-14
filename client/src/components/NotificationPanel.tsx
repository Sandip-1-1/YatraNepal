import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, X, Info, AlertCircle, CheckCircle, LogIn } from "lucide-react";
import type { Notification, Route, SafeUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface NotificationPanelProps {
  notifications: Notification[];
  routes: Route[];
  onDismiss: (notificationId: string) => void;
  onToggleNotifications: (routeId: string, enabled: boolean) => void;
  notificationSettings: Record<string, boolean>;
  user: SafeUser | null;
  onOpenAuth?: () => void;
}

export default function NotificationPanel({
  notifications,
  routes,
  onDismiss,
  onToggleNotifications,
  notificationSettings,
  user,
  onOpenAuth,
}: NotificationPanelProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "arrival":
        return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
      case "delay":
        return <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
        <Bell className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium mb-1">Log in to receive notifications</p>
        <p className="text-xs text-muted-foreground mb-4">
          Get real-time alerts when buses approach your preferred stops
        </p>
        {onOpenAuth && (
          <Button
            size="sm"
            className="gap-1.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white"
            onClick={onOpenAuth}
          >
            <LogIn className="h-4 w-4" />
            Log in
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Notification Settings */}
      <div className="p-4 border-b bg-muted/30">
        <h4 className="text-sm font-medium mb-3">Route Notifications</h4>
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: route.color }}
                />
                <Label
                  htmlFor={`notify-${route.id}`}
                  className="text-sm cursor-pointer">
                  {route.name}
                </Label>
              </div>
              <Switch
                id={`notify-${route.id}`}
                checked={notificationSettings[route.id] !== false}
                onCheckedChange={(checked) =>
                  onToggleNotifications(route.id, checked)
                }
                data-testid={`switch-notify-${route.id}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Bell className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No notifications yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You'll receive updates when buses approach your stops
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const route = routes.find(
                (r) => r.id === notification.routeId,
              );
              return (
                <div
                  key={notification.id}
                  className={`p-4 ${!notification.isRead ? "bg-accent/30" : ""}`}
                  data-testid={`notification-${notification.id}`}>
                  <div className="flex gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: route?.color + "20",
                            color: route?.color,
                            borderColor: route?.color + "40",
                          }}>
                          {route?.name}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 -mt-1 shrink-0"
                          onClick={() => onDismiss(notification.id)}
                          data-testid={`button-dismiss-${notification.id}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(
                          new Date(notification.createdAt),
                          { addSuffix: true },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
