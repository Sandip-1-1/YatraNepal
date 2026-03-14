import { useEffect, useRef, useCallback } from "react";
import type { Bus, Notification } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export interface StopEta {
  stopId: string;
  stopName: string;
  etaMinutes: number;
}
export interface BusEtaResult {
  busId: string;
  etas: StopEta[];
}

type WSMessage =
  | { type: "bus_update"; data: Bus[] }
  | { type: "notification"; data: Notification }
  | { type: "eta_update"; data: BusEtaResult[] };

/**
 * Connects to the server WebSocket, pushes bus_update, eta_update, and
 * notification messages directly into the React Query cache, and
 * auto-reconnects with exponential backoff.
 */
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (unmounted.current) return;

    // Build ws:// or wss:// URL from current page origin
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "bus_update":
            queryClient.setQueryData<Bus[]>(["/api/buses"], msg.data);
            break;

          case "eta_update":
            // Store all ETAs keyed by "/api/etas" for easy lookup
            queryClient.setQueryData<BusEtaResult[]>(["/api/etas"], msg.data);
            break;

          case "notification":
            queryClient.setQueryData<Notification[]>(
              ["/api/notifications"],
              (old = []) => [msg.data, ...old],
            );
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (unmounted.current) return;
      const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30_000);
      reconnectAttempt.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    unmounted.current = false;
    connect();

    return () => {
      unmounted.current = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);
}
