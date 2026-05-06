export const ADMIN_TELEGRAM_USERNAME = 'Sijilati_Admin'; // يرجى تحديث اسم المستخدم هنا

export const openTelegramChat = (text) => {
  const url = `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.assign(url);
  }
  return url;
};

export const buildReceiptTelegramText = ({
  partnerId,
  partnerName,
  partnerGender = 'male',
  receiptId,
  amount,
  note,
  createdAt,
  hasImage = false,
  status = 'confirmed',
  summary = null, // Optional summary details
}) => {
  const partnerRole = partnerGender === 'female' ? 'الشريكة' : 'الشريك';
  const lines = [
    `📩 *إشعار إيصال جديد من ${partnerRole}*`,
    `━━━━━━━━━━━━━━`,
    `🔢 *رقم الإيصال:* ${receiptId || 'غير محدد'}`,
    `👤 *الاسم:* ${partnerName}`,
    `💰 *المبلغ الأساسي:* ${amount} ريال`,
    `📅 *التاريخ:* ${createdAt}`,
    `📝 *الملاحظة:* ${note || 'بدون ملاحظة'}`,
  ];

  if (summary) {
    lines.push(`━━━━━━━━━━━━━━`);
    lines.push(`📉 *الخصم (${summary.partyBPct}%):* ${summary.discount} ريال`);
    lines.push(`🏦 *العمولة (${summary.bankCommRate}%):* ${summary.bankComm} ريال`);
    lines.push(`✅ *الصافي المستحق:* ${summary.net} ريال`);
  }

  lines.push(`━━━━━━━━━━━━━━`);
  lines.push(`📊 *الحالة:* ${status === 'pending' ? 'بانتظار الاعتماد' : 'مؤكد'}`);
  lines.push(`🖼 *الصورة:* ${hasImage ? 'مرفقة بالإشعار 📸' : 'غير مرفقة'}`);

  return lines.join('\n');
};

export const buildEditRequestTelegramText = ({
  partnerName,
  partnerGender = 'male',
  oldAmount,
  newAmount,
  newNet = null,
  note,
  createdAt,
}) => {
  const partnerRole = partnerGender === 'female' ? 'الشريكة' : 'الشريك';
  const lines = [
    `✏️ *طلب تعديل إيصال من ${partnerRole}*`,
    `━━━━━━━━━━━━━━`,
    `👤 *الاسم:* ${partnerName}`,
    `📉 *المبلغ السابق:* ${oldAmount} ريال`,
    `📈 *المبلغ الجديد:* ${newAmount} ريال`,
  ];

  if (newNet) {
    lines.push(`✅ *الصافي الجديد:* ${newNet} ريال`);
  }

  lines.push(`📅 *التاريخ:* ${createdAt}`);
  lines.push(`📝 *السبب:* ${note || 'غير محدد'}`);
  lines.push(`━━━━━━━━━━━━━━`);

  return lines.join('\n');
};
