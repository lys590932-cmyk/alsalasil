/* Service Worker — نظام العهدة (شركة السلاسل)
   استراتيجية: القشرة (shell) من الكاش، وبيانات Supabase من الشبكة دايماً.
   أي تعديل على custody.html؟ غيّر رقم الإصدار تحت علشان التطبيق يتحدّث. */
const VERSION = 'custody-v1';
const SHELL = [
  'custody.html',
  'custody-manifest.json',
  'icon-192.png',
  'icon-512.png',
  'favicon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // بيانات العهدة والدخول: الشبكة دايماً — ممنوع تتخزن
  if (url.hostname.endsWith('supabase.co')) return;

  // باقي الطلبات: الشبكة أولاً، والكاش احتياطي لو النت مقطوع
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('custody.html')))
  );
});
