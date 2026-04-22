(function () {
  const META_PREFIX = '__dbts__:';
  const RELOAD_FLAG_PREFIX = '__dbsync_reloaded__:';
  const POLL_MS = 15000;
  const API_ALL = '/api/storage/all';

  const nativeSetItem = Storage.prototype.setItem;
  const nativeGetItem = Storage.prototype.getItem;
  const nativeRemoveItem = Storage.prototype.removeItem;

  let suppressRemotePush = false;
  const pendingPushes = new Map();
  let flushTimer = null;

  const encodeKey = (key) => encodeURIComponent(String(key));
  const metaKey = (key) => `${META_PREFIX}${key}`;

  function nowTs() {
    return Date.now();
  }

  function setMetaTimestamp(key, ts) {
    nativeSetItem.call(localStorage, metaKey(key), String(ts));
  }

  function getMetaTimestamp(key) {
    return Number(nativeGetItem.call(localStorage, metaKey(key)) || 0);
  }

  function enqueuePush(op, key, value, updatedAt) {
    if (!key || String(key).startsWith(META_PREFIX)) return;
    pendingPushes.set(String(key), { op, key: String(key), value, updatedAt });
    if (flushTimer) return;
    flushTimer = window.setTimeout(flushPushes, 250);
  }

  async function pushEntry(entry) {
    try {
      if (entry.op === 'delete') {
        await fetch(`/api/storage/${encodeKey(entry.key)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updatedAt: entry.updatedAt })
        });
        return;
      }

      await fetch(`/api/storage/${encodeKey(entry.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: entry.value, updatedAt: entry.updatedAt })
      });
    } catch (err) {
      console.error('Shared DB sync push failed:', err);
    }
  }

  async function flushPushes() {
    const entries = Array.from(pendingPushes.values());
    pendingPushes.clear();
    flushTimer = null;
    await Promise.all(entries.map(pushEntry));
  }

  function applyServerEntry(entry) {
    if (!entry || !entry.key || String(entry.key).startsWith(META_PREFIX)) return false;

    const key = String(entry.key);
    const incomingTs = Number(entry.updatedAt) || 0;
    const localTs = getMetaTimestamp(key);

    if (incomingTs < localTs) return false;

    const existing = nativeGetItem.call(localStorage, key);
    if (existing === entry.value && incomingTs === localTs) return false;

    suppressRemotePush = true;
    try {
      if (entry.value === null || typeof entry.value === 'undefined') {
        nativeRemoveItem.call(localStorage, key);
      } else {
        nativeSetItem.call(localStorage, key, String(entry.value));
      }
      setMetaTimestamp(key, incomingTs || nowTs());
    } finally {
      suppressRemotePush = false;
    }

    return true;
  }

  async function hydrateFromServer() {
    try {
      const res = await fetch(API_ALL, { cache: 'no-store' });
      if (!res.ok) return false;

      const payload = await res.json();
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      let changed = false;
      entries.forEach((entry) => {
        changed = applyServerEntry(entry) || changed;
      });
      return changed;
    } catch (err) {
      console.error('Shared DB sync hydrate failed:', err);
      return false;
    }
  }

  function patchStorageWrites() {
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      nativeSetItem.call(this, key, value);
      if (this !== localStorage || suppressRemotePush || String(key).startsWith(META_PREFIX)) return;
      const updatedAt = nowTs();
      setMetaTimestamp(key, updatedAt);
      enqueuePush('set', key, String(value), updatedAt);
    };

    Storage.prototype.removeItem = function patchedRemoveItem(key) {
      nativeRemoveItem.call(this, key);
      if (this !== localStorage || suppressRemotePush || String(key).startsWith(META_PREFIX)) return;
      const updatedAt = nowTs();
      setMetaTimestamp(key, updatedAt);
      enqueuePush('delete', key, null, updatedAt);
    };
  }

  function maybeReloadAfterHydrate(changed) {
    const reloadFlagKey = `${RELOAD_FLAG_PREFIX}${location.pathname}`;
    const alreadyReloaded = sessionStorage.getItem(reloadFlagKey) === '1';
    if (changed && !alreadyReloaded) {
      sessionStorage.setItem(reloadFlagKey, '1');
      location.reload();
    }
  }

  patchStorageWrites();

  window.eventifyStorageReady = hydrateFromServer().then((changed) => {
    maybeReloadAfterHydrate(changed);
    return true;
  });

  window.setInterval(async function () {
    await hydrateFromServer();
  }, POLL_MS);

  window.addEventListener('beforeunload', function () {
    if (pendingPushes.size > 0) {
      flushPushes();
    }
  });
})();
