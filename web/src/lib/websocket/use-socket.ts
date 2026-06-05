/**
 * useWebSocket Hook
 *
 * Use WebSocket in React components
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient } from './socket-client';
import { WebSocketConfig, WebSocketState, WebSocketMessage } from './types';

export interface UseWebSocketOptions extends Omit<WebSocketConfig, 'protocols'> {
  onMessage?: (message: any) => void;
  onError?: (error: Event) => void;
  onStateChange?: (state: WebSocketState) => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const [state, setState] = useState<WebSocketState>('disconnected');
  const [error, setError] = useState<Event | null>(null);
  const clientRef = useRef<WebSocketClient | null>(null);

  // Use useCallback to stabilize callback functions
  const onMessageCallback = useCallback((msg: any) => {
    options.onMessage?.(msg);
  }, [options.onMessage]);

  const onErrorCallback = useCallback((err: Event) => {
    setError(err);
    options.onError?.(err);
  }, [options.onError]);

  const onStateChangeCallback = useCallback((newState: WebSocketState) => {
    setState(newState);
    options.onStateChange?.(newState);
  }, [options.onStateChange]);

  useEffect(() => {
    // Skip connection when URL is empty (e.g. waiting for auth token)
    if (!options.url) {
      return;
    }

    // Create WebSocket client
    const client = new WebSocketClient({
      url: options.url,
      reconnect: options.reconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectDelay: options.maxReconnectDelay ?? 30000,
      heartbeatInterval: options.heartbeatInterval ?? 30000, // Support external heartbeat interval configuration
    }, {
      onMessage: onMessageCallback,
      onError: onErrorCallback,
      onStateChange: onStateChangeCallback,
    });

    clientRef.current = client;

    // Auto connect
    if (options.autoConnect !== false) {
      client.connect();
    }

    // Cleanup
    return () => {
      console.debug('[useWebSocket] Cleaning up WebSocket client');
      client.disconnect();
    };
  }, [options.url]); // Only depend on URL, avoid repeated creation

  const send = useCallback((data: WebSocketMessage) => {
    clientRef.current?.send(data);
  }, []);

  const connect = useCallback(() => {
    clientRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  return {
    state,
    error,
    send,
    connect,
    disconnect,
  };
}
