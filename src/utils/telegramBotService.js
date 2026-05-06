import { dataUrlToFile } from './image';

export const getTelegramConfig = () => {
  try {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const urlToken = urlParams.get('tgToken');
    const urlAdmin = urlParams.get('tgAdmin');

    const saved = localStorage.getItem('financial_settings');
    const settings = saved ? JSON.parse(saved) : {};
    
    return {
      token: urlToken || settings?.telegram?.botToken || '8744192876:AAFoEzLELm6fgDvRWDjjv0Mi9GMigY1rTU0',
      chatId: urlAdmin || settings?.telegram?.adminChatId || '-1003918458927'
    };
  } catch(e) {
    return {
      token: '8744192876:AAFoEzLELm6fgDvRWDjjv0Mi9GMigY1rTU0',
      chatId: '-1003918458927'
    };
  }
};

const withTimeout = (promise, ms = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      controller.signal.addEventListener('abort', () => reject(new Error('انتهت مهلة الاتصال بتليجرام (15 ثانية)')))
    )
  ]).finally(() => clearTimeout(timer));
};

const fetchWithTimeout = (url, options = {}, ms = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

export const sendToTelegramBot = async (text, photoUrl = null, targetChatId = null, messageThreadId = null) => {
  const config = getTelegramConfig();
  const baseUrl = `https://api.telegram.org/bot${config.token}`;
  const chatId = targetChatId || config.chatId;
  
  try {
    const params = {
      chat_id: chatId,
      parse_mode: 'Markdown'
    };
    if (messageThreadId) {
      params.message_thread_id = messageThreadId;
    }

    if (photoUrl) {
      if (photoUrl.startsWith('data:')) {
        const fileBlob = dataUrlToFile(photoUrl, 'receipt.jpg');
        const formData = new FormData();
        formData.append('chat_id', params.chat_id);
        if (params.message_thread_id) formData.append('message_thread_id', params.message_thread_id);
        formData.append('photo', fileBlob, 'receipt.jpg');
        formData.append('caption', text);
        formData.append('parse_mode', params.parse_mode);
        
        const res = await fetchWithTimeout(`${baseUrl}/sendPhoto`, {
          method: 'POST',
          body: formData,
          mode: 'cors'
        });
        return await res.json();
      } else {
        const res = await fetchWithTimeout(`${baseUrl}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...params, photo: photoUrl, caption: text }),
          mode: 'cors'
        });
        return await res.json();
      }
    } else {
      const res = await fetchWithTimeout(`${baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, text }),
        mode: 'cors'
      });
      return await res.json();
    }
  } catch (error) {
    console.error('Telegram Bot Error Details:', error);
    throw error;
  }
};

export const openTelegramFallback = (text) => {
  // Use the official share utility which is more reliable for pre-filling text
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(text)}`;
  window.open(shareUrl, '_blank');
};
