const BACKUP_VERSION = '3.0';
const BACKUP_FILE_PREFIX = 'sijilati-backup';

const createSafeTimestamp = (date = new Date()) =>
  date.toISOString().replace(/[:.]/g, '-');

export const buildBackupPayload = (history, settings, accounts = [], ledgers = {}, partnerMessages = {}) => ({
  version: BACKUP_VERSION,
  timestamp: new Date().toISOString(),
  history,
  settings,
  accounts,
  ledgers,
  partnerMessages,
});

export const summarizeBackup = (payload = {}) => ({
  historyCount: Array.isArray(payload.history) ? payload.history.length : 0,
  accountCount: Array.isArray(payload.accounts) ? payload.accounts.length : 0,
  ledgerRecordsCount: Object.values(payload.ledgers || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
  partnerCount: Array.isArray(payload.settings?.partners) ? payload.settings.partners.length : 0,
  createdAt: payload.timestamp || new Date().toISOString(),
});

export const createBackupSnapshot = (payload, kind = 'manual', label = '') => ({
  id: `${kind}-${Date.now()}`,
  kind,
  label: label.trim() || (kind === 'automatic' ? 'نسخة تلقائية' : 'نسخة يدوية'),
  createdAt: payload.timestamp || new Date().toISOString(),
  summary: summarizeBackup(payload),
  data: payload,
});

export const getBackupFileName = (payload, prefix = BACKUP_FILE_PREFIX, extension = 'json') =>
  `${prefix}_${createSafeTimestamp(new Date(payload?.timestamp || Date.now()))}.${extension}`;

export const serializeBackup = (payload) => JSON.stringify(payload, null, 2);

export const downloadBackupPayload = (payload, fileName = getBackupFileName(payload)) => {
  const blob = new Blob([serializeBackup(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportData = (history, settings, accounts = [], ledgers = {}, partnerMessages = {}) => {
  const payload = buildBackupPayload(history, settings, accounts, ledgers, partnerMessages);
  downloadBackupPayload(payload);
  return payload;
};

export const parseBackupText = (text) => {
  const data = JSON.parse(text);

  if (!Array.isArray(data.history) || !data.settings) {
    throw new Error('ملف النسخة الاحتياطية غير صالح.');
  }

  return {
    ...data,
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    ledgers: data.ledgers || {},
    partnerMessages: data.partnerMessages || {},
  };
};

export const parseBackupFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        resolve(parseBackupText(event.target?.result || ''));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('تعذر قراءة ملف النسخة الاحتياطية.'));
    reader.readAsText(file);
  });

export const importData = async (file, callback) => {
  try {
    const data = await parseBackupFile(file);
    callback(data);
  } catch (error) {
    if (typeof window !== 'undefined' && typeof window.appAlert === 'function') {
      await window.appAlert(error.message || 'خطأ في قراءة الملف.');
      return;
    }

    alert(error.message || 'خطأ في قراءة الملف.');
  }
};

export const BACKUP_LIMITS = {
  manualSnapshots: 6,
};

export const BACKUP_FILE_PREFIX_VALUE = BACKUP_FILE_PREFIX;
