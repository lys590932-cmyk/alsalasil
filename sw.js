/* ===========================================================
   شركة السلاسل — Service Worker
   يخزّن ملفات التطبيق للعمل بدون إنترنت ولتثبيته كتطبيق
   =========================================================== */
const CACHE = 'alsalasil-driver-v1';

// ملفات هيكل التطبيق (App Shell)
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// تثبيت: خزّن ملفات الهيكل
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(err => console.warn('SW cache partial', err)))
      .then(() => self.skipWaiting())
  );
});

// تفعيل: احذف الكاش القديم
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// جلب الطلبات
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // طلبات Supabase (البيانات): الشبكة أولاً، بدون تخزين
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(req).catch(() => new Response('{"offline":true}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // ملفات الخطوط والأيقونات الخارجية: الكاش أولاً ثم الشبكة
  if (url.origin !== self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // ملفات التطبيق المحلية: الكاش أولاً ثم الشبكة، مع التحديث في الخلفية
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
