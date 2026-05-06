import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();

const readSecret = (key) => String(process.env[key] || '').trim();

const buildCaption = (receipt = {}) => {
  const note = String(receipt?.note || '').trim() || 'لا توجد ملاحظة';
  const createdAt = receipt?.createdAt || new Date().toISOString();

  return [
    '🧾 إيصال جديد من الشريك',
    '',
    `👤 الشريك: ${receipt?.partnerName || 'غير محدد'}`,
    `💰 المبلغ: ${Number(receipt?.amount) || 0} ريال`,
    `📝 الملاحظة: ${note}`,
    `🆔 رقم الإيصال: ${receipt?.id || 'غير متوفر'}`,
    `📅 التاريخ: ${createdAt}`,
    '',
    'الحالة: بانتظار التأكيد',
  ].join('\n');
};

const sendTelegramPhoto = async ({ receipt }) => {
  const botToken = readSecret('TELEGRAM_BOT_TOKEN');
  const chatId = readSecret('TELEGRAM_CHAT_ID');

  if (!botToken || !chatId) {
    throw new HttpsError('failed-precondition', 'إعداد تلجرام غير مكتمل داخل Cloud Functions.');
  }

  if (!receipt?.imageUrl) {
    throw new HttpsError('invalid-argument', 'رابط صورة الإيصال غير متوفر.');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({
      chat_id: chatId,
      photo: receipt.imageUrl,
      caption: buildCaption(receipt),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    throw new HttpsError('internal', payload?.description || 'فشل إرسال صورة الإيصال إلى تلجرام.');
  }

  return payload?.result?.message_id || null;
};

export const sendReceiptPhotoToTelegram = onCall(async (request) => {
  const receiptId = String(request.data?.receiptId || '').trim();
  const directReceipt = request.data?.receipt && typeof request.data.receipt === 'object'
    ? request.data.receipt
    : null;

  let receipt = directReceipt;

  if (!receipt && receiptId) {
    const snapshot = await db.collection('receipts').doc(receiptId).get();
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'الإيصال المطلوب غير موجود.');
    }

    const data = snapshot.data() || {};
    receipt = {
      id: snapshot.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    };
  }

  if (!receipt) {
    throw new HttpsError('invalid-argument', 'بيانات الإيصال غير صالحة.');
  }

  const telegramMessageId = await sendTelegramPhoto({ receipt });

  if (receiptId) {
    await db.collection('receipts').doc(receiptId).set({
      telegramStatus: 'sent',
      telegramMessageId,
      telegramError: null,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  return {
    ok: true,
    telegramMessageId,
  };
});
