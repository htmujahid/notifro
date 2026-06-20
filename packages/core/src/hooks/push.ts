import { useState, useEffect, useCallback } from "react"
import { useApiClient } from "@workspace/api-client/context"

function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

function b64urlToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice(0, (4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported"

export interface UsePushRegistrationResult {
  supported: boolean
  permission: PushPermission
  subscribed: boolean
  loading: boolean
  enable: () => Promise<void>
  disable: () => Promise<void>
}

export function usePushRegistration(): UsePushRegistrationResult {
  const client = useApiClient()
  const supported = isWebPushSupported()

  const [permission, setPermission] = useState<PushPermission>(
    supported ? (Notification.permission as PushPermission) : "unsupported",
  )
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
      })
    })
  }, [supported])

  const enable = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      const reg = await navigator.serviceWorker.ready

      const perm = await Notification.requestPermission()
      setPermission(perm as PushPermission)
      if (perm !== "granted") return

      const { publicKey } = await client.get<{ publicKey: string }>("/push/vapid-public-key")

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64urlToUint8Array(publicKey),
      })

      const json = sub.toJSON()
      await client.post("/push/subscribe", {
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
        userAgent: navigator.userAgent,
      })

      setSubscribed(true)
    } finally {
      setLoading(false)
    }
  }, [supported, client])

  const disable = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await client.post("/push/unsubscribe", { endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [supported, client])

  return { supported, permission, subscribed, loading, enable, disable }
}
