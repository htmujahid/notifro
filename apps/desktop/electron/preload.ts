// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

const DEEP_LINK_CHANNEL = 'deep-link';

contextBridge.exposeInMainWorld('desktop', {
  /**
   * Subscribe to `renderical://…` deep links forwarded by the main process.
   * Returns an unsubscribe function.
   */
  onDeepLink: (callback: (url: string) => void) => {
    const listener = (_event: unknown, url: string) => callback(url);
    ipcRenderer.on(DEEP_LINK_CHANNEL, listener);
    return () => ipcRenderer.removeListener(DEEP_LINK_CHANNEL, listener);
  },
});
