import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, X, Info, AlertCircle, CheckCircle } from 'lucide-react';
import type { Notification, Route } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  notifications: Notification[];
  routes: Route[];
  onDismiss: (notificationId: string) => void;
  onToggleNotifications: (routeId: string, enabled: boolean) => void;
  notificationSettings: Record<string, boolean>;
}

export default function NotificationPanel({
  notifications,
  routes,
  onDismiss,
  onToggleNotifications,
  notificationSettings,
}: NotificationPanelProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'arrival':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'delay':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Card className="w-full max-w-md p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full h-5 min-w-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

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
                <Label htmlFor={`notify-${route.id}`} className="text-sm cursor-pointer">
                  {route.name}
                </Label>
              </div>
              <Switch
                id={`notify-${route.id}`}
                checked={notificationSettings[route.id] !== false}
                onCheckedChange={(checked) => onToggleNotifications(route.id, checked)}
                data-testid={`switch-notify-${route.id}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-96">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              You'll receive updates about your selected routes
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const route = routes.find(r => r.id === notification.routeId);
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover-elevate ${!notification.isRead ? 'bg-accent/30' : ''}`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: route?.color + '20',
                            color: route?.color,
                            borderColor: route?.color + '40',
                          }}
                        >
                          {route?.name}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 -mt-1"
                          onClick={() => onDismiss(notification.id)}
                          data-testid={`button-dismiss-${notification.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
