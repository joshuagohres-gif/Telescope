import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SystemStatus } from "@shared/schema";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const connect = () => {
      // Reference: javascript_websocket blueprint
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log("[Telescope WS] Attempting to connect to:", wsUrl);

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log("[Telescope WS] Connected successfully");
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === "status" && message.data) {
              const status: SystemStatus = message.data;
              
              // Update the status cache
              queryClient.setQueryData(["/api/telescope/status"], status);
              console.log("[Telescope WS] Status update received");
            }
          } catch (error) {
            console.error("[Telescope WS] Message parse error:", error);
          }
        };

        socket.onerror = (error) => {
          console.error("[Telescope WS] Error:", error);
        };

        socket.onclose = (event) => {
          console.log("[Telescope WS] Disconnected. Code:", event.code, "Reason:", event.reason);
          wsRef.current = null;

          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[Telescope WS] Reconnecting...");
            connect();
          }, 3000);
        };
      } catch (error) {
        console.error("[Telescope WS] Failed to create WebSocket:", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [queryClient]);

  return wsRef.current;
}
