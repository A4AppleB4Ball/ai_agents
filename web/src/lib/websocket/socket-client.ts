/**
 * Core WebSocket client class
 */

import { WebSocketClientCallbacks, WebSocketConfig, WebSocketMessage, WebSocketState } from './types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private callbacks: WebSocketClientCallbacks;
  private state: WebSocketState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private lastPongTime: number = 0;

  private readonly DEFAULT_CONFIG: Required<WebSocketConfig> = {
    url: '',
    protocols: [],
    reconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    heartbeatInterval: 30000,
    heartbeatTimeout: 10000,
  };

  constructor(config: WebSocketConfig, callbacks: WebSocketClientCallbacks = {}) {
    this.config = {...this.DEFAULT_CONFIG, ...config};
    this.callbacks = callbacks;
  }

  /**
   * Connect WebSocket
   */
  public connect(): void {
    if (this.state === 'connecting' || this.state === 'connected') {
      console.warn('[WebSocketClient] Already connecting or connected');
      return;
    }

    this.setState('connecting');
    this.createConnection();
  }

  /**
   * Disconnect
   */
  public disconnect(): void {
    this.config.reconnect = false; // Disable auto reconnect
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.setState('disconnected');
  }

  /**
   * Send message
   */
  public send(data: WebSocketMessage): void {
    if (this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('[WebSocketClient] Send error:', error);
        // Message send failed, add to queue
        this.messageQueue.push(data);
      }
    } else {
      // Not connected, add to queue
      this.messageQueue.push(data);
      console.warn('[WebSocketClient] Message queued, not connected');
    }
  }

  /**
   * Get current state
   */
  public getState(): WebSocketState {
    return this.state;
  }

  /**
   * Create WebSocket connection
   */
  private createConnection(): void {
    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);

      this.ws.onopen = (event) => this.handleOpen(event);
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (event) => this.handleError(event);
      this.ws.onclose = (event) => this.handleClose(event);
    } catch (error) {
      console.error('[WebSocketClient] Connection error:', error);
      this.handleConnectionFailure();
    }
  }

  /**
   * Handle connection open
   */
  private handleOpen(event: Event): void {
    console.debug('[WebSocketClient] Connected');
    this.setState('connected');
    this.reconnectAttempts = 0;

    // Start heartbeat
    this.startHeartbeat();

    // Send queued messages
    this.flushMessageQueue();

    // Callback
    this.callbacks.onOpen?.(event);
    if (this.reconnectAttempts > 0) {
      this.callbacks.onReconnected?.();
    }
  }

  /**
   * Handle message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // Handle pong response
      if (data.event_type === 'pong') {
        this.lastPongTime = Date.now();
        this.resetHeartbeatTimeout();
        return;
      }

      this.callbacks.onMessage?.(data);
    } catch (error) {
      console.error('[WebSocketClient] Message parse error:', error);
    }
  }

  /**
   * Handle connection error
   */
  private handleError(event: Event): void {
    console.error('[WebSocketClient] WebSocket error:', event);
    this.callbacks.onError?.(event);
  }

  /**
   * Handle connection close
   */
  private handleClose(event: CloseEvent): void {
    console.debug('[WebSocketClient] Disconnected:', event.code, event.reason);

    this.cleanup();
    this.callbacks.onClose?.(event);

    // Determine if reconnect is needed
    if (this.config.reconnect && !event.wasClean && event.code !== 1000) {
      this.attemptReconnect();
    } else {
      this.setState('disconnected');
    }
  }


  /**
   * Attempt reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocketClient] Max reconnect attempts reached');
      this.setState('failed');
      this.callbacks.onMaxRetriesReached?.();
      return;
    }

    this.reconnectAttempts++;
    this.setState('reconnecting');
    this.callbacks.onReconnecting?.(this.reconnectAttempts);

    // Exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    console.debug(`[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.createConnection();
    }, delay);
  }

  /**
   * Connection failure handler
   */
  private handleConnectionFailure(): void {
    if (this.config.reconnect) {
      this.attemptReconnect();
    } else {
      this.setState('failed');
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    // If heartbeatInterval is 0, disable heartbeat
    if (this.config.heartbeatInterval === 0) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.state === 'connected') {
        this.send({type: 'ping'});

        // Start heartbeat timeout detection
        this.heartbeatTimeoutTimer = setTimeout(() => {
          console.warn('[WebSocketClient] Heartbeat timeout, reconnecting...');
          this.ws?.close(4000, 'Heartbeat timeout');
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /**
   * Reset heartbeat timeout
   */
  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /**
   * Send queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
  }

  /**
   * Set state
   */
  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      console.debug(`[WebSocketClient] State: ${this.state} -> ${newState}`);
      this.state = newState;
      this.callbacks.onStateChange?.(newState);
    }
  }
}
