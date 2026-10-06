/* ═══════════════════════════════════════════════════════════════
   السلاسل كونكت — Service Worker
   إشعارات حقيقية والتطبيق مقفول + فتح المحادثة عند الضغط + كاش للتشغيل السريع
   النطاق: ./connect  (منفصل عن sw.js بتاع تطبيق السائقين)
   ═══════════════════════════════════════════════════════════════ */
const VERSION = 'cx-v1.0.0';
const SHELL = ['connect.html', 'connect-manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('cx-') && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
// الصفحة: من الشبكة الأول، ولو مفيش نت من الكاش
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (!SHELL.some(p => u.pathname.endsWith('/' + p))) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'السلاسل كونكت', body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const focused = wins.some(w => w.focused && w.visibilityState === 'visible' && new URL(w.url).pathname.endsWith('connect.html'));
    // التطبيق مفتوح قدامه: الصفحة نفسها بتعرض الإشعار جوّه (إلا المكالمات والعاجل)
    if (focused && d.type === 'msg' && !d.urgent) return;
    if (typeof d.badge === 'number' && self.navigator.setAppBadge) { try { await self.navigator.setAppBadge(d.badge); } catch {} }
    const isCall = d.type === 'call';
    const opts = {
      body: d.body || '',
      icon: d.icon || 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag || (isCall ? 'call' : 'cx'),
      renotify: true,
      requireInteraction: isCall || !!d.urgent,
      vibrate: isCall ? [500, 250, 500, 250, 500, 250, 500] : d.urgent ? [300, 100, 300, 100, 600] : [120, 60, 120],
      timestamp: d.ts || Date.now(),
      data: { url: d.url || 'connect.html', conv: d.conv, call: d.call, type: d.type },
      dir: d.dir || 'auto', lang: d.lang || 'ar',
    };
    if (isCall) opts.actions = [{ action: 'accept', title: d.lang === 'en' ? '✅ Answer' : '✅ رد' }, { action: 'decline', title: d.lang === 'en' ? '❌ Decline' : '❌ رفض' }];
    if (d.image) opts.image = d.image;
    await self.registration.showNotification(d.title || 'السلاسل كونكت', opts);
    if (isCall) setTimeout(async () => { (await self.registration.getNotifications({ tag: opts.tag })).forEach(n => n.close()); }, 45000);
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const action = e.action;
  e.waitUntil((async () => {
    const base = new URL('connect.html', self.registration.scope.replace(/connect$/, ''));
    if (d.type === 'call' && d.call) { base.searchParams.set('call', d.call); if (action) base.searchParams.set('act', action); }
    else if (d.conv) base.searchParams.set('c', d.conv);
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find(x => new URL(x.url).pathname.endsWith('connect.html'));
    if (w) {
      if (d.type === 'call') w.postMessage({ type: 'call', call: d.call, action });
      else w.postMessage({ type: 'open', c: d.conv });
      if (action !== 'decline') return w.focus();
      return;
    }
    if (action === 'decline') { // رفض بدون فتح التطبيق: نفتحه مخفي مش ممكن — نفتحه بالأمر
      return self.clients.openWindow(base.href);
    }
    return self.clients.openWindow(base.href);
  })());
});

self.addEventListener('pushsubscriptionchange', e => {
  // المتصفح غيّر الاشتراك — الصفحة هتسجّل الجديد أول ما تفتح
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(ws => ws.forEach(w => w.postMessage({ type: 'resub' }))));
});
