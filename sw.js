/* ===========================================================
   شركة السلاسل — Service Worker
   يخزّن ملفات التطبيق للعمل بدون إنترنت ولتثبيته كتطبيق
   + يدعم إشعارات الموبايل الفعلية (Web Notifications)
   =========================================================== */
const CACHE = 'alsalasil-driver-v10';

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

  // ⚡ صفحات HTML: الشبكة أولاً (عشان التحديثات توصل فوراً) ثم الكاش لو مفيش نت
  const isHTML = req.mode === 'navigate'
              || (req.headers.get('accept') || '').includes('text/html')
              || url.pathname.endsWith('.html')
              || url.pathname === '/' || url.pathname.endsWith('/');
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // باقي ملفات التطبيق (صور/أيقونات): الكاش أولاً ثم الشبكة
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

/* =========================================================
   إشعارات الموبايل — Notifications
   ========================================================= */

// لما المستخدم يضغط على إشعار، افتح/فعّل التطبيق
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(clients => {
      // لو في نافذة شغالة، فعّلها وابعتلها رسالة لفتح المحادثة
      for (const c of clients) {
        if (c.url.indexOf(self.location.origin) === 0) {
          c.postMessage({type:'OPEN_MESSAGES', data:e.notification.data});
          return c.focus();
        }
      }
      // وإلا افتح نافذة جديدة
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// رسائل من الصفحة → إظهار إشعار
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SHOW_NOTIFICATION') return;
  const d = e.data.payload || {};
  self.registration.showNotification(d.title || 'السلاسل فلاي', {
    body: d.body || '',
    icon: d.icon || './icon-192.png',
    badge: './icon-192.png',
    tag: d.tag || 'msg',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
    data: d.data || {url:'./'}
  });
});

/* =========================================================
   Web Push — ده اللي بيوصل الإشعار والتطبيق مقفول
   ========================================================= */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (err) { d = { body: (e.data && e.data.text()) || '' }; }

  const title = d.title || 'شركة السلاسل';
  const opts = {
    body:  d.body || '',
    icon:  d.icon  || './icon-192.png',
    badge: './icon-192.png',
    tag:   d.tag   || 'msg',
    renotify: true,
    requireInteraction: !!d.sticky,
    vibrate: [200, 100, 200],
    dir:  'rtl',
    lang: d.lang || 'ar',
    data: Object.assign({ url: './' }, d.data || {})
  };

  e.waitUntil((async () => {
    await self.registration.showNotification(title, opts);
    // لو التطبيق مفتوح، خلّيه يحدّث الرسائل فوراً
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    cs.forEach(c => c.postMessage({ type: 'PUSH_RECEIVED', payload: d }));
  })());
});

/* لو المتصفح جدّد اشتراك الجهاز — نسجّله من تاني من غير ما السائق يعمل حاجة */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (cs.length) { cs.forEach(c => c.postMessage({ type: 'PUSH_RESUBSCRIBE' })); return; }
    // التطبيق مقفول — نعلّم علشان يتسجّل أول ما يفتح
    try {
      const cache = await caches.open(CACHE);
      await cache.put('/__push_resubscribe', new Response('1'));
    } catch (err) {}
  })());
});
