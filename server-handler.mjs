import { Blob } from 'node:buffer';
import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const API_PORT = Number(process.env.PORT || process.env.WHATSAPP_DIRECT_PORT || 8787);
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';
const MAX_BODY_SIZE = 12 * 1024 * 1024;
const STATIC_ROOT = path.resolve(process.cwd(), process.env.STATIC_ROOT || 'dist');
const DATA_ROOT = process.env.DATA_ROOT
  || (process.env.VERCEL ? path.join('/tmp', 'sijilati-data') : path.resolve(process.cwd(), 'data'));
const PARTNER_RECEIPTS_FILE = path.join(DATA_ROOT, 'partner-receipts.json');
const PARTNER_MESSAGES_FILE = path.join(DATA_ROOT, 'partner-messages.json');
const PARTNER_LEDGER_STATE_FILE = path.join(DATA_ROOT, 'partner-ledger-state.json');
const EDIT_REQUESTS_FILE = path.join(DATA_ROOT, 'partner-edit-requests.json');
const PIN_RESET_REQUESTS_FILE = path.join(DATA_ROOT, 'pin-reset-requests.json');
const ABDALALEM_LEDGER_FILE = path.join(DATA_ROOT, 'abdalalem-ledger.json');
const ADMIN_SETTINGS_FILE = path.join(DATA_ROOT, 'admin-settings.json');
const PARTNER_ACCESS_FILE = path.join(DATA_ROOT, 'partner-access.json');
const adminEventClients = new Set();
const partnerEventClients = new Map();
const STORE_CACHE = new Map();
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const ENV_FILE_PATHS = [
  path.resolve(process.cwd(), '.env.whatsapp.local'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) return {};

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return acc;
      const separatorIndex = trimmed.indexOf('=');
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key) acc[key] = value;
      return acc;
    }, {});
};

const envFromFiles = ENV_FILE_PATHS.reduce((acc, filePath) => ({ ...acc, ...parseEnvFile(filePath) }), {});

const getConfigValue = (key) => envFromFiles[key] || process.env[key] || '';

const getWhatsAppConfig = () => ({
  accessToken: getConfigValue('WHATSAPP_ACCESS_TOKEN'),
  phoneNumberId: getConfigValue('WHATSAPP_PHONE_NUMBER_ID'),
  businessAccountId: getConfigValue('WHATSAPP_BUSINESS_ACCOUNT_ID'),
  adminNumber: String(getConfigValue('WHATSAPP_ADMIN_NUMBER') || '967776022245').replace(/[^\d]/g, ''),
});

const getTelegramConfig = () => ({
  botToken: getConfigValue('TELEGRAM_BOT_TOKEN') || '8744192876:AAFoEzLELm6fgDvRWDjjv0Mi9GMigY1rTU0',
  chatId: String(getConfigValue('TELEGRAM_CHAT_ID') || '-1003918458927').trim(),
});

const getMissingConfig = () => {
  const config = getWhatsAppConfig();
  return Object.entries({
    WHATSAPP_ACCESS_TOKEN: config.accessToken,
    WHATSAPP_PHONE_NUMBER_ID: config.phoneNumberId,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);
};

const getHealthPayload = () => ({
  ok: true,
  status: 'healthy',
  port: API_PORT,
  staticRoot: STATIC_ROOT,
  dataRoot: DATA_ROOT,
  missingConfig: getMissingConfig(),
  timestamp: new Date().toISOString(),
});

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(payload));
};

const initializeEventStream = (request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Accel-Buffering': 'no',
  });

  request.socket?.setTimeout?.(0);
  response.flushHeaders?.();
};

const sendEventStreamMessage = (response, eventName, payload) => {
  if (response.writableEnded || response.destroyed) return false;

  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
  return true;
};

const registerEventClient = (request, response, collection, connectedPayload = {}) => {
  initializeEventStream(request, response);
  collection.add(response);
  sendEventStreamMessage(response, 'connected', connectedPayload);

  const heartbeatId = setInterval(() => {
    if (response.writableEnded || response.destroyed) {
      clearInterval(heartbeatId);
      collection.delete(response);
      return;
    }

    response.write(': keepalive\n\n');
  }, 20000);

  request.on('close', () => {
    clearInterval(heartbeatId);
    collection.delete(response);
  });
};

const getPartnerEventCollection = (partnerId) => {
  const key = String(partnerId || '').trim();
  if (!key) return null;

  if (!partnerEventClients.has(key)) {
    partnerEventClients.set(key, new Set());
  }

  return partnerEventClients.get(key);
};

const findPartnerEventCollection = (partnerId) => {
  const key = String(partnerId || '').trim();
  if (!key) return null;
  return partnerEventClients.get(key) || null;
};

const registerPartnerEventClient = (request, response, partnerId) => {
  const collection = getPartnerEventCollection(partnerId);
  if (!collection) {
    throw new Error('رقم الشريك غير صالح.');
  }

  // Close previous connections for this partner to avoid TCP starvation (max 6 connections per domain)
  for (const oldResponse of collection) {
    try {
      if (!oldResponse.writableEnded) {
        oldResponse.write('event: close_duplicate\ndata: {}\n\n');
        oldResponse.end();
      }
    } catch (e) {}
    collection.delete(oldResponse);
  }

  initializeEventStream(request, response);
  collection.add(response);
  sendEventStreamMessage(response, 'connected', { partnerId: String(partnerId), connectedAt: new Date().toISOString() });

  const heartbeatId = setInterval(() => {
    if (response.writableEnded || response.destroyed) {
      clearInterval(heartbeatId);
      collection.delete(response);
      if (!collection.size) {
        partnerEventClients.delete(String(partnerId));
      }
      return;
    }

    response.write(': keepalive\n\n');
  }, 20000);

  request.on('close', () => {
    clearInterval(heartbeatId);
    collection.delete(response);
    if (!collection.size) {
      partnerEventClients.delete(String(partnerId));
    }
  });
};

const broadcastEvent = (collection, eventName, payload) => {
  collection.forEach((response) => {
    const sent = sendEventStreamMessage(response, eventName, payload);
    if (!sent) {
      collection.delete(response);
    }
  });
};

const broadcastAdminEvent = (eventName, payload) => {
  if (!adminEventClients.size) return;
  broadcastEvent(adminEventClients, eventName, payload);
};

const broadcastPartnerEvent = (partnerId, eventName, payload) => {
  const collection = findPartnerEventCollection(partnerId);
  if (!collection?.size) return;
  broadcastEvent(collection, eventName, payload);
};

const parseRequestBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  request.on('data', (chunk) => { body += chunk.toString(); });
  request.on('end', () => {
    console.log(`[Backend] Received body: ${body.length} bytes`);
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch (e) {
      resolve({});
    }
  });
  request.on('error', (err) => reject(err));
});

const normalizePhone = (value = '') => String(value).replace(/[^\d]/g, '');
const ensureDataRoot = () => {
  if (!existsSync(DATA_ROOT)) {
    mkdirSync(DATA_ROOT, { recursive: true });
  }
};

const readPartnerReceiptsStore = () => {
  if (STORE_CACHE.has('receipts')) return STORE_CACHE.get('receipts');
  if (!existsSync(PARTNER_RECEIPTS_FILE)) return { receipts: [] };
  try {
    const data = JSON.parse(readFileSync(PARTNER_RECEIPTS_FILE, 'utf8'));
    const store = { receipts: Array.isArray(data?.receipts) ? data.receipts : [] };
    STORE_CACHE.set('receipts', store);
    return store;
  } catch (error) { return { receipts: [] }; }
};

const writePartnerReceiptsStore = (nextStore) => {
  STORE_CACHE.set('receipts', nextStore);
  ensureDataRoot();
  writeFileSync(PARTNER_RECEIPTS_FILE, JSON.stringify(nextStore), 'utf8');
};

const readPartnerMessagesStore = () => {
  if (STORE_CACHE.has('messages')) return STORE_CACHE.get('messages');
  if (!existsSync(PARTNER_MESSAGES_FILE)) return { messages: {} };
  try {
    const data = JSON.parse(readFileSync(PARTNER_MESSAGES_FILE, 'utf8'));
    const store = { messages: data?.messages && typeof data.messages === 'object' ? data.messages : {} };
    STORE_CACHE.set('messages', store);
    return store;
  } catch (error) { return { messages: {} }; }
};

const writePartnerMessagesStore = (nextStore) => {
  STORE_CACHE.set('messages', nextStore);
  ensureDataRoot();
  writeFileSync(PARTNER_MESSAGES_FILE, JSON.stringify(nextStore), 'utf8');
};

const readPartnerAccessStore = () => {
  if (STORE_CACHE.has('access')) return STORE_CACHE.get('access');
  if (!existsSync(PARTNER_ACCESS_FILE)) return { disabledIds: [] };
  try {
    const data = JSON.parse(readFileSync(PARTNER_ACCESS_FILE, 'utf8'));
    const store = { disabledIds: Array.isArray(data?.disabledIds) ? data.disabledIds : [] };
    STORE_CACHE.set('access', store);
    return store;
  } catch (error) { return { disabledIds: [] }; }
};

const writePartnerAccessStore = (nextStore) => {
  STORE_CACHE.set('access', nextStore);
  ensureDataRoot();
  writeFileSync(PARTNER_ACCESS_FILE, JSON.stringify(nextStore), 'utf8');
};

const isPartnerDisabled = (partnerId) => {
  const idStr = String(partnerId || '').trim();
  if (!idStr) return true;

  const { disabledIds } = readPartnerAccessStore();
  
  // 1. Check if explicitly disabled
  if (disabledIds.includes(idStr)) return true;

  // 2. Check if partner still exists in settings
  const settings = readGlobalSettingsStore();
  if (settings && Array.isArray(settings.partners)) {
    const exists = settings.partners.some(p => String(p.id) === idStr);
    if (!exists) return true; // Block if deleted from the official list
  }

  return false;
};

const readPartnerLedgerStateStore = () => {
  if (STORE_CACHE.has('ledgers')) return STORE_CACHE.get('ledgers');
  if (!existsSync(PARTNER_LEDGER_STATE_FILE)) return { ledgers: {} };
  try {
    const data = JSON.parse(readFileSync(PARTNER_LEDGER_STATE_FILE, 'utf8'));
    const store = { ledgers: data?.ledgers && typeof data.ledgers === 'object' ? data.ledgers : {} };
    STORE_CACHE.set('ledgers', store);
    return store;
  } catch (error) { return { ledgers: {} }; }
};

const writePartnerLedgerStateStore = (nextStore) => {
  const partnerCount = Object.keys(nextStore.ledgers || {}).length;
  console.log(`[Backend] Writing ledger state for ${partnerCount} partners to ${PARTNER_LEDGER_STATE_FILE}`);
  STORE_CACHE.set('ledgers', nextStore);
  ensureDataRoot();
  writeFileSync(PARTNER_LEDGER_STATE_FILE, JSON.stringify(nextStore), 'utf8');
};

const readEditRequestsStore = () => {
  if (!existsSync(EDIT_REQUESTS_FILE)) {
    return { requests: [] };
  }

  try {
    const data = JSON.parse(readFileSync(EDIT_REQUESTS_FILE, 'utf8'));
    return {
      requests: Array.isArray(data?.requests) ? data.requests : [],
    };
  } catch (error) {
    return { requests: [] };
  }
};

const writeEditRequestsStore = (nextStore) => {
  ensureDataRoot();
  writeFileSync(EDIT_REQUESTS_FILE, JSON.stringify(nextStore, null, 2), 'utf8');
};

const readPinResetRequestsStore = () => {
  if (!existsSync(PIN_RESET_REQUESTS_FILE)) {
    return { requests: [] };
  }

  try {
    const data = JSON.parse(readFileSync(PIN_RESET_REQUESTS_FILE, 'utf8'));
    return {
      requests: Array.isArray(data?.requests) ? data.requests : [],
    };
  } catch (error) {
    return { requests: [] };
  }
};

const writePinResetRequestsStore = (nextStore) => {
  ensureDataRoot();
  writeFileSync(PIN_RESET_REQUESTS_FILE, JSON.stringify(nextStore, null, 2), 'utf8');
};

const readGlobalSettingsStore = () => {
  try {
    if (!existsSync(ADMIN_SETTINGS_FILE)) return { partners: [] };
    const data = JSON.parse(readFileSync(ADMIN_SETTINGS_FILE, 'utf8'));
    STORE_CACHE.set('settings', data);
    return data;
  } catch (error) { 
    console.error('[Backend] Error reading settings:', error);
    return { partners: [] }; 
  }
};

const writeGlobalSettingsStore = (nextStore) => {
  STORE_CACHE.set('settings', nextStore);
  ensureDataRoot();
  writeFileSync(ADMIN_SETTINGS_FILE, JSON.stringify(nextStore, null, 2), 'utf8');
};

const normalizeLedgerRecord = (record = {}) => ({
  ...record,
  id: Number(record?.id) || Date.now(),
  amount: Number(record?.amount) || 0,
  date: record?.date || new Date().toISOString(),
  note: String(record?.note || '').trim(),
  imageDataUrl: String(record?.imageDataUrl || ''),
  imageName: String(record?.imageName || ''),
  imageType: String(record?.imageType || ''),
  source: record?.source || 'partner',
  status: record?.status || 'pending',
  updatedAt: record?.updatedAt || new Date().toISOString(),
});

const normalizeQueuedReceipt = ({ partnerId, partnerName, record }) => {
  const safePartnerId = String(partnerId || '').trim();
  const normalizedRecord = normalizeLedgerRecord(record);
  const normalizedRecordId = normalizedRecord.id;

  return {
    syncId: `${safePartnerId}-${normalizedRecordId}`,
    partnerId: safePartnerId,
    partnerName: String(partnerName || `فرد ${safePartnerId}`).trim(),
    receivedAt: new Date().toISOString(),
    record: normalizedRecord,
  };
};

const upsertPartnerLedgerRecord = ({ partnerId, record }) => {
  const partnerKey = String(partnerId || '').trim();
  if (!partnerKey) {
    throw new Error('رقم الشريك غير صالح.');
  }

  const store = readPartnerLedgerStateStore();
  const nextRecord = normalizeLedgerRecord(record);
  const currentLedger = Array.isArray(store.ledgers[partnerKey]) ? store.ledgers[partnerKey] : [];
  const nextLedger = currentLedger.some((item) => Number(item?.id) === nextRecord.id)
    ? currentLedger.map((item) => (Number(item?.id) === nextRecord.id ? { ...item, ...nextRecord } : item))
    : [...currentLedger, nextRecord];

  store.ledgers[partnerKey] = nextLedger
    .sort((left, right) => new Date(left?.date || 0).getTime() - new Date(right?.date || 0).getTime());
  writePartnerLedgerStateStore(store);
  return nextRecord;
};

const replacePartnerLedgerState = (ledgers = {}) => {
  const nextLedgers = Object.fromEntries(
    Object.entries(ledgers || {}).map(([partnerId, records]) => [
      String(partnerId || '').trim(),
      (Array.isArray(records) ? records : [])
        .map((record) => normalizeLedgerRecord(record))
        .sort((left, right) => new Date(left?.date || 0).getTime() - new Date(right?.date || 0).getTime()),
    ]).filter(([partnerId]) => partnerId),
  );

  writePartnerLedgerStateStore({ ledgers: nextLedgers });
  return nextLedgers;
};

const listPartnerLedgerState = (partnerId = null) => {
  const store = readPartnerLedgerStateStore();
  if (partnerId === null || typeof partnerId === 'undefined') {
    return store.ledgers;
  }

  const safePartnerId = String(partnerId);
  return store.ledgers[safePartnerId] || [];
};

const queuePartnerReceipt = ({ partnerId, partnerName, record }) => {
  const store = readPartnerReceiptsStore();
  const nextReceipt = normalizeQueuedReceipt({ partnerId, partnerName, record });
  const existingIndex = store.receipts.findIndex((item) => item.syncId === nextReceipt.syncId);

  if (existingIndex >= 0) {
    store.receipts[existingIndex] = nextReceipt;
  } else {
    store.receipts.push(nextReceipt);
  }

  writePartnerReceiptsStore(store);
  upsertPartnerLedgerRecord({
    partnerId: nextReceipt.partnerId,
    record: nextReceipt.record,
  });

  return nextReceipt;
};

const acknowledgePartnerReceipts = (syncIds = []) => {
  const normalizedIds = new Set((Array.isArray(syncIds) ? syncIds : []).map((id) => String(id || '').trim()).filter(Boolean));

  if (!normalizedIds.size) {
    return { removed: 0 };
  }

  const store = readPartnerReceiptsStore();
  const nextReceipts = store.receipts.filter((item) => !normalizedIds.has(String(item.syncId)));
  const removed = store.receipts.length - nextReceipts.length;

  if (removed > 0) {
    writePartnerReceiptsStore({ receipts: nextReceipts });
  }

  return { removed };
};

const normalizePartnerMessage = ({ partnerId, partnerName, text, sentAt }) => {
  const safePartnerId = String(partnerId || '').trim();
  const normalizedText = String(text || '').trim();

  if (!safePartnerId || !normalizedText) {
    throw new Error('بيانات الرسالة غير صالحة.');
  }

  return {
    partnerId: safePartnerId,
    partnerName: String(partnerName || `فرد ${safePartnerId}`).trim(),
    text: normalizedText,
    sentAt: sentAt || new Date().toISOString(),
    sender: 'admin',
  };
};

const savePartnerMessage = (message) => {
  const store = readPartnerMessagesStore();
  const nextMessage = {
    ...normalizePartnerMessage(message),
    sender: message?.sender === 'partner' ? 'partner' : 'admin',
  };
  const key = String(nextMessage.partnerId);
  const currentEntry = store.messages[key] && typeof store.messages[key] === 'object'
    ? store.messages[key]
    : null;
  
  const currentThread = Array.isArray(currentEntry?.thread) ? currentEntry.thread : [];
  const nextThreadEntry = {
    id: Number(message?.id) || Date.now(),
    sender: nextMessage.sender,
    text: nextMessage.text,
    sentAt: nextMessage.sentAt,
  };

  const updatedEntry = {
    ...nextMessage,
    thread: [...currentThread, nextThreadEntry].slice(-50),
  };

  store.messages[key] = updatedEntry;
  writePartnerMessagesStore(store);

  broadcastAdminEvent('message-updated', { message: updatedEntry, updatedAt: new Date().toISOString() });
  broadcastPartnerEvent(nextMessage.partnerId, 'message-updated', { message: updatedEntry, updatedAt: new Date().toISOString() });
  return updatedEntry;
};

const getPartnerMessage = (partnerId) => {
  const store = readPartnerMessagesStore();
  const key = String(partnerId || '').trim();
  const entry = store.messages[key] || null;
  if (!entry) return null;

  if (Array.isArray(entry.thread)) return entry;

  return {
    ...entry,
    thread: entry.text ? [{
      id: Date.now(),
      sender: entry.sender || 'admin',
      text: entry.text,
      sentAt: entry.sentAt || new Date().toISOString()
    }] : []
  };
};

const clearPartnerMessage = (partnerId) => {
  const store = readPartnerMessagesStore();
  const key = String(partnerId || '').trim();
  if (store.messages[key]) {
    delete store.messages[key];
    writePartnerMessagesStore(store);
    return { ok: true, removed: true };
  }
  return { ok: true, removed: false };
};


const normalizeEditRequest = (payload = {}) => {
  const safePartnerId = String(payload?.partnerId || '').trim();
  const safeRecordId = Number(payload?.recordId);
  const safeRequestId = Number(payload?.id) || Date.now();

  if (!safePartnerId || !safeRecordId) {
    throw new Error('بيانات طلب المراجعة غير صالحة.');
  }

  return {
    id: safeRequestId,
    partnerId: safePartnerId,
    partnerName: String(payload?.partnerName || `فرد ${safePartnerId}`).trim(),
    recordId: safeRecordId,
    oldAmount: Number(payload?.oldAmount) || 0,
    newAmount: Number(payload?.newAmount) || 0,
    note: String(payload?.note || '').trim(),
    status: payload?.status || 'pending',
    createdAt: payload?.createdAt || payload?.date || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: payload?.resolvedAt || null,
  };
};

const saveEditRequest = (payload) => {
  const store = readEditRequestsStore();
  const nextRequest = normalizeEditRequest(payload);
  const existingIndex = store.requests.findIndex((item) => Number(item?.id) === nextRequest.id);

  if (existingIndex >= 0) {
    store.requests[existingIndex] = {
      ...store.requests[existingIndex],
      ...nextRequest,
    };
  } else {
    store.requests.push(nextRequest);
  }

  writeEditRequestsStore(store);
  return nextRequest;
};

const listEditRequests = (partnerId = null) => {
  const store = readEditRequestsStore();
  if (partnerId === null || typeof partnerId === 'undefined') {
    return store.requests;
  }

  const safePartnerId = Number(partnerId);
  if (!safePartnerId) {
    throw new Error('رقم الشريك غير صالح.');
  }

  return store.requests.filter((request) => Number(request?.partnerId) === safePartnerId);
};

const resolveEditRequest = ({ id, status }) => {
  const safeRequestId = Number(id);
  if (!safeRequestId) {
    throw new Error('رقم طلب المراجعة غير صالح.');
  }

  const nextStatus = status === 'approved' ? 'approved' : 'rejected';
  const store = readEditRequestsStore();
  const existingIndex = store.requests.findIndex((item) => Number(item?.id) === safeRequestId);

  if (existingIndex < 0) {
    return null;
  }

  const resolvedRequest = {
    ...store.requests[existingIndex],
    status: nextStatus,
    resolvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.requests[existingIndex] = resolvedRequest;
  writeEditRequestsStore(store);
  return resolvedRequest;
};

const normalizePinResetRequest = (payload = {}) => {
  const safePartnerId = Number(payload?.partnerId);
  const safeRequestId = Number(payload?.id) || Date.now();

  if (!safePartnerId) {
    throw new Error('رقم الشريك غير صالح.');
  }

  return {
    id: safeRequestId,
    partnerId: safePartnerId,
    partnerName: String(payload?.partnerName || `فرد ${safePartnerId}`).trim(),
    partnerRole: String(payload?.partnerRole || 'الفرد').trim(),
    sourceLabel: String(payload?.sourceLabel || '').trim(),
    status: payload?.status || 'pending',
    createdAt: payload?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: payload?.resolvedAt || null,
  };
};

const savePinResetRequest = (payload) => {
  const store = readPinResetRequestsStore();
  const nextRequest = normalizePinResetRequest(payload);
  const existingIndex = store.requests.findIndex((item) => Number(item?.id) === nextRequest.id);

  if (existingIndex >= 0) {
    store.requests[existingIndex] = {
      ...store.requests[existingIndex],
      ...nextRequest,
    };
  } else {
    store.requests.push(nextRequest);
  }

  writePinResetRequestsStore(store);
  return nextRequest;
};

const listPinResetRequests = () => {
  const store = readPinResetRequestsStore();
  return store.requests;
};

const resolvePinResetRequest = ({ id }) => {
  const safeRequestId = Number(id);
  if (!safeRequestId) {
    throw new Error('رقم طلب إعادة التعيين غير صالح.');
  }

  const store = readPinResetRequestsStore();
  const existingIndex = store.requests.findIndex((item) => Number(item?.id) === safeRequestId);

  if (existingIndex < 0) {
    return null;
  }

  const resolvedRequest = {
    ...store.requests[existingIndex],
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.requests[existingIndex] = resolvedRequest;
  writePinResetRequestsStore(store);
  return resolvedRequest;
};

const dataUrlToBlob = (dataUrl) => {
  const [meta, base64] = String(dataUrl || '').split(',');
  const mimeType = meta?.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const binary = Buffer.from(base64 || '', 'base64');
  return {
    blob: new Blob([binary], { type: mimeType }),
    mimeType,
  };
};

const graphRequest = async (pathname, options = {}) => {
  const { accessToken } = getWhatsAppConfig();
  const response = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  const rawText = await response.text();
  let payload = {};

  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    payload = { rawText };
  }

  if (!response.ok) {
    const apiMessage = payload?.error?.message || 'فشل الطلب إلى واتساب.';
    throw new Error(apiMessage);
  }

  return payload;
};

const uploadReceiptMedia = async (imageDataUrl, fileName = `receipt-${Date.now()}.jpg`) => {
  const { phoneNumberId } = getWhatsAppConfig();
  const { blob, mimeType } = dataUrlToBlob(imageDataUrl);
  const form = new FormData();

  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', blob, fileName);

  const payload = await graphRequest(`/${phoneNumberId}/media`, {
    method: 'POST',
    body: form,
  });

  if (!payload?.id) {
    throw new Error('تعذر رفع صورة الإيصال إلى واتساب.');
  }

  return payload.id;
};

const sendTextMessage = async ({ to, body }) => {
  const { phoneNumberId } = getWhatsAppConfig();
  return graphRequest(`/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body,
      },
    }),
  });
};

const sendImageMessage = async ({ to, mediaId, caption }) => {
  const { phoneNumberId } = getWhatsAppConfig();
  return graphRequest(`/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        id: mediaId,
        caption,
      },
    }),
  });
};

const ensureConfigured = () => {
  const missing = getMissingConfig();
  if (missing.length > 0) {
    const error = new Error(`إعداد واتساب المباشر غير مكتمل: ${missing.join(', ')}`);
    error.statusCode = 503;
    error.details = { missing };
    throw error;
  }
};

const ensureTelegramConfigured = () => {
  const config = getTelegramConfig();
  const missing = Object.entries({
    TELEGRAM_BOT_TOKEN: config.botToken,
    TELEGRAM_CHAT_ID: config.chatId,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    const error = new Error(`إعداد تلجرام غير مكتمل: ${missing.join(', ')}`);
    error.statusCode = 503;
    error.details = { missing };
    throw error;
  }

  return config;
};

const resolveStaticFilePath = (pathname) => {
  const decodedPath = decodeURIComponent(pathname || '/');
  const cleanPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const candidatePath = path.resolve(STATIC_ROOT, `.${cleanPath}`);

  if (!candidatePath.startsWith(STATIC_ROOT)) {
    return null;
  }

  if (existsSync(candidatePath)) {
    try {
      if (statSync(candidatePath).isFile()) {
        return candidatePath;
      }
    } catch (error) {
      return null;
    }
  }

  const spaFallback = path.resolve(STATIC_ROOT, 'index.html');
  if (existsSync(spaFallback)) {
    return spaFallback;
  }

  return null;
};

const serveStaticResponse = (pathname, response) => {
  if (!existsSync(STATIC_ROOT)) {
    return false;
  }

  const filePath = resolveStaticFilePath(pathname);
  if (!filePath) {
    return false;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';
  const cacheControl = path.basename(filePath) === 'index.html'
    ? 'no-cache'
    : 'public, max-age=31536000, immutable';

  response.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
  });
  response.end(readFileSync(filePath));
  return true;
};

const handleStatus = (response) => {
  const config = getWhatsAppConfig();
  const telegramConfig = getTelegramConfig();
  const missing = getMissingConfig();
  const receiptStore = readPartnerReceiptsStore();
  const editRequestStore = readEditRequestsStore();
  const pinResetRequestStore = readPinResetRequestsStore();

  sendJson(response, 200, {
    ok: true,
    configured: missing.length === 0,
    missing,
    telegramConfigured: Boolean(telegramConfig.botToken && telegramConfig.chatId),
    businessAccountConfigured: Boolean(config.businessAccountId),
    adminNumber: config.adminNumber,
    apiVersion: WHATSAPP_API_VERSION,
    queuedPartnerReceipts: receiptStore.receipts.length,
    queuedPartnerMessages: Object.keys(readPartnerMessagesStore().messages || {}).length,
    pendingEditRequests: editRequestStore.requests.filter((request) => request.status === 'pending').length,
    pendingPinResetRequests: pinResetRequestStore.requests.filter((request) => request.status === 'pending').length,
  });
};

const buildTelegramReceiptCaption = (receipt = {}) => {
  const createdAt = receipt?.createdAt ? new Date(receipt.createdAt) : new Date();
  const note = String(receipt?.note || '').trim() || 'لا توجد ملاحظة';
  return [
    '🧾 إيصال جديد من الشريك',
    '',
    `👤 الشريك: ${receipt?.partnerName || 'غير محدد'}`,
    `💰 المبلغ: ${Number(receipt?.amount) || 0} ريال`,
    `📝 الملاحظة: ${note}`,
    `🆔 رقم الإيصال: ${receipt?.id || receipt?.receiptId || 'غير متوفر'}`,
    `📅 التاريخ: ${createdAt.toISOString()}`,
    '',
    'الحالة: بانتظار التأكيد',
  ].join('\n');
};

const sendTelegramPhoto = async ({ receipt }) => {
  const { botToken, chatId } = ensureTelegramConfigured();
  const photo = String(receipt?.imageUrl || '').trim();

  if (!photo) {
    throw new Error('رابط صورة الإيصال غير متوفر.');
  }

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', buildTelegramReceiptCaption(receipt));
  formData.append('parse_mode', 'Markdown');

  const threadId = receipt?.message_thread_id || receipt?.telegramTopicId || receipt?.topicId;
  const isNumericThread = (id) => id && !isNaN(id) && Number(id) !== 0;
  if (isNumericThread(threadId)) {
    formData.append('message_thread_id', threadId);
  }

  if (photo.startsWith('data:')) {
    const base64Data = photo.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('photo', blob, 'receipt.jpg');
  } else {
    formData.append('photo', photo);
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description || 'فشل إرسال الإيصال إلى تلجرام.');
  }

  return {
    telegramMessageId: payload?.result?.message_id || null,
    telegramRaw: payload,
  };
};

const sendTelegramMessage = async ({ text, chatId: overrideChatId = null, messageThreadId = null, imageDataUrl = null }) => {
  const { botToken, chatId: defaultChatId } = ensureTelegramConfigured();
  const chatId = overrideChatId || defaultChatId;
  
  const hasImage = imageDataUrl && imageDataUrl.startsWith('data:image');
  const method = hasImage ? 'sendPhoto' : 'sendMessage';
  const url = `https://api.telegram.org/bot${botToken}/${method}`;

  let response;
  if (hasImage) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', text);
    formData.append('parse_mode', 'Markdown');
    if (messageThreadId) formData.append('message_thread_id', messageThreadId);

    const base64Data = imageDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('photo', blob, 'receipt.jpg');

    response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
  } else {
    const params = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };
    if (messageThreadId) params.message_thread_id = messageThreadId;

    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description || 'فشل إرسال الرسالة إلى تلجرام.');
  }

  return { telegramMessageId: payload?.result?.message_id || null, telegramRaw: payload };
};

const handleSendTelegramMessage = async (request, response) => {
  const payload = await parseRequestBody(request);
  const text = String(payload?.text || '').trim();
  if (!text) throw new Error('نص الرسالة فارغ.');

  const result = await sendTelegramMessage({
    text,
    chatId: payload?.chatId || payload?.chat_id || null,
    messageThreadId: payload?.messageThreadId || payload?.message_thread_id || null,
    imageDataUrl: payload?.imageDataUrl || null,
  });
  sendJson(response, 200, { ok: true, ...result });
};

const handleSendTelegramDocument = async (request, response) => {
  const payload = await parseRequestBody(request);
  const config = getTelegramConfig();
  const botToken = payload.botToken || config.botToken;
  const chatId = payload.chatId || config.chatId;

  if (!botToken || !chatId) {
    throw new Error('إعدادات تلجرام غير مكتملة (البوت أو المحادثة مفقودة).');
  }
  const caption = payload.caption || '';
  const messageThreadId = payload.messageThreadId || null;
  const fileName = payload.fileName || 'document.pdf';
  const base64Data = payload.base64Data;

  if (!base64Data) throw new Error('بيانات الملف مفقودة.');

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  if (messageThreadId) formData.append('message_thread_id', messageThreadId);

  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: 'application/pdf' });
  formData.append('document', blob, fileName);

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.description || 'فشل إرسال الملف إلى تلجرام.');
  }

  sendJson(response, 200, { ok: true, result: data.result });
};

const handleAdminEvents = (request, response) => {
  registerEventClient(request, response, adminEventClients, { scope: 'admin', connectedAt: new Date().toISOString() });
};

const handlePartnerEvents = (request, url, response) => {
  const partnerId = url.searchParams.get('partnerId');

  if (!partnerId) {
    throw new Error('رقم الشريك غير صالح.');
  }

  if (isPartnerDisabled(partnerId)) {
    sendJson(response, 403, { ok: false, message: 'هذا الحساب معطل حالياً من قبل الإدارة.' });
    return;
  }

  registerPartnerEventClient(request, response, partnerId);
};

const handleSendReceipt = async (request, response) => {
  ensureConfigured();
  const payload = await parseRequestBody(request);
  const { adminNumber } = getWhatsAppConfig();
  const to = normalizePhone(payload.to || adminNumber);
  const caption = String(payload.caption || '').trim();
  const detailsBody = String(payload.detailsBody || '').trim();

  if (!to) {
    throw new Error('رقم واتساب المستلم غير صالح.');
  }

  if (payload.imageDataUrl) {
    const mediaId = await uploadReceiptMedia(payload.imageDataUrl, payload.imageName);
    const imageResult = await sendImageMessage({ to, mediaId, caption });
    let textResult = null;

    if (detailsBody) {
      textResult = await sendTextMessage({ to, body: detailsBody });
    }

    sendJson(response, 200, { ok: true, mode: 'image+text', imageResult, textResult });
    return;
  }

  const result = await sendTextMessage({ to, body: detailsBody || caption });
  sendJson(response, 200, { ok: true, mode: 'text', result });
};

const handleSendEditRequest = async (request, response) => {
  ensureConfigured();
  const payload = await parseRequestBody(request);
  const { adminNumber } = getWhatsAppConfig();
  const to = normalizePhone(payload.to || adminNumber);
  const body = String(payload.body || '').trim();

  if (!to) {
    throw new Error('رقم واتساب المستلم غير صالح.');
  }

  if (!body) {
    throw new Error('نص الرسالة فارغ.');
  }

  const result = await sendTextMessage({ to, body });
  sendJson(response, 200, { ok: true, mode: 'text', result });
};

const handleSendTelegramReceipt = async (request, response) => {
  const payload = await parseRequestBody(request);
  const receipt = payload?.receipt;

  if (!receipt || typeof receipt !== 'object') {
    throw new Error('بيانات الإيصال غير صالحة.');
  }

  const result = await sendTelegramPhoto({ 
    receipt: {
      ...receipt,
      message_thread_id: payload?.message_thread_id || payload?.telegramTopicId || receipt?.telegramTopicId
    } 
  });
  sendJson(response, 200, {
    ok: true,
    ...result,
  });
};

const handleQueuePartnerReceiptWithBody = async (request, response, payload) => {
  if (payload?.action === 'ack') {
    const result = acknowledgePartnerReceipts(payload.syncIds);
    sendJson(response, 200, {
      ok: true,
      ...result,
    });
    return;
  }

  const partnerId = Number(payload.partnerId);
  const record = payload.record;

  if (!partnerId || !record || typeof record !== 'object') {
    throw new Error('بيانات الإيصال غير صالحة.');
  }

  if ((Number(record.amount) || 0) <= 0) {
    throw new Error('مبلغ الإيصال غير صالح.');
  }

  const queuedReceipt = queuePartnerReceipt({
    partnerId,
    partnerName: payload.partnerName,
    record,
  });

  broadcastAdminEvent('receipt-queued', {
    receipt: queuedReceipt,
    queuedAt: new Date().toISOString(),
  });

  sendJson(response, 200, {
    ok: true,
    receipt: queuedReceipt,
  });
};

const handleListPartnerReceipts = (response) => {
  const store = readPartnerReceiptsStore();
  sendJson(response, 200, {
    ok: true,
    receipts: store.receipts,
  });
};

const handleAcknowledgePartnerReceipts = async (request, response) => {
  const payload = await parseRequestBody(request);
  const result = acknowledgePartnerReceipts(payload.syncIds);
  sendJson(response, 200, {
    ok: true,
    ...result,
  });
};

const handleGetLedgerState = (url, response) => {
  const rawPartnerId = url.searchParams.get('partnerId');
  const partnerId = rawPartnerId ? String(rawPartnerId) : null;
  const ledgers = listPartnerLedgerState(partnerId);

  sendJson(response, 200, {
    ok: true,
    ledgers,
  });
};

const handleSyncLedgerState = async (request, response) => {
  const payload = await parseRequestBody(request);

  if (payload?.action === 'upsertRecord') {
    const record = upsertPartnerLedgerRecord({
      partnerId: payload.partnerId,
      record: payload.record,
    });

    broadcastPartnerEvent(payload.partnerId, 'ledger-updated', {
      partnerId: Number(payload.partnerId),
      record,
      updatedAt: new Date().toISOString(),
    });

    sendJson(response, 200, {
      ok: true,
      record,
    });
    return;
  }

  const ledgers = replacePartnerLedgerState(payload.ledgers);
  const partnerIds = Object.keys(ledgers);

  partnerIds.forEach((partnerId) => {
    broadcastPartnerEvent(partnerId, 'ledger-updated', {
      partnerId: Number(partnerId),
      updatedAt: new Date().toISOString(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    partnerCount: partnerIds.length,
  });
};

const handleUpdateReceiptStatus = async (request, response) => {
  const payload = await parseRequestBody(request);
  const { receiptId, status } = payload;
  
  console.log(`[Backend] Updating receipt ${receiptId} to status: ${status}`);

  if (!receiptId || !status) throw new Error('بيانات تحديث الحالة غير كاملة.');

  const store = readPartnerLedgerStateStore();
  let foundPartnerId = null;
  let updatedRecord = null;

  Object.keys(store.ledgers).forEach(partnerId => {
    const index = store.ledgers[partnerId].findIndex(r => String(r.id) === String(receiptId));
    if (index >= 0) {
      console.log(`[Backend] Found receipt ${receiptId} in partner ${partnerId} ledger.`);
      store.ledgers[partnerId][index].status = status;
      store.ledgers[partnerId][index].updatedAt = new Date().toISOString();
      foundPartnerId = partnerId;
      updatedRecord = store.ledgers[partnerId][index];
    }
  });

  if (foundPartnerId) {
    writePartnerLedgerStateStore(store);
    console.log(`[Backend] Persisted ledger state for partner ${foundPartnerId}`);
    broadcastPartnerEvent(foundPartnerId, 'ledger-updated', {
      partnerId: foundPartnerId,
      record: updatedRecord,
      updatedAt: new Date().toISOString(),
    });
    sendJson(response, 200, { ok: true });
  } else {
    sendJson(response, 404, { ok: false, message: 'الإيصال غير موجود.' });
  }
};

const handleConfirmAllReceipts = async (request, response) => {
  const payload = await parseRequestBody(request);
  const { partnerId } = payload;
  if (!partnerId) throw new Error('رقم الشريك مطلوب.');

  const store = readPartnerLedgerStateStore();
  const partnerKey = String(partnerId);
  if (!store.ledgers[partnerKey]) {
    sendJson(response, 404, { ok: false, message: 'لا توجد إيصالات لهذا الشريك.' });
    return;
  }

  store.ledgers[partnerKey] = store.ledgers[partnerKey].map(r => 
    r.status === 'pending' ? { ...r, status: 'approved', updatedAt: new Date().toISOString() } : r
  );

  writePartnerLedgerStateStore(store);
  
  console.log(`[Server] Broadcast 'ledger-updated' for partner: ${partnerKey}`);
  broadcastPartnerEvent(partnerKey, 'ledger-updated', {
    partnerId: partnerKey,
    updatedAt: new Date().toISOString(),
  });

  sendJson(response, 200, { ok: true });
};

const handleGetEditRequests = (url, response) => {
  const rawPartnerId = url.searchParams.get('partnerId');
  const partnerId = rawPartnerId ? String(rawPartnerId) : null;
  const requests = listEditRequests(partnerId);

  sendJson(response, 200, {
    ok: true,
    requests,
  });
};

const handleSyncEditRequestWithBody = async (request, response, payload) => {

  if (payload?.action === 'resolve') {
    const resolvedRequest = resolveEditRequest(payload);

    if (!resolvedRequest) {
      sendJson(response, 404, { ok: false, message: 'طلب المراجعة غير موجود.' });
      return;
    }

    broadcastAdminEvent('edit-request-updated', {
      request: resolvedRequest,
      updatedAt: new Date().toISOString(),
    });

    broadcastPartnerEvent(resolvedRequest.partnerId, 'edit-request-updated', {
      request: resolvedRequest,
      updatedAt: new Date().toISOString(),
    });

    sendJson(response, 200, {
      ok: true,
      request: resolvedRequest,
    });
    return;
  }

  const savedRequest = saveEditRequest(payload);

  broadcastAdminEvent('edit-request-updated', {
    request: savedRequest,
    updatedAt: new Date().toISOString(),
  });

  broadcastPartnerEvent(savedRequest.partnerId, 'edit-request-updated', {
    request: savedRequest,
    updatedAt: new Date().toISOString(),
  });

  sendJson(response, 200, {
    ok: true,
    request: savedRequest,
  });
};

const handleGetPinResetRequests = (response) => {
  sendJson(response, 200, {
    ok: true,
    requests: listPinResetRequests(),
  });
};

const handleSyncPinResetRequestWithBody = async (request, response, payload) => {

  if (payload?.action === 'resolve') {
    const resolvedRequest = resolvePinResetRequest(payload);

    if (!resolvedRequest) {
      sendJson(response, 404, { ok: false, message: 'طلب إعادة التعيين غير موجود.' });
      return;
    }

    broadcastAdminEvent('pin-reset-request', {
      request: resolvedRequest,
      updatedAt: new Date().toISOString(),
    });

    sendJson(response, 200, {
      ok: true,
      request: resolvedRequest,
    });
    return;
  }

  const savedRequest = savePinResetRequest(payload);

  broadcastAdminEvent('pin-reset-request', {
    request: savedRequest,
    updatedAt: new Date().toISOString(),
  });

  sendJson(response, 200, {
    ok: true,
    request: savedRequest,
  });
};

const handleSavePartnerMessage = async (request, response) => {
  const payload = await parseRequestBody(request);
  if (payload?.action === 'clear') {
    const result = clearPartnerMessage(payload.partnerId);

    if (result.removed) {
      broadcastAdminEvent('message-cleared', {
        partnerId: Number(payload.partnerId),
        clearedAt: new Date().toISOString(),
      });
      broadcastPartnerEvent(payload.partnerId, 'message-cleared', {
        partnerId: Number(payload.partnerId),
        clearedAt: new Date().toISOString(),
      });
    }

    sendJson(response, 200, {
      ok: true,
      ...result,
    });
    return;
  }

  const message = savePartnerMessage(payload);

  sendJson(response, 200, {
    ok: true,
    message,
  });
};

const handleGetPartnerMessage = (url, response) => {
  const partnerId = url.searchParams.get('partnerId');
  if (!partnerId) throw new Error('رقم الشريك مطلوب.');
  sendJson(response, 200, { ok: true, message: getPartnerMessage(partnerId) });
};

const handleSyncPartnerMessageWithBody = async (request, response, payload) => {
  const updatedMessage = savePartnerMessage(payload);
  sendJson(response, 200, { ok: true, message: updatedMessage });
};

// --- Settings Handlers ---
const handleGetSettings = (request, response) => {
  const settings = readGlobalSettingsStore();
  sendJson(response, 200, { ok: true, settings: settings || {} });
};

const handleSaveSettings = async (request, response) => {
  const payload = await parseRequestBody(request);
  if (!payload || typeof payload !== 'object') {
    throw new Error('بيانات الإعدادات غير صالحة.');
  }
  writeGlobalSettingsStore(payload);
  sendJson(response, 200, { ok: true });
};

const handleGetAbdalalemLedger = (response) => {
  try {
    if (STORE_CACHE.has('abdalalem')) {
      sendJson(response, 200, { ok: true, entries: STORE_CACHE.get('abdalalem').entries || [] });
      return;
    }
    if (!existsSync(ABDALALEM_LEDGER_FILE)) {
      sendJson(response, 200, { ok: true, entries: [] });
      return;
    }
    const data = JSON.parse(readFileSync(ABDALALEM_LEDGER_FILE, 'utf8'));
    STORE_CACHE.set('abdalalem', data);
    sendJson(response, 200, { ok: true, entries: data.entries || [] });
  } catch (e) {
    sendJson(response, 500, { ok: false, error: e.message });
  }
};

const handleUpdateAbdalalemLedger = async (request, response) => {
  const payload = await parseRequestBody(request);
  try {
    const data = { entries: payload.entries || [] };
    STORE_CACHE.set('abdalalem', data);
    writeFileSync(ABDALALEM_LEDGER_FILE, JSON.stringify(data));
    sendJson(response, 200, { ok: true });
  } catch (e) {
    sendJson(response, 500, { ok: false, error: e.message });
  }
};

const handleClearPartnerMessage = async (request, response) => {
  const payload = await parseRequestBody(request);
  const result = clearPartnerMessage(payload.partnerId);

  if (result.removed) {
    broadcastAdminEvent('message-cleared', {
      partnerId: Number(payload.partnerId),
      clearedAt: new Date().toISOString(),
    });
    broadcastPartnerEvent(payload.partnerId, 'message-cleared', {
      partnerId: Number(payload.partnerId),
      clearedAt: new Date().toISOString(),
    });
  }

  sendJson(response, 200, {
    ok: true,
    ...result,
  });
};

export const handleRequest = async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { ok: false, message: 'المسار غير موجود.' });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end();
    return;
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    console.log(`[Backend] ${request.method} ${url.pathname} from ${request.headers.origin || 'unknown'}`);

    if (request.method === 'GET' && url.pathname === '/api/whatsapp/status') {
      handleStatus(response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/events/admin') {
      handleAdminEvents(request, response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/events/partner') {
      handlePartnerEvents(request, url, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/whatsapp/send-receipt') {
      await handleSendReceipt(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/whatsapp/send-edit-request') {
      await handleSendEditRequest(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/telegram/send-receipt') {
      await handleSendTelegramReceipt(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/telegram/send-message') {
      await handleSendTelegramMessage(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/telegram/send-document') {
      await handleSendTelegramDocument(request, response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/receipts') {
      handleListPartnerReceipts(response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/receipts') {
      const body = await parseRequestBody(request);
      if (body.partnerId && isPartnerDisabled(body.partnerId)) {
        sendJson(response, 403, { ok: false, message: 'تم إيقاف صلاحية الوصول لهذا الرابط.' });
        return;
      }
      await handleQueuePartnerReceiptWithBody(request, response, body);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/receipts/ack') {
      await handleAcknowledgePartnerReceipts(request, response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/abdalalem-ledger') {
      handleGetAbdalalemLedger(response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/abdalalem-ledger') {
      handleUpdateAbdalalemLedger(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/clear-all-ledgers') {
      const data = await readData(LEDGERS_FILE);
      // Clear all keys
      await writeData(LEDGERS_FILE, {});
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/ledger-state') {
      const partnerId = url.searchParams.get('partnerId');
      if (partnerId && isPartnerDisabled(partnerId)) {
        sendJson(response, 403, { ok: false, message: 'تم إيقاف صلاحية الوصول لهذا الرابط.' });
        return;
      }
      handleGetLedgerState(url, response);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/partner-messages') {
      const partnerId = url.searchParams.get('partnerId');
      if (partnerId && isPartnerDisabled(partnerId)) {
        sendJson(response, 403, { ok: false, message: 'تم إيقاف صلاحية الوصول لهذا الرابط.' });
        return;
      }
      const data = await readData(PARTNER_MESSAGES_FILE);
      const allMessages = data?.messages || {};
      const result = partnerId ? (allMessages[partnerId] || null) : allMessages;
      sendJson(response, 200, { ok: true, messages: result });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/ledger-state') {
      await handleSyncLedgerState(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/receipt-status') {
      await handleUpdateReceiptStatus(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/receipts/confirm-all') {
      await handleConfirmAllReceipts(request, response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/edit-requests') {
      const partnerId = url.searchParams.get('partnerId');
      if (partnerId && isPartnerDisabled(partnerId)) {
        sendJson(response, 403, { ok: false, message: 'تم إيقاف صلاحية الوصول لهذا الرابط.' });
        return;
      }
      handleGetEditRequests(url, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/edit-requests') {
      const body = await parseRequestBody(request);
      if (body.partnerId && isPartnerDisabled(body.partnerId)) {
        sendJson(response, 403, { ok: false, message: 'تم إيقاف صلاحية الوصول لهذا الرابط.' });
        return;
      }
      await handleSyncEditRequestWithBody(request, response, body);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/pin-reset-requests') {
      handleGetPinResetRequests(response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/pin-reset-requests') {
      const body = await parseRequestBody(request);
      if (body.partnerId && isPartnerDisabled(body.partnerId)) {
        sendJson(response, 403, { ok: false, message: 'تم إيقاف صلاحية الوصول لهذا الرابط.' });
        return;
      }
      await handleSyncPinResetRequestWithBody(request, response, body);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/messages') {
      const partnerId = url.searchParams.get('partnerId');
      if (partnerId && isPartnerDisabled(partnerId)) {
        sendJson(response, 403, { ok: false, message: 'تم إيقاف صلاحية الوصول لهذا الرابط.' });
        return;
      }
      handleGetPartnerMessage(url, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/messages') {
      const body = await parseRequestBody(request);
      if (body.partnerId && isPartnerDisabled(body.partnerId)) {
        sendJson(response, 403, { ok: false, message: 'تم إيقاف صلاحية الوصول لهذا الرابط.' });
        return;
      }
      await handleSyncPartnerMessageWithBody(request, response, body);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/partner/messages') {
      handleGetPartnerMessage(url, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/partner/messages/ack') {
      await handleClearPartnerMessage(request, response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/settings') {
      handleGetSettings(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/settings') {
      await handleSaveSettings(request, response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/partner-access') {
      sendJson(response, 200, readPartnerAccessStore());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/partner-access') {
      const body = await parseRequestBody(request);
      const { partnerId, disabled } = body;
      const store = readPartnerAccessStore();
      const id = String(partnerId);
      
      if (disabled) {
        if (!store.disabledIds.includes(id)) store.disabledIds.push(id);
      } else {
        store.disabledIds = store.disabledIds.filter(d => d !== id);
      }
      
      writePartnerAccessStore(store);
      broadcastAdminEvent('partner-access-updated', store);
      // Notify the specific partner if they are connected
      broadcastPartnerEvent(partnerId, 'access-revoked', { disabled });
      
      sendJson(response, 200, { ok: true, ...store });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, getHealthPayload());
      return;
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && !url.pathname.startsWith('/api/')) {
      if (serveStaticResponse(url.pathname, response)) {
        return;
      }
    }

    sendJson(response, 404, { ok: false, message: 'المسار غير موجود.' });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      ok: false,
      message: error.message || 'حدث خطأ غير متوقع.',
      ...(error.details || {}),
    });
  }
};

export default handleRequest;
