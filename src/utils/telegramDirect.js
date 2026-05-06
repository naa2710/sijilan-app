import {
  buildReceiptTelegramText,
  buildEditRequestTelegramText,
} from './telegram';
import { withApiBase } from './apiBase';

const sendViaBackend = async (payload) => {
  const finalUrl = withApiBase('/api/telegram/send-message');
  console.log(`[Frontend] Fetching Telegram via: ${finalUrl}`);
  
  try {
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error('[Frontend] Backend returned error:', data);
      throw new Error(data?.message || `فشل الخادم (Status: ${response.status})`);
    }

    const result = await response.json();
    console.log('[Frontend] Telegram send success:', result);
    return result;
  } catch (error) {
    console.error('[Frontend] Fetch error:', error);
    throw new Error(`خطأ شبكة: ${error.message}`);
  }
};

export const sendReceiptDirectlyToTelegram = async ({
  partnerId,
  partnerName,
  partnerGender,
  receiptId,
  amount,
  note,
  createdAt,
  hasImage = false,
  status = 'confirmed',
  imageDataUrl = null,
  summary = null,
}) => {
  const text = buildReceiptTelegramText({
    partnerId,
    partnerName,
    partnerGender,
    receiptId,
    amount,
    note,
    createdAt,
    hasImage,
    status,
    summary,
  });

  try {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const messageThreadId = urlParams.get('tgTopic');

    const result = await sendViaBackend({
      text,
      messageThreadId,
      imageDataUrl: imageDataUrl || null, // Pass image to backend
    });

    if (!result.ok) {
      throw new Error(result.message || 'فشل إرسال البوت');
    }

    return { mode: 'server', body: text };
  } catch (error) {
    console.warn('تعذر إرسال الإيصال لتليجرام:', error.message);
    return {
      mode: 'fallback',
      body: text,
      error: error.message
    };
  }
};

export const sendEditRequestDirectlyToTelegram = async ({
  partnerName,
  partnerGender,
  oldAmount,
  newAmount,
  newNet = null,
  note,
  createdAt,
}) => {
  const text = buildEditRequestTelegramText({
    partnerName,
    partnerGender,
    oldAmount,
    newAmount,
    newNet,
    note,
    createdAt,
  });

  try {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const messageThreadId = urlParams.get('tgTopic');
    const result = await sendViaBackend({
      text,
      messageThreadId,
    });
    if (result.ok) {
      return { mode: 'server', body: text };
    }
    throw new Error(result.message || 'فشل إرسال البوت');
  } catch (error) {
    return {
      mode: 'fallback',
      body: text,
      error: error.message
    };
  }
};

export const sendTelegramDocument = async ({
  botToken,
  chatId,
  messageThreadId,
  caption,
  fileName,
  base64Data,
}) => {
  const finalUrl = withApiBase('/api/telegram/send-document');
  try {
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken,
        chatId,
        messageThreadId,
        caption,
        fileName,
        base64Data,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || `فشل إرسال الملف (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`خطأ في إرسال الملف: ${error.message}`);
  }
};
