// Types for the bridge exposed by electron/preload.ts via contextBridge.
export {};

declare global {
  interface DesktopBridge {
    /** Subscribe to forwarded deep links; returns an unsubscribe function. */
    onDeepLink(callback: (url: string) => void): () => void;
  }

  interface Window {
    desktop?: DesktopBridge;
  }
}
