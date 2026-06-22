import { contextBridge, ipcRenderer } from "electron"

const DEEP_LINK_CHANNEL = "deep-link"

contextBridge.exposeInMainWorld("desktop", {
  onDeepLink: (callback: (url: string) => void) => {
    const listener = (_event: unknown, url: string) => callback(url)
    ipcRenderer.on(DEEP_LINK_CHANNEL, listener)
    return () => ipcRenderer.removeListener(DEEP_LINK_CHANNEL, listener)
  },
})
