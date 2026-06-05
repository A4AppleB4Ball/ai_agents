/**
 * Hook to construct an authenticated WebSocket URL.
 * Fetches the auth token from /api/auth/token and appends it as a query parameter.
 */

import { useCallback, useEffect, useState } from "react";

export function useAuthWsUrl(baseUrl?: string): string | null {
  const wsBase = baseUrl || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8010/agent/v1/chat/ws";
  const [authenticatedUrl, setAuthenticatedUrl] = useState<string | null>(null);

  const buildUrl = useCallback(async () => {
    const response = await fetch("/api/auth/token");
    if (!response.ok) {
      window.location.href = "/login";
      return;
    }
    const { token } = await response.json();
    const separator = wsBase.includes("?") ? "&" : "?";
    setAuthenticatedUrl(`${wsBase}${separator}token=${token}`);
  }, [wsBase]);

  useEffect(() => {
    buildUrl();
  }, [buildUrl]);

  return authenticatedUrl;
}
