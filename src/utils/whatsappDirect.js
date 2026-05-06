import {
  ADMIN_WHATSAPP_NUMBER,
  buildReceiptWhatsAppCaption,
  buildEditRequestWhatsAppText,
  buildReceiptWhatsAppText,
  openWhatsAppChat,
} from './whatsapp';
import {
  checkApiServerAvailability,
  getCachedApiServerAvailability,
  withApiBase,
} from './apiBase';

const postJson = async (url, payload, fallbackMessage) => {
  const response = await fetch(withApiBase(url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = fallbackMessage;

    try {
      const data = await response.json();
      message = data?.message || fallbackMessage;
    } catch (error) {
      message = fallbackMessage;
    }

    throw new Error(message);
  }

  return response.json();
};

const openWhatsAppFallback = (to, body, extra = {}) => ({
  mode: 'fallback',
  body,
  url: openWhatsAppChat(to, body),
  ...extra,
});

export const sendReceiptDirectlyToWhatsApp = async ({
  partnerId,
  partnerName,
  partnerGender,
  receiptId,
  amount,
  note,
  createdAt,
  hasImage = false,
  status = 'confirmed',
}) => {
  const caption = buildReceiptWhatsAppCaption({
    partnerName,
    partnerGender,
    receiptId,
    amount,
    note,
  });
  const detailsBody = buildReceiptWhatsAppText({
    partnerId,
    partnerName,
    partnerGender,
    receiptId,
    amount,
    note,
    createdAt,
    hasImage,
    status,
  });

  if (getCachedApiServerAvailability() === false) {
    return {
      mode: 'fallback',
      caption,
      detailsBody,
      url: openWhatsAppChat(ADMIN_WHATSAPP_NUMBER, detailsBody),
    };
  }

  const serverAvailable = await checkApiServerAvailability();
  if (!serverAvailable) {
    return {
      mode: 'fallback',
      caption,
      detailsBody,
      url: openWhatsAppChat(ADMIN_WHATSAPP_NUMBER, detailsBody),
    };
  }

  try {
    await postJson(
      '/api/whatsapp/send-receipt',
      {
        to: ADMIN_WHATSAPP_NUMBER,
        caption,
        detailsBody,
      },
      'تعذر إرسال إشعار الإيصال إلى واتساب الإدارة.',
    );

    return { mode: 'server', caption, detailsBody };
  } catch (error) {
    const url = openWhatsAppChat(ADMIN_WHATSAPP_NUMBER, detailsBody);
    return { mode: 'fallback', caption, detailsBody, url, error };
  }
};

export const sendEditRequestDirectlyToWhatsApp = async ({
  partnerName,
  partnerGender,
  oldAmount,
  newAmount,
  note,
  createdAt,
}) => {
  const body = buildEditRequestWhatsAppText({
    partnerName,
    partnerGender,
    oldAmount,
    newAmount,
    note,
    createdAt,
  });

  if (getCachedApiServerAvailability() === false) {
    return openWhatsAppFallback(ADMIN_WHATSAPP_NUMBER, body);
  }

  const serverAvailable = await checkApiServerAvailability();
  if (!serverAvailable) {
    return openWhatsAppFallback(ADMIN_WHATSAPP_NUMBER, body);
  }

  try {
    await postJson(
      '/api/whatsapp/send-edit-request',
      {
        to: ADMIN_WHATSAPP_NUMBER,
        body,
      },
      'تعذر إرسال طلب التعديل إلى واتساب الإدارة.',
    );

    return { mode: 'server', body };
  } catch (error) {
    const url = openWhatsAppChat(ADMIN_WHATSAPP_NUMBER, body);
    return { mode: 'fallback', body, url, error };
  }
};

export const sendDirectTextToWhatsApp = ({
  to = ADMIN_WHATSAPP_NUMBER,
  body,
}) => (
  Promise.resolve()
    .then(async () => {
      if (getCachedApiServerAvailability() === false) {
        return openWhatsAppFallback(to, body);
      }

      const serverAvailable = await checkApiServerAvailability();
      if (!serverAvailable) {
        return openWhatsAppFallback(to, body);
      }

      await postJson(
        '/api/whatsapp/send-edit-request',
        {
          to,
          body,
        },
        'تعذر إرسال الرسالة إلى واتساب.',
      );

      return { mode: 'server', body };
    })
    .catch((error) => openWhatsAppFallback(to, body, { error }))
);

export const sendLedgerExportReportDirectlyToWhatsApp = ({
  to = ADMIN_WHATSAPP_NUMBER,
  body,
}) => sendDirectTextToWhatsApp({
  to,
  body,
});
