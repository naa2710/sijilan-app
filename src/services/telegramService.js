// Telegram service mock - Firebase disabled
export const sendTelegramMessage = async () => {
    console.warn('Firebase is disabled. Telegram message not sent via Firebase Functions.');
    return { ok: false };
};
