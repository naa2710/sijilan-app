import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

import { isFirebaseConfigured } from '../firebase';
import {
    groupReceiptsByPartner,
    subscribeToAllReceipts,
    updateReceiptStatus as updateReceiptStatusInFirestore,
} from '../services/receiptService';
import { 
    calculateFinancialResults, 
    calculateReconciliation, 
    calculateIndividual,
    getLedgerRecordStatus,
    isLedgerRecordConfirmed,
    summarizeLedgerRecords,
    toNumber
} from '../utils/finance';
import {
    BACKUP_LIMITS,
    buildBackupPayload,
    createBackupSnapshot,
    downloadBackupPayload,
} from '../utils/backup';
import { captureNodeAsPng } from '../utils/capture';
import { formatDateTime, formatNumber, toEnglishDigits } from '../utils/format';
import { getPartnerLabels, normalizePartners } from '../utils/partnerProfile';
import {
    authorizeGoogleDrive,
    consumeGoogleDriveRedirectResult,
    downloadBackupFromGoogleDrive,
    getGoogleDriveErrorMessage,
    prewarmGoogleDriveAuth,
    listGoogleDriveBackups,
    revokeGoogleDriveToken,
    uploadBackupToGoogleDrive,
} from '../utils/googleDrive';
import { copyTextToClipboard } from '../utils/copy';
import { sendLedgerExportReportDirectlyToWhatsApp } from '../utils/whatsappDirect';
import { ADMIN_WHATSAPP_NUMBER } from '../utils/whatsapp';
import {
    clearPartnerMessageFromServer,
    pushPartnerMessageToServer,
    resolveEditRequestOnServer,
} from '../utils/adminSync';

const FinancialContext = createContext();

const DEFAULT_SETTINGS = {
    names: { partyA: 'عبد العالم', partyB: 'الأخوة', partyC: 'مريم' },
    financials: { partyAPct: 25, partyBPct: 10, bankCommRate: 2, partyCAmount: 4000 },
    appearance: { themeColor: '#EF233C', language: 'ar', isDarkMode: false },
    notifications: { newReceiptAlerts: true, newReceiptSound: true, retentionDays: 5 },
    security: { lockTimeoutMinutes: 30 },
    partners: [
        { id: 1, name: 'فرد 1', whatsappNumber: '', gender: 'male' },
        { id: 2, name: 'فرد 2', whatsappNumber: '', gender: 'male' }
    ],
    brothersMode: 'group',
    receiptApprovalMode: 'auto',
};

// --- Helper for safe storage access ---
const getStorageItem = (key, fallback) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        return fallback;
    }
};

const mergeDeep = (baseValue, overrideValue) => {
    if (Array.isArray(baseValue)) {
        return Array.isArray(overrideValue) ? overrideValue : baseValue;
    }
    if (baseValue && typeof baseValue === 'object') {
        const safeOverride = overrideValue && typeof overrideValue === 'object' ? overrideValue : {};
        const mergedEntries = Object.keys(baseValue).map((key) => [key, mergeDeep(baseValue[key], safeOverride[key])]);
        for (const [key, value] of Object.entries(safeOverride)) {
            if (!Object.prototype.hasOwnProperty.call(baseValue, key)) {
                mergedEntries.push([key, value]);
            }
        }
        return Object.fromEntries(mergedEntries);
    }
    return typeof overrideValue === 'undefined' ? baseValue : overrideValue;
};

const mergeSettingsWithDefaults = (settings = {}) => {
    const merged = mergeDeep(DEFAULT_SETTINGS, settings);
    return {
        ...merged,
        partners: normalizePartners(merged?.partners),
    };
};

export const FinancialProvider = ({ children }) => {
    // 1. Core State
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = getStorageItem('financial_darkMode', null);
        if (saved !== null) return saved;
        const savedSettings = getStorageItem('financial_settings', DEFAULT_SETTINGS);
        return savedSettings?.appearance?.isDarkMode ?? DEFAULT_SETTINGS.appearance.isDarkMode;
    });

    const [globalSettings, setGlobalSettings] = useState(() => 
        mergeSettingsWithDefaults(getStorageItem('financial_settings', DEFAULT_SETTINGS))
    );

    const [history, setHistory] = useState(() => getStorageItem('financial_history', []));
    const [accountEntries, setAccountEntries] = useState(() => getStorageItem('financial_accounts', []));
    const [ledgers, setLedgers] = useState(() => getStorageItem('financial_ledgers', {}));
    const [receipts, setReceipts] = useState([]);
    const [editRequests, setEditRequests] = useState(() => getStorageItem('financial_edit_requests', []));
    const [partnerMessages, setPartnerMessages] = useState(() => getStorageItem('financial_partner_messages', {}));
    
    const [inputs, setInputs] = useState({ abdulalem: '', brothers: '' });
    const [reconciliation, setReconciliation] = useState({
        bankBalance: '', storeSales: '', brothersTransfers: '', abdulalemTransfers: '', womenTransfers: ''
    });
    const [applyMariamDiscount, setApplyMariamDiscount] = useState(false);
    const [individualInput, setIndividualInput] = useState('');
    const [individualBrothersAmts, setIndividualBrothersAmts] = useState({});
    const [accountForm, setAccountForm] = useState({
        direction: 'receivable', party: '', title: '', amount: '', note: ''
    });

    const [backupState, setBackupState] = useState(() => 
        getStorageItem('financial_backup_state', { 
            automaticSnapshot: null, 
            manualSnapshots: [], 
            driveMeta: { lastSyncedAt: null, lastFileId: '', lastFileName: '' } 
        })
    );

    const [backupBusyAction, setBackupBusyAction] = useState('');
    const [backupNotice, setBackupNotice] = useState('');
    const [driveAccessToken, setDriveAccessToken] = useState('');
    const [driveBackups, setDriveBackups] = useState([]);
    const [googleDriveReady, setGoogleDriveReady] = useState(Capacitor.isNativePlatform());
    const lastAutoBrothersTransfersRef = useRef(null);

    // 2. Persistence
    useEffect(() => { localStorage.setItem('financial_darkMode', JSON.stringify(isDarkMode)); }, [isDarkMode]);
    useEffect(() => { localStorage.setItem('financial_settings', JSON.stringify(globalSettings)); }, [globalSettings]);
    useEffect(() => { localStorage.setItem('financial_history', JSON.stringify(history)); }, [history]);
    useEffect(() => { localStorage.setItem('financial_accounts', JSON.stringify(accountEntries)); }, [accountEntries]);
    useEffect(() => { localStorage.setItem('financial_ledgers', JSON.stringify(ledgers)); }, [ledgers]);
    useEffect(() => { localStorage.setItem('financial_edit_requests', JSON.stringify(editRequests)); }, [editRequests]);
    useEffect(() => { localStorage.setItem('financial_partner_messages', JSON.stringify(partnerMessages)); }, [partnerMessages]);
    useEffect(() => { localStorage.setItem('financial_backup_state', JSON.stringify(backupState)); }, [backupState]);

    // 3. Drive Initialization
    useEffect(() => {
        let cancelled = false;
        const bootstrapGoogleDrive = async () => {
            try {
                const redirectResult = consumeGoogleDriveRedirectResult();
                if (redirectResult?.access_token && !cancelled) {
                    setDriveAccessToken(redirectResult.access_token);
                    setBackupNotice('تم ربط Google Drive بنجاح.');
                    await refreshDriveBackups(redirectResult.access_token);
                }
            } catch (error) {
                if (!cancelled) setBackupNotice(getGoogleDriveErrorMessage(error));
            }
            try {
                await prewarmGoogleDriveAuth();
                if (!cancelled) setGoogleDriveReady(true);
            } catch {
                if (!cancelled) setGoogleDriveReady(Capacitor.isNativePlatform());
            }
        };
        bootstrapGoogleDrive();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!isFirebaseConfigured) {
            return undefined;
        }

        return subscribeToAllReceipts(
            (nextReceipts) => {
                setReceipts(nextReceipts);
            },
            () => {},
        );
    }, []);

    // 4. Computed Values
    const brothersTotalFromIndividuals = useMemo(() => (
        Object.values(individualBrothersAmts).reduce((sum, amount) => sum + toNumber(amount), 0)
    ), [individualBrothersAmts]);

    const effectiveLedgers = useMemo(() => (
        isFirebaseConfigured ? groupReceiptsByPartner(receipts) : ledgers
    ), [receipts, ledgers]);

    const activePartnerIds = useMemo(() => 
        new Set((globalSettings?.partners || []).map((partner) => String(partner.id))),
        [globalSettings?.partners]
    );

    const activePartnerLedgers = useMemo(() => (
        Object.fromEntries(
            Object.entries(effectiveLedgers || {}).filter(([partnerId]) => activePartnerIds.has(String(partnerId))),
        )
    ), [effectiveLedgers, activePartnerIds]);

    const brothersLedgerSummary = useMemo(() => (
        summarizeLedgerRecords(Object.values(activePartnerLedgers).flat(), globalSettings)
    ), [activePartnerLedgers, globalSettings]);

    const brothersTotalFromLedgers = useMemo(() => brothersLedgerSummary.net, [brothersLedgerSummary]);

    // Update inputs when brothers mode changes
    useEffect(() => {
        if (globalSettings.brothersMode === 'individual') {
            const total = brothersTotalFromIndividuals.toString();
            setInputs(prev => (prev.brothers === total ? prev : { ...prev, brothers: total }));
        }
    }, [brothersTotalFromIndividuals, globalSettings.brothersMode]);

    // Sync reconciliation with auto-calculated values
    useEffect(() => {
        const hasLedgerRecords = brothersLedgerSummary.records > 0;
        const nextAutoValue = hasLedgerRecords
            ? brothersTotalFromLedgers.toString()
            : (globalSettings.brothersMode === 'individual' ? brothersTotalFromIndividuals.toString() : null);

        setReconciliation((prev) => {
            const previousAutoValue = lastAutoBrothersTransfersRef.current;
            if (nextAutoValue !== null) {
                lastAutoBrothersTransfersRef.current = nextAutoValue;
                return prev.brothersTransfers === nextAutoValue ? prev : { ...prev, brothersTransfers: nextAutoValue };
            }
            if (previousAutoValue !== null && prev.brothersTransfers === previousAutoValue) {
                lastAutoBrothersTransfersRef.current = null;
                return { ...prev, brothersTransfers: '' };
            }
            lastAutoBrothersTransfersRef.current = null;
            return prev;
        });
    }, [brothersTotalFromIndividuals, brothersTotalFromLedgers, brothersLedgerSummary.records, globalSettings.brothersMode]);

    const results = useMemo(() => calculateFinancialResults(inputs, applyMariamDiscount, globalSettings), [inputs, applyMariamDiscount, globalSettings]);
    const reconResults = useMemo(() => calculateReconciliation(reconciliation), [reconciliation]);
    const individualData = useMemo(() => calculateIndividual(individualInput, globalSettings), [individualInput, globalSettings]);

    // 4. Theme and CSS Variables Sync
    useEffect(() => {
        const root = document.documentElement;
        const themeColor = globalSettings.appearance?.themeColor || '#EF233C';
        root.style.setProperty('--primary-color', themeColor);
        // Create lighter version for backgrounds
        root.style.setProperty('--primary-faint', `${themeColor}15`);
        root.style.setProperty('--primary-hover', themeColor); // Can be adjusted with darken util if available

        if (isDarkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [isDarkMode, globalSettings.appearance?.themeColor]);

    const currentBackupPayload = useMemo(
        () => buildBackupPayload(history, globalSettings, accountEntries, effectiveLedgers, partnerMessages),
        [history, globalSettings, accountEntries, effectiveLedgers, partnerMessages]
    );

    // 5. Actions
    const updateInputValue = (key, value) => {
        const engValue = toEnglishDigits(value);
        if (key === 'individual') return setIndividualInput(engValue);
        if (typeof key === 'number' || /^\d+$/.test(String(key))) return setIndividualBrothersAmts(prev => ({ ...prev, [key]: engValue }));
        if (Object.prototype.hasOwnProperty.call(reconciliation, key)) return setReconciliation(prev => ({ ...prev, [key]: engValue }));
        setInputs(prev => ({ ...prev, [key]: engValue }));
    };

    const saveToHistory = async (type = 'distribution') => {
        let newRecord = { id: Date.now(), date: new Date().toISOString(), type };
        if (type === 'distribution') {
            newRecord = { ...newRecord, inputs: { ...inputs }, applyMariamDiscount, partners: [...(globalSettings.partners || [])], individualBrothersAmts: { ...individualBrothersAmts }, results: { ...results } };
        } else if (type === 'reconciliation') {
            newRecord = { ...newRecord, inputs: { ...reconciliation }, results: { ...reconResults } };
        } else if (type === 'individual') {
            newRecord = { ...newRecord, input: individualInput, results: { ...individualData } };
        }
        setHistory(prev => [newRecord, ...prev]);
        setInputs({ abdulalem: '', brothers: '' });
        setReconciliation({ bankBalance: '', storeSales: '', brothersTransfers: '', abdulalemTransfers: '', womenTransfers: '' });
        setIndividualInput('');
        setApplyMariamDiscount(false);
        await window.appAlert('تم حفظ العملية في السجل بنجاح!');
    };

    const deleteHistoryRecord = async (id) => {
        if (await window.appConfirm('هل أنت متأكد من حذف هذا السجل نهائياً؟', true, 'حذف السجل')) {
            setHistory(prev => prev.filter(r => r.id !== id));
        }
    };

    const deleteLedgerRecord = async (partnerId, recordId) => {
        if (await window.appConfirm('هل أنت متأكد من حذف هذا السجل؟', true, 'حذف السجل')) {
            setLedgers(prev => {
                const current = prev[partnerId] || [];
                return { ...prev, [partnerId]: current.filter(r => r.id !== recordId) };
            });
            setEditRequests(prev => prev.filter(r => r.recordId !== recordId));
        }
    };

    // --- Backup & Snapshots ---
    const createManualSnapshot = async () => {
        const name = `نسخة يدوية ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
        const snapshot = createBackupSnapshot(currentBackupPayload, 'manual', name);
        setBackupState(prev => ({
            ...prev,
            manualSnapshots: [snapshot, ...prev.manualSnapshots].slice(0, BACKUP_LIMITS.manualSnapshots),
        }));
        await window.appAlert('تم إنشاء نسخة استرجاع بنجاح.');
    };

    const restoreSnapshot = async (snapshot) => {
        const snapshotLabel = snapshot?.label || snapshot?.name || 'هذه النسخة';
        if (await window.appConfirm(`هل تريد استعادة "${snapshotLabel}"؟`, true, 'استعادة')) {
            const data = snapshot.data;
            if (data.history) setHistory(data.history);
            if (data.settings) {
                const mergedSettings = mergeSettingsWithDefaults(data.settings);
                setGlobalSettings(mergedSettings);
                if (typeof mergedSettings.appearance?.isDarkMode === 'boolean') setIsDarkMode(mergedSettings.appearance.isDarkMode);
            }
            if (data.accounts || data.accountEntries) setAccountEntries(data.accounts || data.accountEntries);
            if (data.ledgers) setLedgers(data.ledgers);
            setPartnerMessages(data.partnerMessages || {});
            await window.appAlert('تمت استعادة النسخة بنجاح.');
        }
    };

    // --- Google Drive Integration ---
    const refreshDriveBackups = async (token = driveAccessToken) => {
        if (!token) return;
        setBackupBusyAction('refreshing');
        try {
            const files = await listGoogleDriveBackups(token);
            setDriveBackups(files);
        } finally {
            setBackupBusyAction('');
        }
    };

    const connectGoogleDrive = async () => {
        setBackupBusyAction('connecting');
        try {
            const authResponse = await authorizeGoogleDrive();
            const token = authResponse?.access_token || authResponse;
            setDriveAccessToken(token);
            setBackupNotice('تم الاتصال بـ Google Drive بنجاح.');
            await refreshDriveBackups(token);
        } catch (err) {
            if (!String(err?.message || '').includes('redirecting_for_google_auth')) {
                await window.appAlert(getGoogleDriveErrorMessage(err));
            }
        } finally {
            setBackupBusyAction('');
        }
    };

    // --- Helper actions for Ledgers ---
    const addLedgerRecord = (partnerId, record) => {
        setLedgers(prev => {
            const current = prev[partnerId] || [];
            return {
                ...prev,
                [partnerId]: [...current, { ...record, status: getLedgerRecordStatus(record) }],
            };
        });
    };

    const updateLedgerRecordStatus = (partnerId, recordId, status) => {
        setLedgers(prev => {
            const current = prev[partnerId] || [];
            return {
                ...prev,
                [partnerId]: current.map(r => r.id === recordId ? { ...r, status } : r),
            };
        });
    };

    const requestLedgerEdit = (partnerId, partnerName, recordId, oldAmount, newAmount, note) => {
        setEditRequests(prev => [
            ...prev,
            { id: Date.now(), partnerId, partnerName, recordId, oldAmount, newAmount, note, status: 'pending', date: new Date().toISOString() }
        ]);
    };

    const approveEditRequest = async (reqId) => {
        const req = editRequests.find(r => r.id === reqId);
        if (!req) return;
        setLedgers(prev => {
            const pLedger = prev[req.partnerId] || [];
            return { ...prev, [req.partnerId]: pLedger.map(r => r.id === req.recordId ? { ...r, amount: req.newAmount, note: req.note } : r) };
        });
        setEditRequests(prev => prev.filter(r => r.id !== reqId));
        try { await resolveEditRequestOnServer({ id: reqId, status: 'approved' }); } catch {}
    };

    const rejectEditRequest = async (reqId) => {
        setEditRequests(prev => prev.filter(r => r.id !== reqId));
        try { await resolveEditRequestOnServer({ id: reqId, status: 'rejected' }); } catch {}
    };

    // --- Settings and Theme ---
    const updateSetting = (path, keyOrValue, maybeValue) => {
        let resolvedPath = path;
        let resolvedValue = keyOrValue;
        if (typeof maybeValue !== 'undefined') {
            resolvedValue = maybeValue;
            resolvedPath = path === 'root' ? keyOrValue : `${path}.${keyOrValue}`;
        }
        if (resolvedPath === 'appearance.isDarkMode') setIsDarkMode(Boolean(resolvedValue));
        setGlobalSettings(prev => {
            const next = { ...prev };
            const keys = resolvedPath.split('.');
            let curr = next;
            for (let i = 0; i < keys.length - 1; i++) {
                curr[keys[i]] = { ...curr[keys[i]] };
                curr = curr[keys[i]];
            }
            curr[keys[keys.length - 1]] = resolvedValue;
            return next;
        });
    };

    const value = {
        isDarkMode, setIsDarkMode,
        globalSettings, setGlobalSettings,
        partners: globalSettings.partners || [],
        history, setHistory,
        receipts, setReceipts,
        accountEntries, setAccountEntries,
        ledgers: effectiveLedgers, setLedgers,
        editRequests, setEditRequests,
        partnerMessages, setPartnerMessages,
        inputs, setInputs,
        reconciliation, setReconciliation,
        applyMariamDiscount, setApplyMariamDiscount,
        individualInput, setIndividualInput,
        results, reconResults, individualData,
        individualBrothersAmts, updateIndividualBrotherAmt: (pId, amt) => setIndividualBrothersAmts(prev => ({ ...prev, [pId]: toEnglishDigits(amt) })),
        accountForm, updateAccountField: (f, v) => setAccountForm(prev => ({ ...prev, [f]: toEnglishDigits(v) })),
        applyAccountTemplate: (t) => setAccountForm({ ...t }),
        saveAccountEntry: async () => {
            if (!accountForm.party || !accountForm.amount) return window.appAlert('يرجى إكمال البيانات الأساسية.');
            const entry = { ...accountForm, id: Date.now(), createdAt: new Date().toISOString(), status: 'pending' };
            setAccountEntries(prev => [entry, ...prev]);
            setAccountForm({ direction: 'receivable', party: '', title: '', amount: '', note: '' });
            await window.appAlert('تم تسجيل العملية بنجاح.');
        },
        toggleAccountEntryStatus: (id) => setAccountEntries(prev => prev.map(e => e.id === id ? { ...e, status: e.status === 'settled' ? 'pending' : 'settled' } : e)),
        deleteAccountEntry: async (id) => { if (await window.appConfirm('هل أنت متأكد من الحذف؟', true, 'حذف')) setAccountEntries(prev => prev.filter(e => e.id !== id)); },
        backupState, backupBusyAction, backupNotice, setBackupNotice,
        driveAccessToken, driveBackups, googleDriveReady,
        downloadCurrentBackup: () => downloadBackupPayload(currentBackupPayload),
        applyImportedBackup: async (data, src) => {
            if (!data || typeof data !== 'object') return window.appAlert('ملف النسخ الاحتياطي غير صالح.');
            if (await window.appConfirm(`هل تريد استعادة البيانات من ${src}؟ سيتم استبدال البيانات الحالية.`, true, 'استعادة')) {
                setBackupState(prev => ({ ...prev, automaticSnapshot: createBackupSnapshot(currentBackupPayload, 'automatic', `تلقائي قبل الاستيراد من ${src}`) }));
                if (data.history) setHistory(data.history);
                if (data.settings) {
                    const m = mergeSettingsWithDefaults(data.settings);
                    setGlobalSettings(m);
                    if (typeof m.appearance?.isDarkMode === 'boolean') setIsDarkMode(m.appearance.isDarkMode);
                }
                if (data.accounts || data.accountEntries) setAccountEntries(data.accounts || data.accountEntries);
                if (data.ledgers) setLedgers(data.ledgers);
                setPartnerMessages(data.partnerMessages || {});
                await window.appAlert('تمت استعادة البيانات بنجاح.');
            }
        },
        createManualSnapshot,
        createRecoverySnapshot: (name) => setBackupState(prev => ({ ...prev, automaticSnapshot: createBackupSnapshot(currentBackupPayload, 'automatic', name) })),
        restoreSnapshot,
        deleteSnapshot: async (id, isManual = true) => {
            if (await window.appConfirm('حذف هذه النسخة؟', true, 'حذف')) {
                setBackupState(prev => ({ ...prev, manualSnapshots: isManual ? prev.manualSnapshots.filter(s => s.id !== id) : prev.manualSnapshots, automaticSnapshot: !isManual ? null : prev.automaticSnapshot }));
            }
        },
        connectGoogleDrive,
        disconnectGoogleDrive: async () => {
            setBackupBusyAction('disconnecting');
            try {
                if (driveAccessToken) await revokeGoogleDriveToken(driveAccessToken);
                setDriveAccessToken(''); setDriveBackups([]); setBackupNotice('تم قطع الاتصال بـ Google Drive.');
            } finally { setBackupBusyAction(''); }
        },
        refreshDriveBackups,
        uploadCurrentBackupToDrive: async () => {
            if (!driveAccessToken) return;
            setBackupBusyAction('uploading');
            try {
                const f = await uploadBackupToGoogleDrive(driveAccessToken, currentBackupPayload);
                setBackupState(prev => ({ ...prev, driveMeta: { lastSyncedAt: new Date().toISOString(), lastFileId: f?.id || '', lastFileName: f?.name || '' } }));
                setBackupNotice('تم رفع النسخة الاحتياطية بنجاح.');
                await refreshDriveBackups();
            } catch (err) { await window.appAlert(getGoogleDriveErrorMessage(err)); } finally { setBackupBusyAction(''); }
        },
        restoreDriveBackup: async (fileOrId, fileName) => {
            const f = typeof fileOrId === 'object' ? fileOrId : { id: fileOrId, name: fileName };
            if (!driveAccessToken) return;
            if (await window.appConfirm(`هل تريد استعادة "${f.name}"؟`, true, 'استعادة')) {
                setBackupBusyAction(`restore-drive-${f.id}`);
                try {
                    const data = await downloadBackupFromGoogleDrive(driveAccessToken, f.id);
                    await value.applyImportedBackup(data, `Google Drive (${f.name})`);
                } catch (err) { await window.appAlert(getGoogleDriveErrorMessage(err)); } finally { setBackupBusyAction(''); }
            }
        },
        copyReport: async (setter) => {
            const text = `تطبيق الادارة المالية - تقرير موجز\nالتاريخ والوقت: ${formatDateTime(new Date())}\n\nإجمالي الإيراد: ${formatNumber(results.totalInitial)}\nصافي ${globalSettings?.names?.partyA}: ${formatNumber(results.finalA)}\nصافي ${globalSettings?.names?.partyB}: ${formatNumber(results.finalB)}\nحصة عاصم: ${formatNumber(results.finalAsim)}\nحصة ${globalSettings?.names?.partyC}: ${formatNumber(results.mariamShare)}\nالتحويل المستحق: ${formatNumber(results.totalToTransfer)}\n\nشكراً لاستخدامكم تطبيقنا.`.trim();
            try { await copyTextToClipboard(text); setter(true); setTimeout(() => setter(false), 2000); } catch { await window.appAlert('فشل نسخ التقرير.'); }
        },
        downloadPDF: async (setLoading) => {
            const el = document.getElementById('report-content');
            if (!el) return;
            setLoading(true);
            try {
                const imgData = await captureNodeAsPng(el);
                window.print();
            } catch { await window.appAlert('فشل إنشاء ملف PDF.'); } finally { setLoading(false); }
        },
        updateReceiptStatus: async (receiptId, status) => {
            if (isFirebaseConfigured) {
                await updateReceiptStatusInFirestore(receiptId, status);
                return;
            }

            const partnerId = Object.entries(ledgers).find(([, records]) => (
                (records || []).some((record) => String(record?.id) === String(receiptId))
            ))?.[0];

            if (partnerId) {
                updateLedgerRecordStatus(partnerId, receiptId, status);
            }
        },
        updateSetting, updateInputValue, addLedgerRecord, updateLedgerRecordStatus, deleteLedgerRecord, requestLedgerEdit, approveEditRequest, rejectEditRequest, 
        sendPartnerMessage: async (pId, pName, msg) => {
            const clean = String(msg || '').trim();
            if (!clean) return window.appAlert('اكتب الرسالة أولاً قبل الإرسال.');
            const p = { partnerId: pId, partnerName: pName, text: clean, sentAt: new Date().toISOString(), sender: 'admin' };
            setPartnerMessages(prev => {
                const entry = prev?.[pId];
                const thread = Array.isArray(entry?.thread) ? entry.thread : (entry?.text ? [{ id: Date.now() - 1, sender: entry?.sender === 'partner' ? 'partner' : 'admin', text: entry.text, sentAt: entry.sentAt }] : []);
                return { ...prev, [pId]: { ...p, thread: [...thread, { id: Date.now(), sender: 'admin', text: p.text, sentAt: p.sentAt }].slice(-50) } };
            });
            try { await pushPartnerMessageToServer(p); return { ok: true, synced: true }; } catch { return { ok: true, synced: false }; }
        },
        clearPartnerMessage: async (pId) => {
            setPartnerMessages(prev => { const next = { ...prev }; delete next[pId]; return next; });
            try { await clearPartnerMessageFromServer(pId); } catch {}
        },
        saveToHistory, deleteHistoryRecord, exportLedgersToHistory: async () => {
            const confirmed = Object.fromEntries(Object.entries(effectiveLedgers).map(([pId, recs]) => [pId, (recs || []).filter(r => isLedgerRecordConfirmed(r))]).filter(([, recs]) => recs.length > 0));
            if (Object.keys(confirmed).length === 0) return window.appAlert('لا توجد إيصالات مؤكدة للترحيل.');
            if (await window.appConfirm('هل تريد ترحيل الإيصالات المؤكدة وتصفير الحسابات؟')) {
                const ts = new Date().toISOString();
                const pSums = (globalSettings.partners || []).map(p => {
                    const recs = confirmed[p.id] || []; const t = summarizeLedgerRecords(recs, globalSettings);
                    return { partnerId: p.id, partnerName: p.name, partnerGender: p.gender, records: recs.length, gross: t.gross, discount: t.discount, bankComm: t.bankComm, net: t.net };
                }).filter(s => s.records > 0);
                const overall = pSums.reduce((acc, s) => ({ records: acc.records + s.records, gross: acc.gross + s.gross, discount: acc.discount + s.discount, bankComm: acc.bankComm + s.bankComm, net: acc.net + s.net }), { records: 0, gross: 0, discount: 0, bankComm: 0, net: 0 });
                setHistory(prev => [{ id: Date.now(), date: ts, type: 'ledgers_export', ledgersSnapshot: confirmed, partnersSnapshot: [...globalSettings.partners], summary: { exportedAt: ts, partners: pSums, overall } }, ...prev]);
                setLedgers({});
                try {
                    await sendLedgerExportReportDirectlyToWhatsApp({ body: `تقرير ترحيل وتصفير حسابات الأفراد\nالتاريخ: ${formatDateTime(ts)}\n\nالإجمالي العام:\nعدد الإيصالات: ${formatNumber(overall.records)}\nالصافي: ${formatNumber(overall.net)} ريال` });
                    await window.appAlert('تم ترحيل السجلات وتصفير الحسابات بنجاح.');
                } catch { await window.appAlert('تم الترحيل لكن تعذر إرسال التقرير.'); }
            }
        },
        exportPartnerLedgerToHistory: async (pId) => {
            const p = (globalSettings.partners || []).find(i => Number(i.id) === Number(pId));
            const recs = (effectiveLedgers[pId] || []).filter(r => isLedgerRecordConfirmed(r));
            if (!p || recs.length === 0) return window.appAlert('لا توجد إيصالات مؤكدة لهذا الفرد.');
            if (await window.appConfirm(`هل تريد ترحيل وتصفير حساب ${p.name}؟`)) {
                const ts = new Date().toISOString(); const t = summarizeLedgerRecords(recs, globalSettings);
                setHistory(prev => [{ id: Date.now(), date: ts, type: 'partner_ledgers_export', partnerId: p.id, partnerName: p.name, ledgersSnapshot: { [p.id]: recs }, partnersSnapshot: [p], summary: { exportedAt: ts, partners: [{ partnerId: p.id, partnerName: p.name, partnerGender: p.gender, records: recs.length, gross: t.gross, discount: t.discount, bankComm: t.bankComm, net: t.net }], overall: { records: recs.length, gross: t.gross, discount: t.discount, bankComm: t.bankComm, net: t.net } } }, ...prev]);
                setLedgers(prev => ({ ...prev, [p.id]: [] }));
                try {
                    await sendLedgerExportReportDirectlyToWhatsApp({ to: ADMIN_WHATSAPP_NUMBER, body: `تم تصفير حساب ${p.name}\nعدد الإيصالات: ${recs.length}\nالصافي: ${formatNumber(t.net)} ريال` });
                    await window.appAlert('تم الترحيل وتصفير الحساب.');
                } catch { await window.appAlert('تم الترحيل لكن تعذر إرسال التقرير.'); }
            }
        },
        brothersTotalFromIndividuals, brothersTotalFromLedgers
    };

    return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinance = () => {
    const context = useContext(FinancialContext);
    if (!context) throw new Error("useFinance must be used within a FinancialProvider");
    return context;
};
