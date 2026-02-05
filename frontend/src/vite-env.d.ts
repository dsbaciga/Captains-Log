/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

// Extend Window interface for PWA-related globals
interface Window {
  workbox?: import('workbox-window').Workbox;
}
