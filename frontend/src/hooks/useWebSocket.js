/**
 * useWebSocket Hook — Handle WebSocket connections
 */

import { useEffect, useCallback } from "react";
import { WS_URL } from "../utils/constants";

export const useWebSocket = (onMessage) => {
  const connect = useCallback(() => {
    if (!localStorage.getItem("token")) return null;

    const ws = new WebSocket(`${WS_URL}/notifications/`);

    ws.onopen = () => console.log("✅ WebSocket connected");
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      onMessage && onMessage(data);
    };
    ws.onerror = (err) => console.error("❌ WebSocket error:", err);
    ws.onclose = () => console.log("🔴 WebSocket closed");

    return ws;
  }, [onMessage]);

  return { connect };
};
