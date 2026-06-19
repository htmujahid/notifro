export {};

declare global {
  interface DesktopBridge {
    onDeepLink(callback: (url: string) => void): () => void;
  }

  interface Window {
    desktop?: DesktopBridge;
  }
}
