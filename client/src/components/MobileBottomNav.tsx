import { Map, Bell, User, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface MobileBottomNavProps {
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  unreadCount: number;
}

export default function MobileBottomNav({
  onOpenNotifications,
  onOpenAuth,
  unreadCount,
}: MobileBottomNavProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1002] h-14 bg-background/95 backdrop-blur-md border-t flex items-center justify-around sm:hidden">
      {/* Map tab (always active since we only have one page) */}
      <button className="flex flex-col items-center gap-0.5 text-[#B91C1C] dark:text-red-500">
        <Map className="h-5 w-5" />
        <span className="text-[10px] font-medium">Map</span>
      </button>

      {/* Notifications */}
      <button
        className="flex flex-col items-center gap-0.5 text-muted-foreground relative"
        onClick={onOpenNotifications}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 left-1/2 h-4 min-w-4 px-1 text-[9px] bg-[#B91C1C] text-white border-0 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
        <span className="text-[10px] font-medium">Alerts</span>
      </button>

      {/* Profile / Login */}
      {user ? (
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground">
          <div className="h-5 w-5 rounded-full bg-[#B91C1C] text-white flex items-center justify-center text-[9px] font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] font-medium truncate max-w-12">
            {user.name.split(" ")[0]}
          </span>
        </button>
      ) : (
        <button
          className="flex flex-col items-center gap-0.5 text-muted-foreground"
          onClick={() => navigate("/auth")}
        >
          <LogIn className="h-5 w-5" />
          <span className="text-[10px] font-medium">Login</span>
        </button>
      )}
    </nav>
  );
}
