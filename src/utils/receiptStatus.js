export const RECEIPT_STATUSES = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  frozen: 'frozen',
  review: 'review',
};

export const TELEGRAM_STATUSES = {
  pending: 'pending',
  sent: 'sent',
  failed: 'failed',
};

const LEGACY_STATUS_MAP = {
  confirmed: RECEIPT_STATUSES.approved,
};

export const normalizeReceiptStatus = (status) => (
  LEGACY_STATUS_MAP[String(status || '').trim()] || String(status || '').trim() || RECEIPT_STATUSES.pending
);

export const isReceiptApproved = (receipt = {}) => (
  normalizeReceiptStatus(receipt?.status) === RECEIPT_STATUSES.approved
);

export const getReceiptStatusLabel = (status) => ({
  [RECEIPT_STATUSES.pending]: 'بانتظار التأكيد',
  [RECEIPT_STATUSES.approved]: 'مؤكد',
  [RECEIPT_STATUSES.rejected]: 'مرفوض',
  [RECEIPT_STATUSES.frozen]: 'مجمّد',
  [RECEIPT_STATUSES.review]: 'طلب مراجعة',
}[normalizeReceiptStatus(status)] || 'بانتظار التأكيد');

export const getReceiptStatusTone = (status) => ({
  [RECEIPT_STATUSES.pending]: 'amber',
  [RECEIPT_STATUSES.approved]: 'emerald',
  [RECEIPT_STATUSES.rejected]: 'rose',
  [RECEIPT_STATUSES.frozen]: 'slate',
  [RECEIPT_STATUSES.review]: 'indigo',
}[normalizeReceiptStatus(status)] || 'amber');

export const getTelegramStatusLabel = (status) => ({
  [TELEGRAM_STATUSES.pending]: 'قيد الإرسال',
  [TELEGRAM_STATUSES.sent]: 'تم الإرسال',
  [TELEGRAM_STATUSES.failed]: 'فشل الإرسال',
}[String(status || '').trim()] || 'قيد الإرسال');

export const getTelegramStatusTone = (status) => ({
  [TELEGRAM_STATUSES.pending]: 'amber',
  [TELEGRAM_STATUSES.sent]: 'emerald',
  [TELEGRAM_STATUSES.failed]: 'rose',
}[String(status || '').trim()] || 'amber');
