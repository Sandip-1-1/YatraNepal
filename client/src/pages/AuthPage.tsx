import { useState } from "react";
import { useLocation } from "wouter";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Bus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  if (user) {
    navigate("/", { replace: true });
    return null;
  }

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
          navigate("/", { replace: true });
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
          navigate("/", { replace: true });
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <a href="/" className="flex items-center gap-1.5 select-none">
          <img src="/favicon.png" alt="" className="h-7 w-7" />
          <span className="text-base font-extrabold tracking-wide">
            <span className="text-[#B91C1C] dark:text-red-500">YATRA</span>
            <span>NEPAL</span>
          </span>
        </a>
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Hero section */}
          <div className="hidden lg:flex flex-col gap-6 px-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-[#B91C1C] text-white flex items-center justify-center">
                <Bus className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  <span className="text-[#B91C1C] dark:text-red-500">YATRA</span>
                  <span>NEPAL</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time transit tracking
                </p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Track buses in real-time across Kathmandu Valley. Get live
              location updates, fare estimates, traffic conditions, and
              personalized route notifications.
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Live bus tracking on interactive map
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Real-time fare estimates with discounts
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                45% discount for students &amp; senior citizens
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                Route notifications &amp; traffic alerts
              </div>
            </div>
          </div>

          {/* Right: Auth form */}
          <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="lg:hidden flex items-center justify-center gap-2 mb-2">
                <img src="/favicon.png" alt="" className="h-8 w-8" />
                <span className="text-xl font-extrabold tracking-wide">
                  <span className="text-[#B91C1C] dark:text-red-500">YATRA</span>
                  <span>NEPAL</span>
                </span>
              </div>
              <CardTitle className="text-xl">Welcome</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Sign Up</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="page-login-username">Username</Label>
                      <Input
                        id="page-login-username"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="Enter username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="page-login-password">Password</Label>
                      <Input
                        id="page-login-password"
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
                      <Label htmlFor="page-reg-name">Full Name</Label>
                      <Input
                        id="page-reg-name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="page-reg-username">Username</Label>
                      <Input
                        id="page-reg-username"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="Choose a username"
                        required
                        minLength={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="page-reg-password">Password</Label>
                      <Input
                        id="page-reg-password"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Choose a password"
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="page-reg-usertype">User Type</Label>
                      <Select value={regUserType} onValueChange={setRegUserType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="student">
                            Student (45% discount)
                          </SelectItem>
                          <SelectItem value="senior">
                            Senior Citizen (45% discount)
                          </SelectItem>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
