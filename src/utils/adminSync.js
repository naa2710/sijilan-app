import {
  checkApiServerAvailability,
  resetApiServerAvailabilityCache,
  withApiBase,
} from './apiBase';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const REALTIME_RETRY_DELAY_MS = 2500;

const readErrorMessage = async (response, fallbackMessage) => {
  try {
    const payload = await response.json();
    return payload?.message || fallbackMessage;
  } catch (error) {
    return fallbackMessage;
  }
};

const readJsonPayload = async (response, fallbackMessage) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(fallbackMessage);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(fallbackMessage);
  }
};

const requestJson = async (url, options = {}, fallbackMessage = 'تعذر تنفيذ الطلب.') => {
  const serverAvailable = await checkApiServerAvailability();
  if (!serverAvailable) {
    throw new Error(fallbackMessage);
  }

  const response = await fetch(withApiBase(url), options);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallbackMessage));
  }

  return readJsonPayload(response, fallbackMessage);
};

export const queueReceiptForAdmin = async ({ partnerId, partnerName, record }) => (
  requestJson(
    '/api/admin/receipts',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ partnerId, partnerName, record }),
    },
    'تعذر إرسال الإيصال إلى الإدارة.',
  )
);

export const fetchQueuedAdminReceipts = async () => {
  const payload = await requestJson('/api/admin/receipts', {}, 'تعذر قراءة الإيصالات الواردة.');
  return Array.isArray(payload?.receipts) ? payload.receipts : [];
};

export const acknowledgeQueuedAdminReceipts = async (syncIds = []) => (
  requestJson(
    '/api/admin/receipts',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ action: 'ack', syncIds }),
    },
    'تعذر تأكيد استلام الإيصالات.',
  )
);

export const pushPartnerMessageToServer = async ({ partnerId, partnerName, text, sentAt }) => (
  requestJson(
    '/api/admin/messages',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ partnerId, partnerName, text, sentAt, sender: 'admin' }),
    },
    'تعذر إرسال رسالة الإدارة إلى الشريك.',
  )
);

export const submitPartnerReplyToServer = async ({ partnerId, partnerName, text, sentAt }) => (
  requestJson(
    '/api/admin/messages',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ partnerId, partnerName, text, sentAt, sender: 'partner' }),
    },
    'تعذر إرسال رد الفرد إلى الإدارة.',
  )
);

export const fetchPartnerMessageFromServer = async (partnerId) => {
  const safePartnerId = Number(partnerId);
  if (!safePartnerId) return null;

  const payload = await requestJson(
    `/api/admin/messages?partnerId=${safePartnerId}`,
    {},
    'تعذر قراءة رسالة الشريك.',
  );

  return payload?.message || null;
};

export const clearPartnerMessageFromServer = async (partnerId) => {
  const safePartnerId = Number(partnerId);
  if (!safePartnerId) return { ok: true };

  return requestJson(
    '/api/admin/messages',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ action: 'clear', partnerId: safePartnerId }),
    },
    'تعذر حذف رسالة الشريك من الخادم.',
  );
};

const createRealtimeSubscription = (path, listeners = {}) => {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return () => {};
  }

  let disposed = false;
  let eventSource = null;
  let retryTimer = null;

  const clearRetryTimer = () => {
    if (retryTimer === null) return;
    window.clearTimeout(retryTimer);
    retryTimer = null;
  };

  const closeEventSource = () => {
    if (!eventSource) return;
    eventSource.close();
    eventSource = null;
  };

  const scheduleReconnect = () => {
    if (disposed || retryTimer !== null) return;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      connect(true).catch(() => {});
    }, REALTIME_RETRY_DELAY_MS);
  };

  const registerListener = (source, eventName, handler) => {
    if (typeof handler !== 'function') return;

    source.addEventListener(eventName, (event) => {
      try {
        const payload = event?.data ? JSON.parse(event.data) : {};
        handler(payload);
      } catch (error) {
        handler({});
      }
    });
  };

  const connect = async (forceHealthCheck = false) => {
    if (disposed) return;

    const serverAvailable = await checkApiServerAvailability({ force: forceHealthCheck });
    if (!serverAvailable) {
      listeners.onUnavailable?.();
      scheduleReconnect();
      return;
    }

    closeEventSource();
    clearRetryTimer();

    const nextEventSource = new EventSource(withApiBase(path));
    eventSource = nextEventSource;

    registerListener(nextEventSource, 'connected', listeners.onConnected);
    registerListener(nextEventSource, 'receipt-queued', listeners.onReceiptQueued);
    registerListener(nextEventSource, 'ledger-updated', listeners.onLedgerUpdated);
    registerListener(nextEventSource, 'edit-request-updated', listeners.onEditRequestUpdated);
    registerListener(nextEventSource, 'pin-reset-request', listeners.onPinResetRequest);
    registerListener(nextEventSource, 'message-updated', listeners.onMessageUpdated);
    registerListener(nextEventSource, 'message-cleared', listeners.onMessageCleared);

    nextEventSource.onerror = (event) => {
      resetApiServerAvailabilityCache();
      listeners.onError?.(event);
      closeEventSource();
      scheduleReconnect();
    };
  };

  connect().catch(() => {
    scheduleReconnect();
  });

  return () => {
    disposed = true;
    clearRetryTimer();
    closeEventSource();
  };
};

export const subscribeAdminEvents = (listeners = {}) => (
  createRealtimeSubscription('/api/events/admin', listeners)
);

export const subscribePartnerEvents = (partnerId, listeners = {}) => {
  if (!partnerId) return () => {};
  const safePartnerId = String(partnerId);
  return createRealtimeSubscription(`/api/events/partner?partnerId=${safePartnerId}`, listeners);
};

export const pushLedgerStateToServer = async (ledgers = {}) => (
  requestJson(
    '/api/admin/ledger-state',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ ledgers }),
    },
    'تعذر مزامنة حالة الإيصالات مع الخادم.',
  )
);

export const fetchPartnerLedgerStateFromServer = async (partnerId) => {
  if (!partnerId) return [];
  const safePartnerId = String(partnerId);

  const payload = await requestJson(
    `/api/admin/ledger-state?partnerId=${safePartnerId}`,
    {},
    'تعذر قراءة حالة إيصالات الفرد.',
  );

  return Array.isArray(payload?.ledgers) ? payload.ledgers : [];
};

export const upsertPartnerLedgerRecordOnServer = async ({ partnerId, record }) => (
  requestJson(
    '/api/admin/ledger-state',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ action: 'upsertRecord', partnerId, record }),
    },
    'تعذر تحديث الإيصال على الخادم.',
  )
);

export const submitEditRequestToServer = async (payload) => (
  requestJson(
    '/api/admin/edit-requests',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    },
    'تعذر إرسال طلب المراجعة إلى الإدارة.',
  )
);

export const fetchEditRequestsFromServer = async (partnerId = null) => {
  const query = partnerId
    ? `?partnerId=${String(partnerId)}`
    : '';

  const payload = await requestJson(
    `/api/admin/edit-requests${query}`,
    {},
    'تعذر قراءة طلبات المراجعة.',
  );

  return Array.isArray(payload?.requests) ? payload.requests : [];
};

export const resolveEditRequestOnServer = async ({ id, status }) => (
  requestJson(
    '/api/admin/edit-requests',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ action: 'resolve', id, status }),
    },
    'تعذر تحديث حالة طلب المراجعة.',
  )
);

export const submitPinResetRequestToServer = async (payload) => (
  requestJson(
    '/api/admin/pin-reset-requests',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    },
    'تعذر إرسال طلب إعادة التعيين إلى الإدارة.',
  )
);

export const fetchPinResetRequestsFromServer = async () => {
  const payload = await requestJson(
    '/api/admin/pin-reset-requests',
    {},
    'تعذر قراءة طلبات إعادة التعيين.',
  );

  return Array.isArray(payload?.requests) ? payload.requests : [];
};

export const resolvePinResetRequestOnServer = async ({ id }) => (
  requestJson(
    '/api/admin/pin-reset-requests',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ action: 'resolve', id }),
    },
    'تعذر تحديث طلب إعادة التعيين.',
  )
);
export const fetchDisabledPartnerIds = async () => {
  const payload = await requestJson('/api/admin/partner-access', {}, 'تعذر قراءة حالة حسابات الأفراد.');
  return Array.isArray(payload?.disabledIds) ? payload.disabledIds : [];
};

export const togglePartnerAccessOnServer = async (partnerId, disabled) => (
  requestJson(
    '/api/admin/partner-access',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ partnerId, disabled }),
    },
    'تعذر تحديث حالة وصول الفرد.',
  )
);
