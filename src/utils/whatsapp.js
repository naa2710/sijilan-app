export const ADMIN_WHATSAPP_NUMBER = String(
  import.meta.env.VITE_WHATSAPP_ADMIN_NUMBER ||
  '967776022245'
).replace(/[^\d]/g, '');

export const normalizeWhatsAppNumber = (value = '') =>
  String(value).replace(/[^\d]/g, '');

export const openWhatsAppChat = (phoneNumber, text) => {
  const normalizedPhone = normalizeWhatsAppNumber(phoneNumber);
  const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.assign(url);
  }
  return url;
};

export const buildReceiptWhatsAppText = ({
  partnerId,
  partnerName,
  partnerGender = 'male',
  receiptId,
  amount,
  note,
  createdAt,
  hasImage = false,
  status = 'confirmed',
}) => {
  const partnerRole = partnerGender === 'female' ? 'الشريكة' : 'الشريك';
  const lines = [
    `إشعار إيصال جديد من ${partnerRole}`,
    `رقم الإيصال: ${receiptId || 'غير محدد'}`,
    `رقم ${partnerRole}: ${partnerId || 'غير محدد'}`,
    `الاسم: ${partnerName}`,
    `إجمالي المبلغ: ${amount} ريال`,
    `التاريخ: ${createdAt}`,
    `الملاحظة: ${note || 'بدون ملاحظة'}`,
    `حالة الإيصال: ${status === 'pending' ? 'بانتظار اعتماد الإدارة' : 'مؤكد'}`,
  ];

  lines.push(`صورة الإيصال: ${hasImage ? 'متاحة داخل التطبيق' : 'غير مرفقة'}`);

  return lines.join('\n');
};

export const buildReceiptWhatsAppCaption = ({
  partnerName,
  partnerGender = 'male',
  receiptId,
  amount,
  note,
}) => {
  const partnerRole = partnerGender === 'female' ? 'الشريكة' : 'الشريك';
  const lines = [
    `إيصال جديد من ${partnerRole} ${partnerName}`,
    `رقم الإيصال: ${receiptId || 'غير محدد'}`,
    `المبلغ: ${amount} ريال`,
  ];

  if (note) {
    lines.push(`الملاحظة: ${note}`);
  }

  return lines.join('\n');
};

export const buildEditRequestWhatsAppText = ({
  partnerName,
  partnerGender = 'male',
  oldAmount,
  newAmount,
  note,
  createdAt,
}) => {
  const partnerRole = partnerGender === 'female' ? 'الشريكة' : 'الشريك';
  const lines = [
    `طلب تعديل إيصال من ${partnerRole}`,
    `الاسم: ${partnerName}`,
    `المبلغ السابق: ${oldAmount} ريال`,
    `المبلغ الجديد: ${newAmount} ريال`,
    `التاريخ: ${createdAt}`,
  ];

  if (note) {
    lines.push(`السبب / البيان: ${note}`);
  }

  return lines.join('\n');
};
