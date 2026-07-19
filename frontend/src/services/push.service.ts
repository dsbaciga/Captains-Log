import axios from '../lib/axios';

export interface PushPublicKeyResponse {
  publicKey: string | null;
  configured: boolean;
}

export interface PushSubscribeResult {
  id: number;
  endpoint: string;
}

/**
 * Convert a base64url-encoded VAPID public key into the Uint8Array format
 * required by PushManager.subscribe({ applicationServerKey }).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  // Explicit ArrayBuffer so the result satisfies BufferSource (applicationServerKey)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class PushService {
  /**
   * Get the server's VAPID public key (null when push is not configured)
   */
  async getPublicKey(): Promise<PushPublicKeyResponse> {
    const response = await axios.get<PushPublicKeyResponse>('/push/public-key');
    return response.data;
  }

  /**
   * Register a browser PushSubscription with the backend
   */
  async subscribe(subscription: PushSubscriptionJSON): Promise<PushSubscribeResult> {
    const response = await axios.post<PushSubscribeResult>(
      '/push/subscribe',
      subscription
    );
    return response.data;
  }

  /**
   * Remove a subscription (by endpoint) from the backend
   */
  async unsubscribe(endpoint: string): Promise<{ removed: number }> {
    const response = await axios.delete<{ removed: number }>('/push/subscribe', {
      data: { endpoint },
    });
    return response.data;
  }

  /**
   * Ask the backend to send a test notification to this account
   */
  async sendTest(): Promise<{ sent: number }> {
    const response = await axios.post<{ sent: number }>('/push/test');
    return response.data;
  }
}

export default new PushService();
