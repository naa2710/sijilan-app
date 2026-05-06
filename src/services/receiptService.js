import { 
  fetchPartnerLedgerStateFromServer, 
  upsertPartnerLedgerRecordOnServer,
  queueReceiptForAdmin
} from '../utils/adminSync';
import { 
  RECEIPT_STATUSES, 
  TELEGRAM_STATUSES, 
  normalizeReceiptStatus 
} from '../utils/receiptStatus';

export const normalizeReceiptDocument = (id, raw = {}) => ({
  id,
  partnerId: String(raw?.partnerId || ''),
  partnerName: String(raw?.partnerName || '').trim(),
  amount: Number(raw?.amount) || 0,
  note: String(raw?.note || '').trim(),
  imageUrl: String(raw?.imageUrl || ''),
  imagePath: String(raw?.imagePath || ''),
  imageName: String(raw?.imageName || ''),
  imageType: String(raw?.imageType || ''),
  source: raw?.source || 'partner',
  status: normalizeReceiptStatus(raw?.status),
  telegramStatus: raw?.telegramStatus || TELEGRAM_STATUSES.pending,
  telegramMessageId: raw?.telegramMessageId || null,
  telegramError: raw?.telegramError || null,
  createdAt: raw?.createdAt || new Date().toISOString(),
  updatedAt: raw?.updatedAt || new Date().toISOString(),
  date: raw?.date || raw?.createdAt || new Date().toISOString(),
});

export const buildReceiptId = () => `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const groupReceiptsByPartner = (receipts = []) => (
  receipts.reduce((acc, receipt) => {
    const partnerKey = String(receipt?.partnerId || '');
    if (!partnerKey) return acc;
    acc[partnerKey] = [...(acc[partnerKey] || []), receipt].sort(
      (left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime(),
    );
    return acc;
  }, {})
);

// Firebase is disabled, using server polling or events instead
export const subscribeToPartnerReceipts = (partnerId, onChange, onError) => {
    console.warn('Realtime Firebase subscription disabled. Relying on polling/events.');
    // Return a dummy unsubscribe function
    return () => {};
};

export const subscribeToAllReceipts = (onChange, onError) => {
    console.warn('Realtime Firebase subscription disabled. Relying on polling/events.');
    return () => {};
};

export const updateReceiptStatus = async (receiptId, status) => {
    // This is typically handled via upsertPartnerLedgerRecordOnServer in this version
    console.warn('updateReceiptStatus: Direct Firebase update disabled.');
};

export const updateReceiptFields = async (receiptId, fields = {}) => {
    console.warn('updateReceiptFields: Direct Firebase update disabled.');
};

export const submitPartnerReceipt = async ({
  partnerId,
  partnerName,
  amount,
  note = '',
  receiptImage,
  telegramTopicId = '',
  status,
}) => {
  const safeAmount = Number(amount);
  if (!receiptImage?.dataUrl) {
    throw new Error('يرجى إضافة صورة الإيصال');
  }

  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error('يرجى إدخال مبلغ صحيح');
  }

  const receiptId = buildReceiptId();
  
  const record = {
    id: receiptId,
    partnerId: String(partnerId),
    partnerName: String(partnerName || '').trim(),
    amount: safeAmount,
    note: String(note || '').trim(),
    imageUrl: receiptImage.dataUrl,
    status: status || RECEIPT_STATUSES.pending,
    source: 'partner',
    telegramStatus: TELEGRAM_STATUSES.pending,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Use the admin sync queue
  return queueReceiptForAdmin({ partnerId, partnerName, record });
};
