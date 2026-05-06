export const buildSharedPartnerUrl = ({
  baseUrl,
  partnerId,
  partnerName,
  partnerGender,
  partnerMessage,
}) => {
  const url = new URL(baseUrl);
  url.searchParams.set('sharedMode', 'write');
  url.searchParams.set('partnerId', String(partnerId));
  url.searchParams.set('partnerName', partnerName || '');
  url.searchParams.set('partnerGender', partnerGender || 'male');

  if (partnerMessage?.text) {
    url.searchParams.set('adminMessage', partnerMessage.text);
    if (partnerMessage.sentAt) {
      url.searchParams.set('adminMessageAt', partnerMessage.sentAt);
    }
  } else {
    url.searchParams.delete('adminMessage');
    url.searchParams.delete('adminMessageAt');
  }

  return url.toString();
};

const encodeUnicodeBase64 = (value) => {
  const encoded = encodeURIComponent(value).replace(
    /%([0-9A-F]{2})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16)),
  );

  return btoa(encoded);
};

const decodeUnicodeBase64 = (value) => {
  const binary = atob(value);
  const encoded = Array.from(binary)
    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
    .join('');

  return decodeURIComponent(encoded);
};

export const buildLedgerImportUrl = ({
  baseUrl,
  partnerId,
  partnerName,
  partnerGender,
  receipts = [],
}) => {
  const url = new URL(baseUrl);
  const payload = {
    partnerId: Number(partnerId),
    partnerName: partnerName || '',
    partnerGender: partnerGender || 'male',
    receipts,
  };

  url.searchParams.set('importLedger', encodeUnicodeBase64(JSON.stringify(payload)));
  return url.toString();
};

export const parseLedgerImportPayload = (encodedPayload) => {
  if (!encodedPayload) return null;

  try {
    return JSON.parse(decodeUnicodeBase64(encodedPayload));
  } catch (error) {
    return null;
  }
};

export const readSharedPartnerMessage = (params) => {
  const text = params.get('adminMessage');
  if (!text) return null;

  return {
    text,
    sentAt: params.get('adminMessageAt') || new Date().toISOString(),
  };
};
