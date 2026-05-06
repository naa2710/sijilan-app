import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';

import { Calculator, Delete, Divide, X, Minus, Plus, Equal, CheckCircle2 } from 'lucide-react';
import { 
  calculateFinancialResults, 
  calculateReconciliation, 
  calculateIndividual,
  toNumber
} from './utils/finance';

// Views (Lazy Loaded)
const HomeView = lazy(() => import('./views/HomeView'));
const LedgersView = lazy(() => import('./views/LedgersView'));
const OperationsView = lazy(() => import('./views/OperationsView'));
const ReconciliationView = lazy(() => import('./views/ReconciliationView'));
const ReportsView = lazy(() => import('./views/ReportsView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const IndividualView = lazy(() => import('./views/IndividualView'));
const AbdulalemView = lazy(() => import('./views/AbdulalemView'));

// Components
import BottomNavBar from './components/layout/BottomNavBar';
import Sidebar from './components/layout/Sidebar';
import { Keypad } from './components/Keypad';

// Utils
import { playNotificationSound, primeNotificationAudio } from './utils/notificationSound';
import { 
  subscribeAdminEvents, 
  fetchQueuedAdminReceipts, 
  fetchEditRequestsFromServer,
  fetchPinResetRequestsFromServer,
  resolveEditRequestOnServer
} from './utils/adminSync';
import { 
  readNotificationHistory, 
  appendNotificationHistory, 
  markAllNotificationsRead 
} from './utils/notifications';
import { Bell, MessageSquare, History, AlertTriangle, Info, Clock, ExternalLink } from 'lucide-react';

const DEFAULT_SETTINGS = {
  names: { partyA: 'عبدالعالم', partyB: 'الإخوة', partyC: 'مريم' },
  financials: { partyAPct: 5, partyBPct: 15, bankCommRate: 2, partyCAmount: 500, autoApprove: false, defaultReceiptStatus: 'pending' },
  cycle: { days: 30 },
  appearance: { themeColor: '#E11D2E', isDarkMode: true },
  telegram: { botToken: '', adminChatId: '' },
  partners: [
    { id: '1', name: 'عبدالعالم', type: 'individual', isExcluded: false }, 
    { id: '2', name: 'الإخوة', type: 'group', isExcluded: false }
  ]
};

const App = () => {
  // --- 1. Global & UI State ---
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('sijilati_active_tab') || 'home');
  const [selectedPartnerId, setSelectedPartnerId] = useState(() => localStorage.getItem('sijilati_selected_partner_id') || null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialogConfig, setDialogConfig] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // --- 2. Financial & Data State ---
  const [inputs, setInputs] = useState({});
  const [abdalalemEntries, setAbdalalemEntries] = useState([]);
  const [history, setHistory] = useState([]);
  const [ledgers, setLedgers] = useState({});
  const [globalSettings, setGlobalSettings] = useState(DEFAULT_SETTINGS);
  
  const [results, setResults] = useState({
    discA: 0, discB: 0, totalPool: 0, mariamShare: 0, poolAfterMariam: 0,
    halfDistribution: 0, commA: 0, commB: 0, finalA: 0, finalB: 0, finalAsim: 0,
    totalToTransfer: 0, totalInitial: 0
  });

  const [individualInput, setIndividualInput] = useState('');
  const [reconciliation, setReconciliation] = useState({
    bankBalance: '', storeSales: '', brothersTransfers: '', abdulalemTransfers: '', womenTransfers: ''
  });
  const [reconResults, setReconResults] = useState({ expectedTotal: 0, difference: 0, status: 'balanced' });
  const [applyMariamDiscount, setApplyMariamDiscount] = useState(false);

  // --- 3. Notifications & Real-time State ---
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editRequests, setEditRequests] = useState([]);
  const [pinResetRequests, setPinResetRequests] = useState([]);
  const ADMIN_NOTIFICATION_KEY = 'financial_admin_notifications';

  // --- Calculator State ---
  const [showKeypad, setShowKeypad] = useState(false);
  const [activeInputKey, setActiveInputKey] = useState(null);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [targetPartner, setTargetPartner] = useState(null);

  // --- 3. Effects (Initial Load) ---
  useEffect(() => {
    const fetchData = async () => {
      console.log('App: Starting optimized data fetch...');
      try {
        const [ledgerRes, historyRes, abdalalemRes, settingsRes, editRequestsRes, pinResetsRes] = await Promise.all([
          fetch('/api/admin/ledger-state').then(r => r.json()).catch(() => ({ ok: false })),
          fetch('/api/admin/history').then(r => r.json()).catch(() => ({ ok: false })),
          fetch('/api/admin/abdalalem-ledger').then(r => r.json()).catch(() => ({ ok: false })),
          fetch('/api/admin/settings').then(r => r.json()).catch(() => ({ ok: false })),
          fetchEditRequestsFromServer().catch(() => []),
          fetchPinResetRequestsFromServer().catch(() => [])
        ]);

        if (ledgerRes.ok) {
          setLedgers(ledgerRes.ledgers || {});
        }
        if (historyRes.ok) {
          setHistory(historyRes.history || []);
        }
        if (abdalalemRes.ok) {
          setAbdalalemEntries(abdalalemRes.entries || []);
        }
        // Load settings from server (authoritative source); fallback to localStorage then DEFAULT
        if (settingsRes.ok && settingsRes.settings && Object.keys(settingsRes.settings).length > 0) {
          setGlobalSettings(prev => ({ ...DEFAULT_SETTINGS, ...settingsRes.settings }));
        } else {
          // Fallback: load from localStorage
          try {
            const saved = localStorage.getItem('financial_settings');
            if (saved) setGlobalSettings(prev => ({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) }));
          } catch (_) {}
        }
        setEditRequests(editRequestsRes || []);
        setPinResetRequests(pinResetsRes || []);
        
        setNotificationHistory(readNotificationHistory(ADMIN_NOTIFICATION_KEY));
      } catch (error) {
        console.error('App: Sync failed:', error);
      } finally {
        setIsLoadingData(false);
        const loader = document.getElementById('root-loading');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 500);
        }
      }
    };

    fetchData();

    // --- 3. Real-time Subscriptions ---
    const unsubscribe = subscribeAdminEvents({
      onReceiptQueued: ({ receipt }) => {
        const { partnerId, partnerName, record } = receipt;
        setLedgers(prev => ({
          ...prev,
          [partnerId]: [record, ...(prev[partnerId] || [])]
        }));
        
        const notification = {
          id: `receipt-${Date.now()}`,
          type: 'receipt',
          title: 'إيصال جديد',
          body: `أضاف ${partnerName} إيصالاً بمبلغ ${record.amount} ريال`,
          partnerId,
          partnerName,
          unread: true
        };
        
        setNotificationHistory(prev => appendNotificationHistory(ADMIN_NOTIFICATION_KEY, notification));
        playNotificationSound('coins').catch(() => {});
      },
      onEditRequestUpdated: ({ request }) => {
        setEditRequests(prev => {
          const exists = prev.some(r => r.id === request.id);
          return exists ? prev.map(r => r.id === request.id ? request : r) : [request, ...prev];
        });

        if (request.status === 'pending') {
          const notification = {
            id: `edit-req-${request.id}`,
            type: 'edit-request',
            title: 'طلب مراجعة',
            body: `طلب ${request.partnerName} مراجعة إيصال بمبلغ ${request.newAmount} ريال`,
            partnerId: request.partnerId,
            partnerName: request.partnerName,
            unread: true
          };
          setNotificationHistory(prev => appendNotificationHistory(ADMIN_NOTIFICATION_KEY, notification));
          playNotificationSound('review').catch(() => {});
        }
      },
      onPinResetRequest: ({ request }) => {
        setPinResetRequests(prev => [request, ...prev]);
        const notification = {
          id: `pin-reset-${request.id}`,
          type: 'pin-reset',
          title: 'طلب إعادة تعيين رمز',
          body: `طلب ${request.partnerName} إعادة تعيين رمز الدخول الخاص به.`,
          partnerId: request.partnerId,
          partnerName: request.partnerName,
          unread: true
        };
        setNotificationHistory(prev => appendNotificationHistory(ADMIN_NOTIFICATION_KEY, notification));
        playNotificationSound('warning').catch(() => {});
      },
      onMessageUpdated: ({ message }) => {
        const { partnerId, partnerName, text, sender } = message;
        if (sender === 'admin') return;
        
        // Handle incoming replies from partners
        const notification = {
          id: `msg-${Date.now()}`,
          type: 'message',
          title: `رسالة من ${partnerName}`,
          body: text,
          partnerId,
          partnerName,
          unread: true
        };
        setNotificationHistory(prev => appendNotificationHistory(ADMIN_NOTIFICATION_KEY, notification));
        playNotificationSound('message').catch(() => {});
      },
      onConnected: () => console.log('Admin real-time connected'),
      onError: () => console.warn('Admin real-time error, retrying...')
    });

    // --- 4. Globals ---
    window.appAlert = (message, title = '') => {
      return new Promise((resolve) => setDialogConfig({ type: 'alert', message, title, onResolve: resolve }));
    };
    window.appConfirm = (message, confirmText = 'موافق', title = 'تأكيد') => {
      const finalConfirmText = typeof confirmText === 'string' ? confirmText : 'موافق';
      return new Promise((resolve) => setDialogConfig({ type: 'confirm', message, title, confirmText: finalConfirmText, onResolve: resolve }));
    };
    window.appPrompt = (message, defaultValue = '', title = 'إدخال نص') => {
      return new Promise((resolve) => setDialogConfig({ type: 'prompt', message, title, defaultValue, onResolve: resolve }));
    };

    return () => {
      unsubscribe();
    };
  }, []);

  // --- 3. Effects (Sync Ledger Sum to Inputs) ---
  useEffect(() => {
    const totalLedgerSum = Object.values(ledgers).reduce((acc, partnerRecords) => {
      const partnerSum = (partnerRecords || []).reduce((sum, r) => sum + (toNumber(r.amount) || 0), 0);
      return acc + partnerSum;
    }, 0);
    
    if (totalLedgerSum > 0) {
      setInputs(prev => ({
        ...prev,
        brothers: totalLedgerSum
      }));
    }
  }, [ledgers]);

  // --- 4. Derived Data ---
  const individualData = useMemo(() => calculateIndividual(individualInput, globalSettings), [individualInput, globalSettings]);

  // --- 4. Effects (Sync & Derived Data) ---
  useEffect(() => {
    const total = abdalalemEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    setInputs(prev => {
      const current = parseFloat(prev.abdulalem) || 0;
      if (Math.abs(current - total) < 0.01) return prev;
      return { ...prev, abdulalem: total.toString() };
    });
  }, [abdalalemEntries]);

  useEffect(() => {
    if (isLoadingData) return;
    const sync = async () => {
       try {
         await fetch('/api/admin/abdalalem-ledger', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ entries: abdalalemEntries })
         });
       } catch (e) { console.error('Failed to sync abdalalem ledger:', e); }
    };
    sync();
  }, [abdalalemEntries, isLoadingData]);

  useEffect(() => {
    if (isLoadingData) return; // Don't sync before initial load completes
    localStorage.setItem('financial_settings', JSON.stringify(globalSettings));
    // Also persist to server so settings survive across sessions
    fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(globalSettings)
    }).catch(e => console.warn('Settings server sync failed:', e));
  }, [globalSettings, isLoadingData]);

  useEffect(() => {
    localStorage.setItem('sijilati_active_tab', activeTab);
    if (activeTab !== 'accounts') {
      // Optional: clear selected partner if moving away from accounts? 
      // User didn't ask for this, but it's common. 
      // Actually, user wants refresh to KEEP state, so we keep it.
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedPartnerId) {
      localStorage.setItem('sijilati_selected_partner_id', selectedPartnerId);
    } else {
      localStorage.removeItem('sijilati_selected_partner_id');
    }
  }, [selectedPartnerId]);


  useEffect(() => {
    const partners = globalSettings.partners || [];
    let totalLedgers = 0;
    
    partners.forEach(partner => {
      if (partner.isExcluded) return;
      const partnerRecords = ledgers[partner.id] || [];
      const approvedSum = partnerRecords.reduce((sum, rec) => {
        return rec.status === 'approved' ? sum + (parseFloat(rec.amount) || 0) : sum;
      }, 0);
      totalLedgers += approvedSum;
    });

    setInputs(prev => {
      const current = parseFloat(prev.brothers) || 0;
      if (current !== totalLedgers) {
        return { ...prev, brothers: totalLedgers > 0 ? totalLedgers.toString() : '' };
      }
      return prev;
    });
  }, [ledgers, globalSettings.partners]);

  const updateSetting = (section, key, value) => {
    setGlobalSettings(prev => {
      if (key === null || key === undefined) {
        return { ...prev, [section]: value };
      }
      return {
        ...prev,
        [section]: { ...prev[section], [key]: value }
      };
    });
  };

  const updateReceiptStatus = async (receiptId, status) => {
    // Optimistic update
    setLedgers(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(partnerId => {
        if (Array.isArray(next[partnerId])) {
          next[partnerId] = next[partnerId].map(r => 
            String(r.id) === String(receiptId) ? { ...r, status } : r
          );
        }
      });
      return next;
    });

    // Server update
    try {
      await fetch('/api/admin/receipt-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId, status })
      });
    } catch (e) {
      console.error('Failed to sync status:', e);
    }
  };

  const handleConfirmAll = async (partnerId) => {
    // Optimistic Update
    setLedgers(prev => {
      const partnerKey = String(partnerId);
      if (!prev[partnerKey]) return prev;
      return {
        ...prev,
        [partnerKey]: prev[partnerKey].map(r => 
          r.status === 'pending' ? { ...r, status: 'approved', updatedAt: new Date().toISOString() } : r
        )
      };
    });

    // Server Sync
    try {
      await fetch('/api/admin/receipts/confirm-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId })
      });
    } catch (e) {
      console.error('Failed to sync confirm all:', e);
    }
  };

  const handleResolveEditRequest = async (requestId, status) => {
    try {
      const result = await resolveEditRequestOnServer({ id: requestId, status });
      if (result.ok) {
        // 1. Update the request status locally
        setEditRequests(prev => prev.map(req => 
          String(req.id) === String(requestId) ? { ...req, status } : req
        ));

        // 2. If approved, update the actual ledger record
        if (status === 'approved' && result.request) {
          const { partnerId, recordId, newAmount, note } = result.request;
          setLedgers(prev => ({
            ...prev,
            [partnerId]: (prev[partnerId] || []).map(r => 
              String(r.id) === String(recordId) ? { ...r, amount: newAmount, note } : r
            )
          }));
        }

        window.appAlert?.(`تم ${status === 'approved' ? 'قبول' : 'رفض'} طلب التعديل بنجاح.`);
      }
    } catch (error) {
      window.appAlert?.(error.message || 'تعذر معالجة طلب المراجعة الآن.');
    }
  };

  // (Settings sync is handled by the effect above; this duplicate is removed)

  const saveToHistory = () => {
    const newRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      inputs: { ...inputs },
      applyMariamDiscount,
      results: { ...results }
    };
    setHistory(prev => [newRecord, ...prev]);
    alert('تم حفظ العملية في السجل بنجاح!');
  };

  const deleteHistoryRecord = (id) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) {
      setHistory(prev => prev.filter(r => r.id !== id));
    }
  };

  // --- Calculator Logic ---


  const performCalculation = (op, nextValue) => {
    const prev = parseFloat(prevValue);
    const curr = parseFloat(nextValue);
    if (isNaN(prev) || isNaN(curr)) return nextValue;
    switch (op) {
      case '+': return (prev + curr).toString();
      case '-': return (prev - curr).toString();
      case '*': return (prev * curr).toString();
      case '/': return curr !== 0 ? (prev / curr).toString() : '0';
      default: return nextValue;
    }
  };

  const handleDigit = (digit) => {
    if (waitingForOperand) {
      setCalcDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setCalcDisplay(calcDisplay === '0' ? digit : calcDisplay + digit);
    }
  };

  const handleOperator = (nextOperator) => {
    const inputValue = parseFloat(calcDisplay);
    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const result = performCalculation(operator, calcDisplay);
      setCalcDisplay(result);
      setPrevValue(result);
    }
    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const handleEquals = () => {
    if (!operator) return;
    const result = performCalculation(operator, calcDisplay);
    setCalcDisplay(result);
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleClear = () => {
    setCalcDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleDelete = () => {
    setCalcDisplay(calcDisplay.length > 1 ? calcDisplay.slice(0, -1) : '0');
  };


  const openKeypad = (key, currentVal, partner = null) => {
    setActiveInputKey(key);
    setCalcDisplay(currentVal && currentVal !== '' ? currentVal.toString() : '0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setTargetPartner(partner);
    setShowKeypad(true);
  };

  const confirmValue = () => {
    if (activeInputKey === 'addReceipt' && targetPartner) {
      const amount = parseFloat(calcDisplay);
      if (amount > 0) {
        const newReceipt = {
          id: `R-${Date.now()}`,
          date: new Date().toISOString(),
          amount: amount,
          status: 'pending',
          source: 'admin',
          note: 'تمت الإضافة من الإدارة'
        };
        setLedgers(prev => ({
          ...prev,
          [targetPartner.id]: [newReceipt, ...(prev[targetPartner.id] || [])]
        }));
        window.appAlert?.('تمت إضافة الإيصال بنجاح!');
      }
    } else {
      updateInputValue(activeInputKey, calcDisplay);
    }
    setShowKeypad(false);
    setTargetPartner(null);
  };

  const updateInputValue = (key, val) => {
    // Check if the key corresponds to a partner ID or the fixed accounts
    const isPartner = globalSettings.partners?.some(p => String(p.id) === String(key));
    
    if (isPartner || key === 'abdulalem' || key === 'brothers') {
      setInputs(prev => ({ ...prev, [key]: val }));
    } else if (key === 'individual') {
      setIndividualInput(val);
    } else {
      setReconciliation(prev => ({ ...prev, [key]: val }));
    }
  };

  // Auto-sync individuals ledger total with the manual collective input
  useEffect(() => {
    const partners = globalSettings.partners || [];
    let totalLedgers = 0;
    
    partners.forEach(partner => {
      if (partner.isExcluded) return;
      const partnerRecords = ledgers[partner.id] || [];
      const approvedSum = partnerRecords.reduce((sum, rec) => {
        return rec.status === 'approved' ? sum + (parseFloat(rec.amount) || 0) : sum;
      }, 0);
      totalLedgers += approvedSum;
    });

    setInputs(prev => {
      const current = parseFloat(prev.brothers) || 0;
      if (current !== totalLedgers) {
        return { ...prev, brothers: totalLedgers > 0 ? totalLedgers.toString() : '' };
      }
      return prev;
    });
  }, [ledgers, globalSettings.partners]);

  useEffect(() => {
    setResults(calculateFinancialResults(inputs, applyMariamDiscount, globalSettings));
  }, [inputs, applyMariamDiscount, globalSettings]);

  useEffect(() => {
    setReconResults(calculateReconciliation(reconciliation));
  }, [reconciliation]);



  // --- Actions ---
  const copyReport = async () => {
    const report = `📊 *تقرير الحساب المالي النهائي*\n--------------------------\n👤 *${globalSettings.names.partyA}:* ${results.finalA.toLocaleString()} ريال\n👥 *${globalSettings.names.partyB}:* ${results.finalB.toLocaleString()} ريال\n👤 *عاصم:* ${results.finalAsim.toLocaleString()} ريال\n🌸 *${globalSettings.names.partyC}:* ${results.mariamShare.toLocaleString()} ريال\n--------------------------\n💰 *المبلغ المستحق للتحويل:* ${results.totalToTransfer.toLocaleString()} ريال`;
    
    try {
      await navigator.clipboard.writeText(report.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard failed:', err);
      alert('تعذر نسخ التقرير تلقائياً.');
    }
  };

  const downloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    await new Promise(resolve => setTimeout(resolve, 150));
    try {
      const { toJpeg: toJpegLib } = await import('html-to-image');
      const { jsPDF: jsPDFLib } = await import('jspdf');
      
      const node = document.getElementById('report-to-capture');
      if (!node) throw new Error('تعذر العثور على العنصر المطلوب للتصدير');
      
      const dataUrl = await toJpegLib(node, { quality: 0.95, backgroundColor: '#FFFFFF', pixelRatio: 2 });
      const pdf = new jsPDFLib('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`sijilati-report-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('PDF Error:', error);
      setDialogConfig({
        type: 'alert',
        title: 'خطأ',
        message: 'حدث خطأ أثناء محاولة تصدير ملف الـ PDF. يرجى المحاولة لاحقاً.',
        onResolve: () => setDialogConfig(null)
      });
    } finally {
      setIsDownloading(false);
    }
  };





  const renderView = () => {
    const props = {
      isDarkMode: globalSettings.appearance.isDarkMode,
      globalSettings,
      results,
      inputs,
      updateInputValue,
      openKeypad,
      applyMariamDiscount,
      setApplyMariamDiscount,
      saveToHistory,
      history,
      deleteHistoryRecord,
      setHistory,
      ledgers,
      setLedgers,
      reconciliation,
      reconResults,
      individualInput,
      individualData,
      isDownloading,
      downloadPDF,
      copyReport,
      copied,
      setActiveTab,
      updateReceiptStatus,
      editRequests,
      resolveEditRequest: handleResolveEditRequest,
      selectedPartnerId,
      setSelectedPartnerId,
      updateGlobalSetting: updateSetting,

      clearLedgers: async () => {
        setLedgers({});
        // Server sync for global clear
        try {
          await fetch('/api/admin/clear-all-ledgers', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          localStorage.setItem('financial_ledgers', '{}');
          
          // Send Reset Message to ALL partners
          const partners = globalSettings.partners || [];
          for (const partner of partners) {
            if (String(partner.id) === '1' || String(partner.id) === '2') continue; // Skip generic groups if any
            try {
               await pushPartnerMessageToServer({
                 partnerId: partner.id,
                 partnerName: partner.name,
                 text: '__RESET__',
                 sentAt: new Date().toISOString(),
               });
            } catch (e) {}
          }
        } catch (e) {
          console.error('Failed to sync clear command:', e);
        }
      },
      clearPartnerLedger: async (partnerId) => {
        setLedgers(prev => {
          const next = { ...prev };
          delete next[partnerId];
          return next;
        });
        
        try {
          // Push to server
          await pushLedgerStateToServer(partnerId, []);
          
          // Send Reset Message to Partner UI
          const partner = globalSettings.partners?.find(p => String(p.id) === String(partnerId));
          if (partner) {
             await pushPartnerMessageToServer({
               partnerId: partner.id,
               partnerName: partner.name,
               text: '__RESET__',
               sentAt: new Date().toISOString(),
             });
          }
        } catch (e) {
          console.error('Failed to clear partner ledger:', e);
        }
      },
      abdalalemEntries,
      setAbdalalemEntries,
      notificationHistory,
      unreadNotificationsCount: notificationHistory.filter(n => n.unread).length,
      onOpenNotifications: () => {
        setShowNotifications(true);
        setNotificationHistory(markAllNotificationsRead(ADMIN_NOTIFICATION_KEY));
      }
    };


    switch (activeTab) {
      case 'home': return <HomeView {...props} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'accounts': return <LedgersView {...props} confirmAll={handleConfirmAll} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'abdulalem': return <AbdulalemView {...props} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'operations': return <OperationsView {...props} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'reconciliation': return <ReconciliationView {...props} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'reports': return <ReportsView {...props} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'settings': return <SettingsView {...props} updateSetting={updateSetting} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'individual': return <IndividualView {...props} setIsSidebarOpen={setIsSidebarOpen} />;
      default: return <HomeView {...props} setIsSidebarOpen={setIsSidebarOpen} />;
    }
  };

  return (
    <div className={`min-h-screen font-['Changa',_sans-serif] text-right transition-colors duration-300 ${globalSettings.appearance.isDarkMode ? 'dark bg-[#0B0E12] text-white' : 'bg-[#F8FAFC] text-[#0F172A]'}`} dir="rtl">
      <style>{`
        :root {
          --primary-color: ${globalSettings.appearance.themeColor};
          --primary-faint: ${globalSettings.appearance.themeColor}1A;
          --primary-glow: ${globalSettings.appearance.themeColor}4D;
          --primary-hover: ${globalSettings.appearance.themeColor}CC;
          --app-bg: ${globalSettings.appearance.isDarkMode ? '#0B0E12' : '#F8FAFC'};
          --card-bg: ${globalSettings.appearance.isDarkMode ? '#141A21' : '#FFFFFF'};
          --card-border: ${globalSettings.appearance.isDarkMode ? '#1F2A3666' : '#E2E8F0'};
          --text-main: ${globalSettings.appearance.isDarkMode ? '#FFFFFF' : '#0F172A'};
          --text-muted: ${globalSettings.appearance.isDarkMode ? '#AAB3BF' : '#64748B'};
          --input-bg: ${globalSettings.appearance.isDarkMode ? '#0B0E12' : '#F1F5F9'};
          --nav-bg: ${globalSettings.appearance.isDarkMode ? '#0B0E12E6' : '#FFFFFFE6'};
        }
        body { background-color: var(--app-bg); margin: 0; user-select: none; -webkit-tap-highlight-color: transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <main className="max-w-md mx-auto pb-32 px-4 pt-4 no-scrollbar">
        {isLoadingData ? (
           <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="w-12 h-12 border-4 border-[var(--primary-color)]/20 border-t-[var(--primary-color)] rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-500 animate-pulse">جاري جلب البيانات من السيرفر...</p>
           </div>
        ) : (
           <Suspense fallback={
             <div className="flex items-center justify-center min-h-[50vh]">
               <div className="w-8 h-8 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin" />
             </div>
           }>
             {renderView()}
           </Suspense>
        )}
      </main>

      <BottomNavBar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab === 'accounts' && activeTab === 'accounts') {
            setSelectedPartnerId(null);
          }
          setActiveTab(tab);
        }} 
        unreadCount={notificationHistory.filter(n => n.unread).length}
        isDarkMode={globalSettings.appearance.isDarkMode} 
      />

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab === 'accounts' && activeTab === 'accounts') {
            setSelectedPartnerId(null);
          }
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }} 
        isDarkMode={globalSettings.appearance.isDarkMode} 
        toggleDarkMode={() => updateSetting('appearance', 'isDarkMode', !globalSettings.appearance.isDarkMode)}
        globalSettings={globalSettings}
      />


      {/* Admin Notification Overlay */}
      {showNotifications && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div 
            onClick={() => setShowNotifications(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <div className={`relative w-full max-w-sm max-h-[80vh] rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-[#141A21] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>الإشعارات والطلبات</h3>
              <button 
                onClick={() => setShowNotifications(false)}
                className={`p-2 rounded-xl ${isDarkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-50 text-slate-500'}`}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-3">
              {notificationHistory.length === 0 ? (
                <div className="py-12 text-center space-y-4 opacity-30">
                  <Bell size={48} className="mx-auto" />
                  <p className="text-xs font-black">لا توجد إشعارات جديدة حالياً</p>
                </div>
              ) : (
                notificationHistory.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-4 rounded-[1.8rem] border transition-all ${
                      isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        notif.type === 'receipt' ? 'bg-emerald-500/10 text-emerald-500' :
                        notif.type === 'edit-request' ? 'bg-indigo-500/10 text-indigo-500' :
                        notif.type === 'message' ? 'bg-sky-500/10 text-sky-500' :
                        'bg-slate-500/10 text-slate-500'
                      }`}>
                        {notif.type === 'receipt' ? <CheckCircle2 size={18} /> :
                         notif.type === 'edit-request' ? <Clock size={18} /> :
                         notif.type === 'message' ? <MessageSquare size={18} /> :
                         <Bell size={18} />}
                      </div>
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{notif.title}</span>
                          <span className="text-[9px] font-bold opacity-40">{new Date(notif.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{notif.body}</p>
                        <div className="mt-3 flex items-center gap-2">
                           <button 
                             onClick={() => {
                               setShowNotifications(false);
                               setActiveTab('accounts');
                             }}
                             className={`px-3 py-1.5 rounded-lg text-[9px] font-black flex items-center gap-1.5 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-700 shadow-sm'}`}
                           >
                             عرض التفاصيل <ExternalLink size={10} />
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Keypad
        isOpen={showKeypad}
        onClose={() => setShowKeypad(false)}
        display={calcDisplay}
        prevValue={prevValue}
        operator={operator}
        onDigit={handleDigit}
        onOperator={handleOperator}
        onClear={handleClear}
        onDelete={handleDelete}
        onEquals={handleEquals}
        onConfirm={confirmValue}
        isDarkMode={globalSettings.appearance.isDarkMode}
      />

      {dialogConfig && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300">
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
              className={`relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl transition-all duration-300 transform scale-100 ${globalSettings.appearance.isDarkMode ? 'bg-[#141A21] border border-white/10' : 'bg-white border border-slate-200'}`}
            >
              {dialogConfig.title && (
                <h3 className={`text-xl font-black mb-4 text-center ${globalSettings.appearance.isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {dialogConfig.title}
                </h3>
              )}
              <p className={`text-sm ${dialogConfig.type === 'prompt' ? 'mb-4' : 'mb-10'} text-center font-bold leading-relaxed ${globalSettings.appearance.isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {dialogConfig.message}
              </p>

              {dialogConfig.type === 'prompt' && (
                <div className="mb-8">
                  <textarea
                    autoFocus
                    className={`w-full p-4 rounded-2xl border-2 outline-none text-xs font-bold leading-relaxed transition-all ${
                      globalSettings.appearance.isDarkMode 
                        ? 'bg-black/20 border-white/5 text-white focus:border-[var(--primary-color)]/50' 
                        : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-[var(--primary-color)]/50'
                    }`}
                    rows={4}
                    placeholder="اكتب رسالتك هنا..."
                    defaultValue={dialogConfig.defaultValue}
                    id="app-prompt-input"
                  />
                </div>
              )}

              <div className="flex gap-4">
                {dialogConfig.type === 'confirm' && (
                  <button
                    onClick={() => {
                      dialogConfig.onResolve(false);
                      setDialogConfig(null);
                    }}
                    className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${globalSettings.appearance.isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                  >
                    إلغاء
                  </button>
                )}
                <button
                  onClick={() => {
                    const val = dialogConfig.type === 'prompt' 
                      ? document.getElementById('app-prompt-input')?.value 
                      : true;
                    dialogConfig.onResolve(val);
                    setDialogConfig(null);
                  }}
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-white shadow-lg bg-[var(--primary-color)] shadow-[var(--primary-glow)]"
                >
                  {dialogConfig.confirmText || 'حسناً'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

const CalcButton = ({ onClick, label, icon, active, isNum, className = "" }) => (
  <button 
    onClick={onClick} 
    className={`h-16 rounded-2xl text-xl font-black transition-all active:scale-90 flex items-center justify-center ${
      active ? 'bg-[var(--primary-color)] text-white shadow-lg' : 
      isNum ? 'bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--card-border)]' : 
      'bg-[var(--card-border)] text-slate-500'
    } ${className}`}
  >
    {label !== null ? label : icon}
  </button>
);

export default App;
