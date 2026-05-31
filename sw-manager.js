// Service Worker — Al-Salasil Manager App
const CACHE = 'salasil-mgr-v2';
const CORE = [
  './manager.html',
  './manager-manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE).catch(err => console.warn('SW cache error', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never cache Supabase API calls — always go live
  if (url.includes('supabase.co/rest')) return;
  if (e.request.method !== 'GET') return;

  // Cache-first for assets, network-first for the HTML shell
  if (url.endsWith('manager.html') || url.endsWith('/alsalasil/') || url.endsWith('/alsalasil')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./manager.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./manager.html'));
    })
  );
});

/* ============= NOTIFICATIONS ============= */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './manager.html';
  e.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(clients => {
      for (const c of clients) {
        if (c.url.indexOf(self.location.origin) === 0) {
          c.postMessage({type:'OPEN_MESSAGES', data:e.notification.data});
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SHOW_NOTIFICATION') return;
  const d = e.data.payload || {};
  self.registration.showNotification(d.title || 'السلاسل مدير', {
    body: d.body || '',
    icon: d.icon || './icon-192.png',
    badge: './icon-192.png',
    tag: d.tag || 'msg',
    renotify: true,
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
    data: d.data || {url:'./manager.html'}
  });
});
