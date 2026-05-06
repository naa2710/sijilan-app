const DEFAULT_RETENTION_DAYS = 5;
const ARCHIVE_SUFFIX = '_archive';

const nowIso = () => new Date().toISOString();

const readStorage = (key, fallback) => {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Ignore storage quota issues in notification helpers.
  }
};

export const pruneNotificationHistory = (entries = [], retentionDays = DEFAULT_RETENTION_DAYS) => {
  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  return (Array.isArray(entries) ? entries : []).filter((entry) => (
    new Date(entry?.createdAt || 0).getTime() >= cutoffTime
  ));
};

const getArchiveKey = (storageKey) => `${storageKey}${ARCHIVE_SUFFIX}`;

const dedupeEntries = (entries = []) => {
  const seenIds = new Set();
  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    const entryId = String(entry?.id || '');
    if (!entryId || seenIds.has(entryId)) {
      return false;
    }
    seenIds.add(entryId);
    return true;
  });
};

const splitNotificationsByAge = (entries = [], retentionDays = DEFAULT_RETENTION_DAYS) => {
  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  return dedupeEntries(entries).reduce((acc, entry) => {
    const createdAt = new Date(entry?.createdAt || 0).getTime();
    if (createdAt >= cutoffTime) {
      acc.recent.push(entry);
    } else {
      acc.archive.push({ ...entry, unread: false });
    }
    return acc;
  }, { recent: [], archive: [] });
};

const syncNotificationStore = (storageKey, retentionDays = DEFAULT_RETENTION_DAYS) => {
  const recentEntries = readStorage(storageKey, []);
  const archiveEntries = readStorage(getArchiveKey(storageKey), []);
  const mergedEntries = dedupeEntries([...recentEntries, ...archiveEntries]);
  const { recent, archive } = splitNotificationsByAge(mergedEntries, retentionDays);
  writeStorage(storageKey, recent);
  writeStorage(getArchiveKey(storageKey), archive);
  return { recent, archive };
};

export const readNotificationHistory = (storageKey, retentionDays = DEFAULT_RETENTION_DAYS) => {
  return syncNotificationStore(storageKey, retentionDays).recent;
};

export const readArchivedNotificationHistory = (storageKey, retentionDays = DEFAULT_RETENTION_DAYS) => (
  syncNotificationStore(storageKey, retentionDays).archive
);

export const appendNotificationHistory = (storageKey, entry, retentionDays = DEFAULT_RETENTION_DAYS) => {
  const { recent, archive } = syncNotificationStore(storageKey, retentionDays);
  const nextEntry = {
    id: entry?.id || `${entry?.type || 'notice'}-${Date.now()}`,
    type: entry?.type || 'general',
    title: String(entry?.title || 'إشعار').trim(),
    body: String(entry?.body || '').trim(),
    partnerId: entry?.partnerId ? Number(entry.partnerId) : null,
    partnerName: entry?.partnerName ? String(entry.partnerName).trim() : '',
    unread: entry?.unread !== false,
    createdAt: entry?.createdAt || nowIso(),
  };
  const nextEntries = dedupeEntries([
    nextEntry,
    ...recent.filter((item) => String(item?.id) !== String(nextEntry.id)),
    ...archive.filter((item) => String(item?.id) !== String(nextEntry.id)),
  ]);
  const partitionedEntries = splitNotificationsByAge(nextEntries, retentionDays);
  writeStorage(storageKey, partitionedEntries.recent);
  writeStorage(getArchiveKey(storageKey), partitionedEntries.archive);
  return partitionedEntries.recent;
};

export const clearAllNotifications = (storageKey) => {
  writeStorage(storageKey, []);
  writeStorage(getArchiveKey(storageKey), []);
  return [];
};

export const markAllNotificationsRead = (storageKey, retentionDays = DEFAULT_RETENTION_DAYS) => {
  const currentEntries = readNotificationHistory(storageKey, retentionDays);
  const nextEntries = currentEntries.map((entry) => ({ ...entry, unread: false }));
  writeStorage(storageKey, nextEntries);
  return nextEntries;
};

export const ensureSystemNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (window.Notification.permission === 'granted') {
    return 'granted';
  }

  if (window.Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    return await window.Notification.requestPermission();
  } catch (error) {
    return 'denied';
  }
};

export const showSystemNotification = async ({ title, body, tag }) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  const permission = await ensureSystemNotificationPermission();
  if (permission !== 'granted') {
    return false;
  }

  const options = {
    body,
    tag,
    renotify: true,
    requireInteraction: false,
    icon: '/logo192.png',
    badge: '/favicon.png',
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return true;
    }

    // eslint-disable-next-line no-new
    new window.Notification(title, options);
    return true;
  } catch (error) {
    return false;
  }
};
