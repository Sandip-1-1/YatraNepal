import { Bell, LogIn, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  unreadCount: number;
}

export default function Header({
  onOpenNotifications,
  onOpenAuth,
  unreadCount,
}: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const userTypeLabel =
    user?.userType === "student"
      ? "Student"
      : user?.userType === "senior"
        ? "Senior"
        : "Regular";

  return (
    <header className="fixed top-0 left-0 right-0 z-[1002] h-14 bg-background/90 backdrop-blur-md border-b flex items-center px-3 gap-2">
      {/* Logo */}
      <div className="flex items-center gap-1.5 mr-auto select-none">
        <img src="/favicon.png" alt="" className="h-7 w-7" />
        <span className="text-base font-extrabold tracking-wide hidden sm:inline">
          <span className="text-[#B91C1C] dark:text-red-500">YATRA</span>
          <span>NEPAL</span>
        </span>
      </div>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Notification bell */}
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full"
        onClick={onOpenNotifications}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] bg-[#B91C1C] text-white border-0 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Auth area */}
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full px-2"
            >
              <div className="h-7 w-7 rounded-full bg-[#B91C1C] text-white flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-sm font-medium max-w-24 truncate">
                {user.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
              <Badge
                variant="secondary"
                className="mt-1 text-[10px] h-5"
              >
                {userTypeLabel}
                {(user.userType === "student" || user.userType === "senior") &&
                  " - 45% off"}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logoutMutation.mutate()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={() => navigate("/auth")}
          className="gap-1.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-full px-4"
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Login</span>
        </Button>
      )}
    </header>
  );
}
