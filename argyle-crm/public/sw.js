const CACHE = 'argyle-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title || 'New lead', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/leads' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const target = e.notification.data?.url || '/leads'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.navigate(target)
      } else {
        self.clients.openWindow(target)
      }
    })
  )
})
