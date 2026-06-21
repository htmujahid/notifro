import { registerPlugin } from "@capacitor/core"
import type { ApiClient } from "@renderical/api-client/client"

export type DevicePlatform = "ios" | "android"

interface PermissionStatus {
  receive: "prompt" | "prompt-with-rationale" | "granted" | "denied"
}

interface TokenEvent {
  value: string
}

interface RegistrationError {
  error: string
}

interface PluginListenerHandle {
  remove: () => Promise<void>
}

interface PushNotificationsPlugin {
  checkPermissions(): Promise<PermissionStatus>
  requestPermissions(): Promise<PermissionStatus>
  register(): Promise<void>
  addListener(
    event: "registration",
    cb: (token: TokenEvent) => void
  ): Promise<PluginListenerHandle>
  addListener(
    event: "registrationError",
    cb: (err: RegistrationError) => void
  ): Promise<PluginListenerHandle>
}

const PushNotifications =
  registerPlugin<PushNotificationsPlugin>("PushNotifications")

export async function registerForPush(
  api: ApiClient,
  platform: DevicePlatform
): Promise<boolean> {
  let permission = await PushNotifications.checkPermissions()
  if (
    permission.receive === "prompt" ||
    permission.receive === "prompt-with-rationale"
  ) {
    permission = await PushNotifications.requestPermissions()
  }
  if (permission.receive !== "granted") return false

  await PushNotifications.addListener("registration", (token) => {
    void api
      .post("/api/devices", { platform, token: token.value })
      .catch(() => {})
  })
  await PushNotifications.addListener("registrationError", () => {})

  await PushNotifications.register()
  return true
}

export async function unregisterPush(
  api: ApiClient,
  token: string
): Promise<void> {
  await api.delete(`/api/devices/${encodeURIComponent(token)}`).catch(() => {})
}
