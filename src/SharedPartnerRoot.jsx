import React, { useEffect, useMemo, useRef, useState } from 'react';

import SharedRecordView from './views/SharedRecordView';
import PartnerSettingsSheet from './views/PartnerSettingsSheet';
import PinLock from './views/PinLock';
import { isFirebaseConfigured } from './firebase';
import { subscribeToPartnerReceipts, updateReceiptFields } from './services/receiptService';
import { hasBiometricSupport, registerBiometricUnlock, verifyBiometricUnlock } from './utils/biometric';
import { playNotificationSound, primeNotificationAudio } from './utils/notificationSound';
import { ADMIN_WHATSAPP_NUMBER, openWhatsAppChat } from './utils/whatsapp';
import { getPartnerLabels, normalizePartnerGender } from './utils/partnerProfile';
import {
  fetchEditRequestsFromServer,
  fetchPartnerLedgerStateFromServer,
  submitPinResetRequestToServer,
  subscribePartnerEvents,
  submitEditRequestToServer,
  upsertPartnerLedgerRecordOnServer,
} from './utils/adminSync';
import {
  appendNotificationHistory,
  markAllNotificationsRead,
  readArchivedNotificationHistory,
  readNotificationHistory,
  showSystemNotification,
} from './utils/notifications';
import {
  shouldLockByTimeout,
  clearSecurityActivity,
  touchSecurityActivity,
} from './utils/securitySession';
import { getLedgerRecordStatus } from './utils/finance';

const DEFAULT_ADMIN_SHARED_SETTINGS = {
  financials: {
    partyBPct: 10,
    bankCommRate: 2,
    autoApprove: false,
  },
  receiptApprovalMode: 'auto',
};

const DEFAULT_PARTNER_SETTINGS = {
  appearance: {
    isDarkMode: false,
    themeColor: '#EF233C',
  },
  notifications: {
    adminMessageAlerts: true,
    adminMessageSound: true,
    retentionDays: 5,
  },
  security: {
    lockTimeoutMinutes: 30,
  },
  receiptDirectEditWindowSeconds: 60,
};
const PARTNER_SYNC_POLL_MS = 2500;
const PARTNER_NOTIFICATION_HISTORY_PREFIX = 'financial_partner_notification_history_';
const PARTNER_SECURITY_ACTIVITY_PREFIX = 'financial_partner_security_activity_';

const mergeAdminSharedSettings = (settings = {}) => ({
  ...DEFAULT_ADMIN_SHARED_SETTINGS,
  ...settings,
  financials: {
    ...DEFAULT_ADMIN_SHARED_SETTINGS.financials,
    ...(settings?.financials || {}),
  },
});

const mergePartnerSettings = (settings = {}) => ({
  ...DEFAULT_PARTNER_SETTINGS,
  ...settings,
  appearance: {
    ...DEFAULT_PARTNER_SETTINGS.appearance,
    ...(settings?.appearance || {}),
  },
  notifications: {
    ...DEFAULT_PARTNER_SETTINGS.notifications,
    ...(settings?.notifications || {}),
  },
  security: {
    ...DEFAULT_PARTNER_SETTINGS.security,
    ...(settings?.security || {}),
  },
});

const readJsonStorage = (key, fallback) => {
  try {
    const data = window.localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (error) {
    return fallback;
  }
};

const SharedPartnerRoot = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const partnerId = Number(params.get('partnerId'));
  const partnerName = params.get('partnerName') || `فرد ${partnerId || ''}`.trim();
  const partnerGender = normalizePartnerGender(params.get('partnerGender'));
  const telegramTopicId = params.get('tgTopic') || '';
  const partnerLabels = useMemo(() => getPartnerLabels(partnerGender), [partnerGender]);
  const partnerSettingsStorageKey = useMemo(() => `financial_partner_settings_${partnerId || 'shared'}`, [partnerId]);
  const partnerNotificationHistoryKey = useMemo(() => `${PARTNER_NOTIFICATION_HISTORY_PREFIX}${partnerId || 'shared'}`, [partnerId]);
  const partnerSecurityActivityKey = useMemo(() => `${PARTNER_SECURITY_ACTIVITY_PREFIX}${partnerId || 'shared'}`, [partnerId]);
  const biometricAvailable = useMemo(() => hasBiometricSupport(), []);

  const [adminSharedSettings, setAdminSharedSettings] = useState(DEFAULT_ADMIN_SHARED_SETTINGS);
  const [partnerSettings, setPartnerSettings] = useState(DEFAULT_PARTNER_SETTINGS);
  const [ledgers, setLedgers] = useState({});
  const [editRequests, setEditRequests] = useState([]);
  const [partnerMessages, setPartnerMessages] = useState({});
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [notificationArchive, setNotificationArchive] = useState([]);
  const [dialogConfig, setDialogConfig] = useState(null);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Async Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const shared = readJsonStorage('financial_settings', DEFAULT_ADMIN_SHARED_SETTINGS);
        const partner = readJsonStorage(partnerSettingsStorageKey, DEFAULT_PARTNER_SETTINGS);
        
        setAdminSharedSettings(mergeAdminSharedSettings(shared));
        setPartnerSettings(mergePartnerSettings(partner));
        setLedgers(readJsonStorage('financial_ledgers', {}));
        setEditRequests(readJsonStorage('financial_edit_requests', []));
        setPartnerMessages(readJsonStorage('financial_partner_messages', {}));
        setNotificationHistory(readNotificationHistory(partnerNotificationHistoryKey, partner.notifications?.retentionDays));
        setNotificationArchive(readArchivedNotificationHistory(partnerNotificationHistoryKey, partner.notifications?.retentionDays));
        
        setIsLocked(shouldLockByTimeout({
          pin: partner?.security?.pin,
          timeoutMinutes: partner?.security?.lockTimeoutMinutes,
          storageKey: partnerSecurityActivityKey,
        }));
      } finally {
        setIsLoading(false);
        // Remove the index.html loader if present
        const loader = document.getElementById('root-loading');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 500);
        }
      }
    };
    loadData();
  }, [partnerSettingsStorageKey, partnerNotificationHistoryKey, partnerSecurityActivityKey]);
  const [dialogsReady, setDialogsReady] = useState(false);
  const previousLedgerStatusRef = useRef(new Map());
  const previousRequestStatusRef = useRef(new Map());

  const globalSettings = useMemo(() => ({
    ...partnerSettings,
    financials: adminSharedSettings.financials,
    receiptApprovalMode: adminSharedSettings.receiptApprovalMode,
  }), [partnerSettings, adminSharedSettings]);
  const isDarkMode = Boolean(partnerSettings?.appearance?.isDarkMode);

  useEffect(() => {
    window.localStorage.setItem('financial_ledgers', JSON.stringify(ledgers));
  }, [ledgers]);

  useEffect(() => {
    window.localStorage.setItem('financial_edit_requests', JSON.stringify(editRequests));
  }, [editRequests]);

  useEffect(() => {
    window.localStorage.setItem('financial_partner_messages', JSON.stringify(partnerMessages));
  }, [partnerMessages]);

  useEffect(() => {
    window.localStorage.setItem(partnerSettingsStorageKey, JSON.stringify(partnerSettings));
  }, [partnerSettingsStorageKey, partnerSettings]);

  useEffect(() => {
    setNotificationHistory(
      readNotificationHistory(
        partnerNotificationHistoryKey,
        partnerSettings?.notifications?.retentionDays,
      ),
    );
    setNotificationArchive(
      readArchivedNotificationHistory(
        partnerNotificationHistoryKey,
        partnerSettings?.notifications?.retentionDays,
      ),
    );
  }, [partnerNotificationHistoryKey, partnerSettings?.notifications?.retentionDays]);

  useEffect(() => {
    window.appConfirm = (message, isDanger = false, confirmText = 'موافق', title = 'تأكيد') => (
      new Promise((resolve) => setDialogConfig({ type: 'confirm', message, title, isDanger, confirmText, onResolve: resolve }))
    );
    window.appAlert = (message, title = '') => {
      playNotificationSound('default').catch(() => {});
      return new Promise((resolve) => setDialogConfig({ type: 'alert', message, title, isDanger: false, confirmText: 'حسناً', onResolve: resolve }));
    };
    setDialogsReady(true);
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      primeNotificationAudio().catch(() => {});
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const refreshSettings = () => {
      setAdminSharedSettings(mergeAdminSharedSettings(readJsonStorage('financial_settings', DEFAULT_ADMIN_SHARED_SETTINGS)));
      setPartnerSettings(mergePartnerSettings(readJsonStorage(partnerSettingsStorageKey, DEFAULT_PARTNER_SETTINGS)));
    };

    window.addEventListener('storage', refreshSettings);
    return () => window.removeEventListener('storage', refreshSettings);
  }, [partnerSettingsStorageKey]);

  useEffect(() => {
    if (!partnerSettings?.security?.pin) {
      clearSecurityActivity(partnerSecurityActivityKey);
      setIsLocked(false);
      return;
    }

    setIsLocked(shouldLockByTimeout({
      pin: partnerSettings.security.pin,
      timeoutMinutes: partnerSettings?.security?.lockTimeoutMinutes,
      storageKey: partnerSecurityActivityKey,
    }));
  }, [partnerSecurityActivityKey, partnerSettings?.security?.lockTimeoutMinutes, partnerSettings?.security?.pin]);

  useEffect(() => {
    if (!partnerSettings?.security?.pin || isLocked) {
      return undefined;
    }

    touchSecurityActivity(partnerSecurityActivityKey);

    const handleActivity = () => {
      touchSecurityActivity(partnerSecurityActivityKey);
    };

    const handleVisibilityOrFocus = () => {
      const shouldLock = shouldLockByTimeout({
        pin: partnerSettings.security.pin,
        timeoutMinutes: partnerSettings?.security?.lockTimeoutMinutes,
        storageKey: partnerSecurityActivityKey,
      });

      if (shouldLock) {
        setIsLocked(true);
        return;
      }

      touchSecurityActivity(partnerSecurityActivityKey);
    };

    const checkTimeout = () => {
      const shouldLock = shouldLockByTimeout({
        pin: partnerSettings.security.pin,
        timeoutMinutes: partnerSettings?.security?.lockTimeoutMinutes,
        storageKey: partnerSecurityActivityKey,
      });

      if (shouldLock) {
        setIsLocked(true);
      }
    };

    const intervalId = window.setInterval(checkTimeout, 15000);
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [isLocked, partnerSecurityActivityKey, partnerSettings?.security?.lockTimeoutMinutes, partnerSettings?.security?.pin]);

  const updatePartnerSetting = (section, key, value) => {
    setPartnerSettings((prev) => ({
      ...prev,
      [section]: {
        ...(prev?.[section] || {}),
        [key]: value,
      },
    }));
  };

  const registerPartnerNotification = async ({
    id,
    type,
    title,
    body,
    soundVariant = 'default',
    showSystem = true,
  }) => {
    const existingNotifications = [
      ...readNotificationHistory(partnerNotificationHistoryKey, partnerSettings?.notifications?.retentionDays),
      ...readArchivedNotificationHistory(partnerNotificationHistoryKey, partnerSettings?.notifications?.retentionDays),
    ];
    const isDuplicate = existingNotifications.some((entry) => String(entry?.id) === String(id));
    const nextHistory = appendNotificationHistory(
      partnerNotificationHistoryKey,
      {
        id,
        type,
        title,
        body,
        partnerId,
        partnerName,
        unread: true,
      },
      partnerSettings?.notifications?.retentionDays,
    );

    setNotificationHistory(nextHistory);
    setNotificationArchive(
      readArchivedNotificationHistory(
        partnerNotificationHistoryKey,
        partnerSettings?.notifications?.retentionDays,
      ),
    );
    if (!isDuplicate && soundVariant) {
      playNotificationSound(soundVariant).catch(() => {});
    }
    if (!isDuplicate && showSystem) {
      showSystemNotification({ title, body, tag: id }).catch(() => {});
    }
  };

  const markPartnerNotificationsAsRead = () => {
    setNotificationHistory(
      markAllNotificationsRead(
        partnerNotificationHistoryKey,
        partnerSettings?.notifications?.retentionDays,
      ),
    );
    setNotificationArchive(
      readArchivedNotificationHistory(
        partnerNotificationHistoryKey,
        partnerSettings?.notifications?.retentionDays,
      ),
    );
  };

  const handleEnableBiometric = async () => {
    if (!biometricAvailable) {
      await window.appAlert('هذا الجهاز أو المتصفح لا يدعم فتح التطبيق بالبصمة.');
      return;
    }

    if (!partnerSettings?.security?.pin) {
      await window.appAlert('فعّل رمزًا سريًا أولًا ثم شغّل البصمة لهذه الواجهة.');
      return;
    }

    try {
      const credentialId = await registerBiometricUnlock();
      updatePartnerSetting('security', 'biometricCredentialId', credentialId);
      updatePartnerSetting('security', 'biometricEnabled', true);
      await window.appAlert(`تم تفعيل فتح ${partnerLabels.installTitle} بالبصمة بنجاح.`);
    } catch (error) {
      await window.appAlert(error.message || 'تعذر تفعيل البصمة على هذا الجهاز.');
    }
  };

  const handleDisableBiometric = async () => {
    updatePartnerSetting('security', 'biometricEnabled', false);
    updatePartnerSetting('security', 'biometricCredentialId', '');
    await window.appAlert(`تم إيقاف فتح ${partnerLabels.installTitle} بالبصمة.`);
  };

  const handleBiometricUnlock = async () => {
    const credentialId = partnerSettings?.security?.biometricCredentialId;

    if (!credentialId) {
      await window.appAlert('لم يتم إعداد البصمة بعد لهذه الواجهة.');
      return false;
    }

    try {
      const verified = await verifyBiometricUnlock(credentialId);
      return verified;
    } catch (error) {
      await window.appAlert(error.message || 'تعذر التحقق بالبصمة.');
      return false;
    }
  };

  const requestPinResetFromAdmin = async () => {
    const requestText = [
      `طلب إعادة تعيين رمز ${partnerLabels.installTitle}`,
      `${partnerLabels.role}: ${partnerName}`,
      `رقم ${partnerLabels.role}: ${partnerId || 'غير محدد'}`,
      `التاريخ: ${new Date().toLocaleDateString('en-GB')}`,
      `الوقت: ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      'الرجاء إعادة تعيين رمز الدخول لهذه الواجهة.',
    ].join('\n');

    try {
      await submitPinResetRequestToServer({
        partnerId,
        partnerName,
        partnerGender,
        source: 'partner-app',
        sourceLabel: partnerLabels.installTitle,
        requestedAt: new Date().toISOString(),
      });
      await window.appAlert('تم إرسال طلب إعادة تعيين الرمز إلى الإدارة بنجاح.');
    } catch (error) {
      openWhatsAppChat(ADMIN_WHATSAPP_NUMBER, requestText);
      await window.appAlert('تعذر إرسال الطلب إلى الإدارة داخل التطبيق، لذلك تم فتح رسالة واتساب جاهزة كحل بديل.');
    }
  };

  const addLedgerRecord = (targetPartnerId, record) => {
    setLedgers((prev) => {
      const current = prev[targetPartnerId] || [];
      return {
        ...prev,
        [targetPartnerId]: [...current, record],
      };
    });
  };

  const updateLedgerRecord = (targetPartnerId, recordId, updates) => {
    setLedgers((prev) => {
      const current = prev[targetPartnerId] || [];
      return {
        ...prev,
        [targetPartnerId]: current.map((record) => (
          String(record.id) === String(recordId)
            ? { ...record, ...updates }
            : record
        )),
      };
    });
  };

  const deleteLedgerRecord = async (targetPartnerId, recordId) => {
    if (await window.appConfirm('هل أنت متأكد من حذف هذا السجل؟', true, 'حذف السجل')) {
      setLedgers((prev) => {
        const current = prev[targetPartnerId] || [];
        return {
          ...prev,
          [targetPartnerId]: current.filter((record) => record.id !== recordId),
        };
      });
      setEditRequests((prev) => prev.filter((request) => request.recordId !== recordId));
    }
  };

  const requestLedgerEdit = async (targetPartnerId, targetPartnerName, recordId, oldAmount, newAmount, note) => {
    const nextRequest = {
      id: Date.now(),
      partnerId: targetPartnerId,
      partnerName: targetPartnerName,
      partnerGender,
      recordId,
      oldAmount,
      newAmount,
      note,
      status: 'pending',
      date: new Date().toISOString(),
    };

    setEditRequests((prev) => ([...prev, nextRequest]));

    try {
      await submitEditRequestToServer(nextRequest);
      return { ok: true };
    } catch (error) {
      setEditRequests((prev) => prev.filter((request) => String(request.id) !== String(nextRequest.id)));
      throw error;
    }
  };

  const clearPartnerMessage = (targetPartnerId) => {
    setPartnerMessages((prev) => {
      if (!prev[targetPartnerId]) return prev;
      const next = { ...prev };
      delete next[targetPartnerId];
      return next;
    });
  };

  useEffect(() => {
    if (!partnerId) return undefined;

    let disposed = false;
    let syncInFlight = false;

    const syncLedgerState = async () => {
      if (syncInFlight) return;
      syncInFlight = true;
      try {
        const nextPartnerLedger = await fetchPartnerLedgerStateFromServer(partnerId);
        if (disposed) return;

        setLedgers((prev) => {
          const currentLedger = prev[partnerId] || [];
          const currentStatusMap = new Map(
            currentLedger.map((r) => [String(r.syncId || r.id), getLedgerRecordStatus(r)]),
          );
          const serverRecordKeys = new Set(nextPartnerLedger.map((r) => String(r.syncId || r.id)));
          const localOnlyRecords = currentLedger.filter((r) => !serverRecordKeys.has(String(r.syncId || r.id)));

          nextPartnerLedger.forEach((record) => {
            const recordKey = String(record.syncId || record.id);
            const previousStatus = currentStatusMap.get(recordKey);
            const nextStatus = getLedgerRecordStatus(record);

            if (previousStatus && previousStatus !== nextStatus) {
              const notificationMap = {
                approved: { title: 'تم تأكيد الإيصال', body: `تم تأكيد إيصالك بمبلغ ${record.amount || 0} ريال.`, soundVariant: 'approved' },
                rejected: { title: 'تم رفض الإيصال', body: `تم رفض إيصالك بمبلغ ${record.amount || 0} ريال.`, soundVariant: 'rose' },
                review: { title: 'طلب مراجعة', body: `تم تحويل إيصالك للمراجعة.`, soundVariant: 'indigo' },
                frozen: { title: 'تم تجميد الإيصال', body: `تم تجميد إيصالك بمبلغ ${record.amount || 0} ريال لحين المراجعة.`, soundVariant: 'frozen' },
                pending: { title: 'الإيصال بانتظار المراجعة', body: `إيصالك بمبلغ ${record.amount || 0} ريال ما زال بانتظار اعتماد الإدارة.`, soundVariant: 'review' },
              };
              const config = notificationMap[nextStatus];
              if (config) {
                registerPartnerNotification({ id: `ledger-status-${partnerId}-${recordKey}-${nextStatus}`, type: 'ledger-status', ...config }).catch(() => {});
              }
            }
          });

          return { ...prev, [partnerId]: [...nextPartnerLedger, ...localOnlyRecords] };
        });
      } catch (e) {} finally {
        syncInFlight = false;
      }
    };

    const syncPartnerEditRequests = async () => {
      try {
        const requests = await fetchEditRequestsFromServer(partnerId);
        if (disposed) return;
        setEditRequests((previous) => {
          const previousMap = new Map(previous.map((r) => [String(r.id), r.status]));
          requests.forEach((request) => {
            const previousStatus = previousMap.get(String(request.id));
            if (!previousStatus && request.status === 'pending') {
              registerPartnerNotification({
                id: `edit-request-new-${request.id}`,
                type: 'edit-request',
                title: 'تم إرسال طلب المراجعة',
                body: `طلب تعديل الإيصال بمبلغ ${request.newAmount} ريال بانتظار موافقة الإدارة.`,
                soundVariant: 'default',
                showSystem: false,
              }).catch(() => {});
            }
            if (previousStatus === 'pending' && request.status !== 'pending') {
              const isApproved = request.status === 'approved';
              registerPartnerNotification({
                id: `edit-request-resolution-${request.id}-${request.status}`,
                type: 'edit-request',
                title: isApproved ? 'تمت الموافقة على طلب المراجعة' : 'تم رفض طلب المراجعة',
                body: isApproved ? `وافقت الإدارة على تعديل الإيصال إلى ${request.newAmount} ريال.` : 'رفضت الإدارة طلب تعديل الإيصال الحالي.',
                soundVariant: isApproved ? 'approved' : 'warning',
              }).catch(() => {});
            }
          });
          return requests;
        });
      } catch (e) {}
    };

    const syncOnVisible = () => { if (document.visibilityState === 'visible') syncLedgerState(); };

    syncLedgerState();
    syncPartnerEditRequests();

    const ledgerPollId = window.setInterval(syncLedgerState, PARTNER_SYNC_POLL_MS);
    const requestsPollId = window.setInterval(syncPartnerEditRequests, PARTNER_SYNC_POLL_MS);

    window.addEventListener('visibilitychange', syncOnVisible);
    window.addEventListener('focus', syncLedgerState);

    const unsubscribe = subscribePartnerEvents(partnerId, {
      onConnected: () => { syncLedgerState(); syncPartnerEditRequests(); },
      onLedgerUpdated: syncLedgerState,
      onEditRequestUpdated: syncPartnerEditRequests,
      onMessageUpdated: ({ message }) => {
        if (message.sender === 'admin') {
          if (message.text === '__RESET__') {
            setNotificationHistory([]);
            setNotificationArchive([]);
            localStorage.setItem(partnerNotificationHistoryKey, '[]');
            localStorage.setItem(`${partnerNotificationHistoryKey}_archive`, '[]');
          } else {
            registerPartnerNotification({ id: `admin-msg-${Date.now()}`, type: 'message', title: 'رسالة من الإدارة', body: message.text, soundVariant: 'message' }).catch(() => {});
          }
        }
      },
      onMessageCleared: () => {
        setNotificationHistory([]);
        setNotificationArchive([]);
        localStorage.setItem(partnerNotificationHistoryKey, '[]');
        localStorage.setItem(`${partnerNotificationHistoryKey}_archive`, '[]');
      }
    });

    return () => {
      disposed = true;
      window.clearInterval(ledgerPollId);
      window.clearInterval(requestsPollId);
      window.removeEventListener('visibilitychange', syncOnVisible);
      window.removeEventListener('focus', syncLedgerState);
      unsubscribe();
    };
  }, [partnerId, partnerName, partnerSettings?.notifications?.retentionDays, partnerNotificationHistoryKey]);

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-[#0B0E12] text-white' : 'bg-[#F8FAFC] text-slate-900'}`}>
        <div className="w-12 h-12 border-4 border-[var(--primary-color)]/20 border-t-[var(--primary-color)] rounded-full animate-spin"/>
        <p className="text-xs font-black text-slate-500 animate-pulse">جاري تحضير واجهة {partnerLabels.roleObject}...</p>
      </div>
    );
  }

  return (
    <>
      {isLocked && partnerSettings?.security?.pin && (
        <PinLock
          correctPin={partnerSettings.security.pin}
          onUnlock={() => {
            touchSecurityActivity(partnerSecurityActivityKey);
            setIsLocked(false);
          }}
          isDarkMode={isDarkMode}
          biometricEnabled={!!partnerSettings?.security?.biometricEnabled && biometricAvailable}
          onBiometricUnlock={async () => {
            const verified = await handleBiometricUnlock();
            if (verified) {
              touchSecurityActivity(partnerSecurityActivityKey);
              setIsLocked(false);
            }
          }}
          onRequestPinReset={requestPinResetFromAdmin}
        />
      )}

      {dialogConfig && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            onClick={() => {
              if (dialogConfig.type === 'alert') {
                dialogConfig.onResolve(true);
                setDialogConfig(null);
              }
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            className={`relative w-full max-w-sm rounded-[2rem] p-6 shadow-2xl ${isDarkMode ? 'bg-[#141A21] border border-white/10' : 'bg-white border border-slate-200'}`}
          >
            {dialogConfig.title && (
              <h3 className={`text-lg font-black mb-3 text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {dialogConfig.title}
              </h3>
            )}
            <p className={`text-sm mb-8 text-center font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {dialogConfig.message}
            </p>

            <div className="flex gap-3">
              {dialogConfig.type === 'confirm' && (
                <button
                  onClick={() => {
                    dialogConfig.onResolve(false);
                    setDialogConfig(null);
                  }}
                  className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  إلغاء
                </button>
              )}
              <button
                onClick={() => {
                  dialogConfig.onResolve(true);
                  setDialogConfig(null);
                }}
                className={`flex-1 py-3.5 rounded-xl font-black text-sm text-white shadow-lg ${dialogConfig.isDanger ? 'bg-rose-500' : 'bg-[var(--primary-color)]'}`}
              >
                {dialogConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogsReady && (
        <>
          <SharedRecordView
            partnerId={partnerId}
            partnerName={partnerName}
            partnerGender={partnerGender}
            isDarkMode={isDarkMode}
            ledgers={ledgers}
            addLedgerRecord={addLedgerRecord}
            updateLedgerRecord={updateLedgerRecord}
            deleteLedgerRecord={deleteLedgerRecord}
            requestLedgerEdit={requestLedgerEdit}
            editRequests={editRequests}
            globalSettings={globalSettings}
            partnerMessage={partnerMessages?.[partnerId]}
            clearPartnerMessage={clearPartnerMessage}
            notificationHistory={notificationHistory}
            notificationArchive={notificationArchive}
            registerNotification={registerPartnerNotification}
            onOpenNotifications={markPartnerNotificationsAsRead}
            syncLedgerRecordToServer={async (record) => (
              isFirebaseConfigured
                ? updateReceiptFields(record.id, {
                    amount: Number(record.amount) || 0,
                    note: String(record.note || '').trim(),
                    editedAt: record.editedAt || new Date().toISOString(),
                  })
                : upsertPartnerLedgerRecordOnServer({ partnerId, record })
            )}
            telegramTopicId={telegramTopicId}
            onOpenSettings={() => setShowSettingsSheet(true)}
          />

          <PartnerSettingsSheet
            open={showSettingsSheet}
            onClose={() => setShowSettingsSheet(false)}
            partnerName={partnerName}
            partnerGender={partnerGender}
            isDarkMode={isDarkMode}
            settings={partnerSettings}
            updateSetting={updatePartnerSetting}
            isBiometricAvailable={biometricAvailable}
            onEnableBiometric={handleEnableBiometric}
            onDisableBiometric={handleDisableBiometric}
            onRequestPinReset={requestPinResetFromAdmin}
          />
        </>
      )}
    </>
  );
};

export default SharedPartnerRoot;
