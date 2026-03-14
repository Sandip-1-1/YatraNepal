import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import type { SafeUser } from "@shared/schema";

export function useAuth() {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<SafeUser | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/login", data);
      return (await res.json()) as SafeUser;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      username: string;
      password: string;
      userType: string;
    }) => {
      const res = await apiRequest("POST", "/api/register", data);
      return (await res.json()) as SafeUser;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/notifications"], []);
    },
  });

  return {
    user: user ?? null,
    isLoading,
    error,
    loginMutation,
    registerMutation,
    logoutMutation,
  };
}
