import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { loginMutation, registerMutation } = useAuth();

  // Login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regUserType, setRegUserType] = useState("regular");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { username: loginUsername, password: loginPassword },
      {
        onSuccess: () => {
          setLoginUsername("");
          setLoginPassword("");
          onOpenChange(false);
        },
      },
    );
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(
      {
        name: regName,
        username: regUsername,
        password: regPassword,
        userType: regUserType,
      },
      {
        onSuccess: () => {
          setRegName("");
          setRegUsername("");
          setRegPassword("");
          setRegUserType("regular");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            <span className="text-[#B91C1C] font-extrabold">YATRA</span>
            <span className="font-extrabold">NEPAL</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">Username</Label>
                <Input
                  id="login-username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              {loginMutation.error && (
                <p className="text-sm text-destructive">
                  {(loginMutation.error as Error).message?.includes("401")
                    ? "Invalid username or password"
                    : "Login failed. Please try again."}
                </p>
              )}
              <Button
                type="submit"
                className="w-full bg-[#B91C1C] hover:bg-[#991B1B] text-white"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Login
              </Button>
            </form>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Full Name</Label>
                <Input
                  id="reg-name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-username">Username</Label>
                <Input
                  id="reg-username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  minLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Choose a password"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-usertype">User Type</Label>
                <Select value={regUserType} onValueChange={setRegUserType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="student">Student (45% discount)</SelectItem>
                    <SelectItem value="senior">Senior Citizen (45% discount)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {registerMutation.error && (
                <p className="text-sm text-destructive">
                  {(registerMutation.error as Error).message?.includes("400")
                    ? "Username already taken"
                    : "Registration failed. Please try again."}
                </p>
              )}
              <Button
                type="submit"
                className="w-full bg-[#B91C1C] hover:bg-[#991B1B] text-white"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
