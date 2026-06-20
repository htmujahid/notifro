const SW_VERSION = 1

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  if (!e.data) return
  let data = {}
  try {
    data = e.data.json()
  } catch {
    data = { title: e.data.text() }
  }

  const title = data.title ?? 'Renderical'
  const options = {
    body: data.body,
    icon: data.icon ?? '/icon-192.png',
    badge: '/favicon.ico',
    data: { url: data.url ?? '/' },
    tag: 'renderical-notification',
  }

  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
