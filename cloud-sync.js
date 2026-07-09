/* ═══════════════════════════════════════════════════════════════════
   شركة السلاسل — Cloud Sync V2 (Full Sync)
   Al-Salasil ARK — Complete Cloud Sync with PIN Protection
   ═══════════════════════════════════════════════════════════════════
   V2: يقوم بمزامنة كل البيانات في localStorage
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const SUPA_URL = 'https://pqpowedqewjgkrzvmgyv.supabase.co';
  const SUPA_KEY = 'sb_publishable_EX532ME5SLrt26Gp3YkRXQ_rt9-oaRT';

  // نمازن كل مفتاح يبدأ بهذه البادئات
  const SYNC_PREFIXES = ['sl_', 'salasil_', 'DRV', 'ATT', 'VIO', 'PART'];

  // مفاتيح خاصة إضافية (حتى لو لم تبدأ بالبادئات)
  const EXTRA_KEYS = [
    'sl_att2', 'sl_vio2', 'sl_inc', 'sl_exp', 'sl_drv', 'sl_drivers',
    'sl_leaves', 'sl_apps', 'sl_partners', 'sl_orders', 'sl_dreports',
    'sl_applications', 'sl_schedule', 'sl_sched', 'sl_sal', 'sl_salaries',
    'sl_custom_drivers', 'sl_manual_drivers', 'sl_deductions', 'sl_bonuses',
    'sl_added_drivers', 'sl_notes', 'sl_clockin', 'sl_clockins',
    'sl_apps_list', 'sl_rests', 'sl_restaurants', 'sl_societies',
    'sl_daily_reports', 'sl_reports', 'sl_settings', 'sl_config',
    'salasil_crm_deals', 'salasil_management', 'salasil_staff',
    // مفاتيح خاصة بـARK
    'ARK_DRV', 'ARK_ATT', 'ARK_VIO', 'ARK_PART', 'ARK_INC', 'ARK_EXP',
  ];

  // مفاتيح نتجاهلها (نظام أو حماية PIN)
  const IGNORE_KEYS = ['salasil_local_pin', 'sb-', 'supabase.auth'];

  const PIN_KEY = 'salasil_local_pin';

  let syncing = false;
  let lastLocalData = '';
  const SYNC_INTERVAL = 8000; // 8 ثواني

  // ─────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────
  async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode('salasil_' + pin + '_2026');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function apiCall(method, body) {
    const url = SUPA_URL + '/rest/v1/salasil_sync?id=eq.main';
    const opts = {
      method,
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error('Sync failed: ' + res.status);
    return await res.json();
  }

  async function fetchServerData() {
    const rows = await apiCall('GET');
    return (rows && rows[0]) ? rows[0] : null;
  }

  async function saveToServer(data, pinHash) {
    const payload = {
      data,
      pin_hash: pinHash,
      device_info: navigator.userAgent.slice(0, 100)
    };
    await apiCall('PATCH', payload);
  }

  function shouldSync(key) {
    // تجاهل مفاتيح النظام
    if (IGNORE_KEYS.some(ign => key.startsWith(ign) || key.includes(ign))) return false;
    // تحقق من البادئات
    if (SYNC_PREFIXES.some(p => key.startsWith(p))) return true;
    // تحقق من القائمة الإضافية
    if (EXTRA_KEYS.includes(key)) return true;
    return false;
  }

  function collectLocalData() {
    const data = {};
    // نجمع كل شيء في localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (shouldSync(key)) {
        const val = localStorage.getItem(key);
        if (val !== null) data[key] = val;
      }
    }
    return data;
  }

  function restoreLocalData(data) {
    if (!data || typeof data !== 'object') return 0;
    let count = 0;
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        try {
          localStorage.setItem(key, data[key]);
          count++;
        } catch (e) {
          console.warn('Failed to restore key:', key);
        }
      }
    });
    return count;
  }

  // ─────────────────────────────────────
  // UI — PIN Modal
  // ─────────────────────────────────────
  function showPinModal(mode) {
    return new Promise((resolve) => {
      const isSetup = mode === 'setup';
      const title = isSetup ? '🔐 إنشاء PIN جديد' : '🔐 أدخل PIN للدخول';
      const subtitle = isSetup
        ? 'اختر PIN مكون من 4-6 أرقام — سيتم استخدامه على كل الأجهزة'
        : 'أدخل PIN اللي عملته من الجهاز الرئيسي';

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:linear-gradient(135deg,#0f3a52,#1c5878);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:"Cairo","Tahoma",sans-serif;direction:rtl';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px;padding:36px 32px;max-width:400px;width:90%;box-shadow:0 30px 80px rgba(0,0,0,0.4);border-top:5px solid #c29449">
          <div style="text-align:center;margin-bottom:24px">
            <div style="width:70px;height:70px;background:linear-gradient(135deg,#c29449,#e6b95d);border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:32px;color:#0f3a52;font-weight:900">س</div>
            <h2 style="color:#0f3a52;font-size:20px;font-weight:900;margin-bottom:6px">${title}</h2>
            <p style="color:#64748b;font-size:12px">${subtitle}</p>
          </div>
          <input type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="6" id="pinInput"
            style="width:100%;padding:16px;font-size:24px;text-align:center;letter-spacing:12px;
            border:2px solid #e2e8f0;border-radius:12px;font-family:monospace;font-weight:900;color:#0f3a52;direction:ltr"
            placeholder="••••" autofocus>
          <div id="pinErr" style="color:#dc2626;font-size:12px;margin-top:8px;text-align:center;min-height:16px;font-weight:700"></div>
          <button id="pinBtn" style="width:100%;margin-top:16px;padding:14px;background:linear-gradient(135deg,#0f3a52,#1c5878);
            color:#fff;border:none;border-radius:12px;font-weight:900;font-size:14px;cursor:pointer;font-family:Cairo">
            ${isSetup ? '✅ إنشاء وحفظ' : '🚀 دخول'}
          </button>
          <div style="text-align:center;margin-top:14px;font-size:11px;color:#94a3b8">
            © شركة السلاسل — نظام إدارة داخلي
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const input = document.getElementById('pinInput');
      const btn = document.getElementById('pinBtn');
      const err = document.getElementById('pinErr');

      function tryDone() {
        const pin = input.value.trim();
        err.textContent = '';
        if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
          err.textContent = '❌ PIN لازم يكون من 4-6 أرقام';
          return;
        }
        overlay.remove();
        resolve(pin);
      }

      btn.onclick = tryDone;
      input.onkeydown = e => { if (e.key === 'Enter') tryDone(); };
      setTimeout(() => input.focus(), 100);
    });
  }

  function showToast(msg, type) {
    const bg = type === 'err' ? '#dc2626' : (type === 'ok' ? '#059669' : '#0f3a52');
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      background:${bg};color:#fff;padding:12px 20px;border-radius:10px;font-weight:800;
      z-index:99998;box-shadow:0 8px 24px rgba(0,0,0,0.2);font-family:'Cairo',sans-serif;font-size:13px;direction:rtl`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function showSyncStatus(text, color) {
    let el = document.getElementById('cloudSyncStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cloudSyncStatus';
      el.style.cssText = `position:fixed;bottom:12px;right:12px;padding:6px 14px;
        background:rgba(15,58,82,0.9);color:#fff;border-radius:20px;font-size:11px;font-weight:700;
        z-index:99997;font-family:'Cairo',sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.2);
        direction:rtl;display:flex;align-items:center;gap:6px;cursor:pointer`;
      el.title = 'اضغط للمزامنة الفورية';
      el.onclick = window.cloudSyncNow;
      document.body.appendChild(el);
    }
    const dot = color === 'green' ? '🟢' : (color === 'orange' ? '🟡' : (color === 'red' ? '🔴' : '⚪'));
    el.textContent = dot + ' ' + text;
  }

  // ─────────────────────────────────────
  // MAIN FLOW
  // ─────────────────────────────────────
  async function init() {
    try {
      showSyncStatus('جاري الاتصال...', 'orange');

      // 1. Get server state
      const server = await fetchServerData();
      const hasServerPin = server && server.pin_hash;
      const hasServerData = server && server.data && Object.keys(server.data).length > 0;

      let currentPinHash = localStorage.getItem(PIN_KEY);
      let userPin;

      // 2. If no PIN set on server → first setup
      if (!hasServerPin) {
        userPin = await showPinModal('setup');
        currentPinHash = await hashPin(userPin);
        localStorage.setItem(PIN_KEY, currentPinHash);
        showToast('✅ تم إنشاء PIN بنجاح!', 'ok');

        // Upload initial local data
        const localData = collectLocalData();
        await saveToServer(localData, currentPinHash);
        lastLocalData = JSON.stringify(localData);
        showToast('☁️ تم رفع البيانات على السحابة (' + Object.keys(localData).length + ' عنصر)', 'ok');
        showSyncStatus('متزامن', 'green');
      } else {
        // 3. Server has PIN — verify local matches
        if (!currentPinHash || currentPinHash !== server.pin_hash) {
          while (true) {
            userPin = await showPinModal('login');
            const hash = await hashPin(userPin);
            if (hash === server.pin_hash) {
              localStorage.setItem(PIN_KEY, hash);
              currentPinHash = hash;
              break;
            }
            showToast('❌ PIN غير صحيح — حاول تاني', 'err');
          }
        }

        // 4. Load data from server
        if (hasServerData) {
          const count = restoreLocalData(server.data);
          showToast('☁️ تم تحميل ' + count + ' عنصر من السحابة', 'ok');
          showSyncStatus('متزامن', 'green');

          // Save current server data as baseline
          lastLocalData = JSON.stringify(server.data);

          // Auto-reload after 1.5s
          setTimeout(() => {
            location.reload();
          }, 1500);
          return; // don't start auto-sync yet, we're reloading
        } else {
          // No server data yet — upload local
          const localData = collectLocalData();
          await saveToServer(localData, currentPinHash);
          lastLocalData = JSON.stringify(localData);
          showToast('☁️ تم رفع البيانات', 'ok');
          showSyncStatus('متزامن', 'green');
        }
      }

      // 5. Start auto-sync
      startAutoSync(currentPinHash);

    } catch (err) {
      console.error('Cloud sync init failed:', err);
      showSyncStatus('غير متصل', 'red');
      showToast('⚠️ فشل الاتصال بالسحابة — يعمل محلياً', 'err');
    }
  }

  function startAutoSync(pinHash) {
    setInterval(async () => {
      if (syncing) return;
      try {
        const localData = collectLocalData();
        const serialized = JSON.stringify(localData);

        // Only sync if data changed
        if (serialized === lastLocalData) {
          return;
        }

        syncing = true;
        showSyncStatus('يزامن...', 'orange');
        await saveToServer(localData, pinHash);
        lastLocalData = serialized;
        showSyncStatus('متزامن ' + new Date().toLocaleTimeString('en-GB').slice(0,5), 'green');
      } catch (err) {
        showSyncStatus('خطأ في المزامنة', 'red');
      } finally {
        syncing = false;
      }
    }, SYNC_INTERVAL);

    // Also sync on page unload
    window.addEventListener('beforeunload', () => {
      try {
        const localData = collectLocalData();
        const payload = JSON.stringify({ data: localData, pin_hash: pinHash });
        const url = SUPA_URL + '/rest/v1/salasil_sync?id=eq.main';
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      } catch(e) {}
    });
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }

  // Expose manual sync + download
  window.cloudSyncNow = async function() {
    const hash = localStorage.getItem(PIN_KEY);
    if (!hash) { showToast('لم يتم إعداد PIN', 'err'); return; }
    try {
      showSyncStatus('يزامن يدوياً...', 'orange');
      const localData = collectLocalData();
      await saveToServer(localData, hash);
      lastLocalData = JSON.stringify(localData);
      showSyncStatus('متزامن ' + new Date().toLocaleTimeString('en-GB').slice(0,5), 'green');
      showToast('✅ تمت المزامنة (' + Object.keys(localData).length + ' عنصر)', 'ok');
    } catch(e) {
      showToast('❌ فشل المزامنة: ' + e.message, 'err');
    }
  };

  window.cloudDownloadNow = async function() {
    const hash = localStorage.getItem(PIN_KEY);
    if (!hash) { showToast('لم يتم إعداد PIN', 'err'); return; }
    if (!confirm('⚠️ سيتم استبدال البيانات الحالية بالبيانات من السحابة\nاضغط OK للمتابعة')) return;
    try {
      showSyncStatus('يحمّل من السحابة...', 'orange');
      const server = await fetchServerData();
      if (!server || !server.data) { showToast('لا توجد بيانات', 'err'); return; }
      const count = restoreLocalData(server.data);
      lastLocalData = JSON.stringify(server.data);
      showToast('✅ تم تحميل ' + count + ' عنصر', 'ok');
      setTimeout(() => location.reload(), 1000);
    } catch(e) {
      showToast('❌ فشل التحميل: ' + e.message, 'err');
    }
  };

})();
