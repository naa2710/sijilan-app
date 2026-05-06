import { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  shouldLockByTimeout, 
  touchSecurityActivity 
} from '../utils/securitySession';
import { 
  readNotificationHistory, 
  readArchivedNotificationHistory,
  markAllNotificationsRead
} from '../utils/notifications';
import { playNotificationSound } from '../utils/notificationSound';

const ADMIN_ACTIVE_TAB_STORAGE_KEY = 'financial_admin_active_tab';
const ADMIN_NOTIFICATION_HISTORY_KEY = 'financial_admin_notification_history';
const ADMIN_SECURITY_ACTIVITY_KEY = 'financial_admin_security_activity';
const ADMIN_TABS = new Set([
  'home', 'operations', 'individual', 'reconciliation', 'reports', 'accounts', 'personal_accounts', 'settings',
]);

export const useAppLogic = (globalSettings, editRequests, ledgers) => {
  // --- Security ---
  const [isLocked, setIsLocked] = useState(() => shouldLockByTimeout({
    pin: globalSettings.security?.pin,
    timeoutMinutes: globalSettings.security?.lockTimeoutMinutes,
    storageKey: ADMIN_SECURITY_ACTIVITY_KEY,
  }));

  // --- Tabs ---
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = window.localStorage.getItem(ADMIN_ACTIVE_TAB_STORAGE_KEY);
      return ADMIN_TABS.has(savedTab) ? savedTab : 'home';
    } catch { return 'home'; }
  });

  useEffect(() => {
    window.localStorage.setItem(ADMIN_ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  // --- UI State ---
  const [showFlowchart, setShowFlowchart] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialogConfig, setDialogConfig] = useState(null);

  // --- Notifications ---
  const [notificationHistory, setNotificationHistory] = useState(() => (
    readNotificationHistory(ADMIN_NOTIFICATION_HISTORY_KEY, globalSettings.notifications?.retentionDays)
  ));
  
  const [seenPartnerReceiptIds, setSeenPartnerReceiptIds] = useState(() => (
    new Set(
      Object.values(ledgers || {})
        .flat()
        .filter((record) => record?.source === 'partner')
        .map((record) => record.id)
    )
  ));

  const partnerReceiptNotifications = useMemo(() => (
    Object.entries(ledgers || {})
      .flatMap(([partnerId, ledgerList]) => {
        const partner = (globalSettings.partners || []).find((item) => item.id === Number(partnerId));
        return (ledgerList || [])
          .filter((record) => record?.source === 'partner')
          .map((record) => ({
            id: record.id,
            partnerId: Number(partnerId),
            partnerName: partner?.name || `فرد ${partnerId}`,
            amount: Number(record.amount) || 0,
            date: record.date,
            note: record.note || '',
          }));
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  ), [ledgers, globalSettings.partners]);

  const unreadPartnerReceiptCount = useMemo(() => (
    partnerReceiptNotifications.filter((notification) => !seenPartnerReceiptIds.has(notification.id)).length
  ), [partnerReceiptNotifications, seenPartnerReceiptIds]);

  // --- Security Timers ---
  useEffect(() => {
    if (isLocked) return;
    touchSecurityActivity(ADMIN_SECURITY_ACTIVITY_KEY);
    const handleActivity = () => touchSecurityActivity(ADMIN_SECURITY_ACTIVITY_KEY);
    const intervalId = window.setInterval(() => {
      if (shouldLockByTimeout({
        pin: globalSettings.security?.pin,
        timeoutMinutes: globalSettings.security?.lockTimeoutMinutes,
        storageKey: ADMIN_SECURITY_ACTIVITY_KEY,
      })) setIsLocked(true);
    }, 15000);

    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('focus', handleActivity);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('focus', handleActivity);
    };
  }, [globalSettings.security?.lockTimeoutMinutes, globalSettings.security?.pin, isLocked]);

  return {
    isLocked, setIsLocked,
    activeTab, setActiveTab,
    showFlowchart, setShowFlowchart,
    isDownloading, setIsDownloading,
    copied, setCopied,
    dialogConfig, setDialogConfig,
    notificationHistory, setNotificationHistory,
    unreadPartnerReceiptCount,
    markPartnerReceiptsAsSeen: () => {
        setSeenPartnerReceiptIds(new Set(partnerReceiptNotifications.map(n => n.id)));
        setNotificationHistory(markAllNotificationsRead(ADMIN_NOTIFICATION_HISTORY_KEY, globalSettings.notifications?.retentionDays));
    }
  };
};
