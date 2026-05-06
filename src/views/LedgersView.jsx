import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { captureNodeAsPng } from '../utils/capture';
import {
 Users,
 Search,
 ChevronLeft,
 Eye,
 CheckCircle2,
 XCircle,
 Snowflake,
 RefreshCcw,
 Download,
 FileText,
 FileSpreadsheet,
 FileDown,
 Share2,
 BellRing,
 Plus,
 Menu,
 Send,
 Trash2,
 MessageSquare,
 Clock
} from 'lucide-react';
import { sendToTelegramBot, openTelegramFallback, getTelegramConfig } from '../utils/telegramBotService';
import { sendTelegramDocument } from '../utils/telegramDirect';
import { pushPartnerMessageToServer, pushLedgerStateToServer, fetchDisabledPartnerIds, togglePartnerAccessOnServer } from '../utils/adminSync';
import { ToggleLeft as ToggleIcon, ToggleRight as ToggleActiveIcon, Lock, Unlock } from 'lucide-react';



import { calculateLedgerBreakdown, summarizeLedgerRecords } from '../utils/finance';
import { formatDateTime, formatNumber } from '../utils/format';
import {
 getReceiptStatusLabel,
 getReceiptStatusTone,
 getTelegramStatusLabel,
 getTelegramStatusTone,
 RECEIPT_STATUSES,
 isReceiptApproved,
} from '../utils/receiptStatus';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Header from '../components/layout/Header';
import AppCard from '../components/shared/AppCard';

const toneClassMap = {
 amber: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
 emerald: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
 rose: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
 slate: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
 indigo: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
};

const statusActions = [
 { key: RECEIPT_STATUSES.approved, label: 'مؤكد', icon: CheckCircle2, className: 'bg-emerald-500 text-white' },
 { key: RECEIPT_STATUSES.rejected, label: 'رفض', icon: XCircle, className: 'bg-rose-500 text-white' },
 { key: RECEIPT_STATUSES.frozen, label: 'تجميد', icon: Snowflake, className: 'bg-slate-600 text-white' },
 { key: RECEIPT_STATUSES.review, label: 'مراجعة', icon: RefreshCcw, className: 'bg-indigo-500 text-white' },
];

const LedgersView = ({
  isDarkMode,
  globalSettings,
  ledgers = {},
  setLedgers,
  updateReceiptStatus,
  clearLedgers,
  setIsSidebarOpen,
  setActiveTab,
  openKeypad,
  unreadNotificationsCount,
  onOpenNotifications,
  editRequests = [],
  resolveEditRequest,
  selectedPartnerId,
  setSelectedPartnerId,
  updateGlobalSetting,
  confirmAll,
  setHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [busyReceiptId, setBusyReceiptId] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSorted, setIsExportingSorted] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [newPartnerData, setNewPartnerData] = useState({ name: '', telegramId: '', telegramTopicId: '' });
  const [disabledPartnerIds, setDisabledPartnerIds] = useState([]);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const statementExportRef = React.useRef(null);

  React.useEffect(() => {
    const loadAccess = async () => {
      try {
        const ids = await fetchDisabledPartnerIds();
        setDisabledPartnerIds(ids);
      } catch (e) {}
    };
    loadAccess();
  }, []);

  const handleToggleAccess = async (partnerId) => {
    if (isAccessLoading) return;
    setIsAccessLoading(true);
    const id = String(partnerId);
    const currentlyDisabled = disabledPartnerIds.includes(id);
    
    try {
      await togglePartnerAccessOnServer(id, !currentlyDisabled);
      setDisabledPartnerIds(prev => 
        !currentlyDisabled ? [...prev, id] : prev.filter(d => d !== id)
      );
    } catch (error) {
      window.appAlert(error.message || 'تعذر تحديث حالة الوصول.');
    } finally {
      setIsAccessLoading(false);
    }
  };

 const partners = globalSettings?.partners || [];
 const filteredPartners = useMemo(() => (
    partners.filter((partner) => 
      String(partner.id) !== '1' && 
      partner.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ), [partners, searchQuery]);

 const selectedPartner = useMemo(() => (
 partners.find((partner) => String(partner.id) === String(selectedPartnerId)) || null
 ), [partners, selectedPartnerId]);

 const partnerReceipts = selectedPartner
 ? (ledgers?.[selectedPartner.id] || [])
 : [];

 const summary = useMemo(() => (
 summarizeLedgerRecords(partnerReceipts, globalSettings)
 ), [partnerReceipts, globalSettings]);

 const sortedReceipts = useMemo(() => {
 const records = [...partnerReceipts];
 if (isExportingSorted) {
 records.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
 } else {
 records.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
 }
 return records;
 }, [partnerReceipts, isExportingSorted]);

  const handleConfirmAll = async () => {
    if (!selectedPartner || !confirmAll) return;
    const pendingCount = partnerReceipts.filter(r => r.status === 'pending').length;
    if (pendingCount === 0) {
      window.appAlert('لا توجد إيصالات بانتظار التأكيد حالياً.');
      return;
    }

    if (!(await window.appConfirm?.(`هل أنت متأكد من تأكيد جميع الإيصالات المعلقة (${pendingCount}) لهذا الفرد؟`, 'تأكيد الكل'))) return;

    try {
      await confirmAll(selectedPartner.id);
      window.appAlert('تم تأكيد جميع الإيصالات بنجاح.');
    } catch (error) {
      window.appAlert(error.message || 'تعذر تأكيد الإيصالات الآن.');
    }
  };

 const handleStatusChange = async (receiptId, status) => {
 if (!updateReceiptStatus) return;
 setBusyReceiptId(String(receiptId));
 try {
 await updateReceiptStatus(receiptId, status);
 await window.appAlert(`تم تحديث حالة الإيصال إلى "${getReceiptStatusLabel(status)}".`);
 } catch (error) {
 await window.appAlert(error.message || 'تعذر تحديث حالة الإيصال الآن.');
 } finally {
 setBusyReceiptId('');
 }
 };

 const handleExportStatement = (forceSorted = false) => {
    if (isExporting || isExportingSorted) return;

    if (forceSorted) setIsExportingSorted(true);
    else setIsExporting(true);

    setTimeout(async () => {
      try {
        if (!statementExportRef.current) throw new Error('تعذر تجهيز كشف الحساب.');

        const imageData = await captureNodeAsPng(statementExportRef.current, '#FFFFFF', 2);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imageData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${selectedPartner.name}-statement-${new Date().getTime()}.pdf`);
      } catch (error) {
        console.error('Export Error:', error);
        window.appAlert(error.message || 'حدث خطأ غير متوقع أثناء التصدير.');
      } finally {
        setIsExporting(false);
        setIsExportingSorted(false);
      }
    }, 150);
  };

  const handleAddPartner = () => {
    if (!newPartnerData.name.trim()) {
      window.appAlert('يرجى إدخال اسم الفرد على الأقل.');
      return;
    }
    const newId = String(Date.now());
    const newPartner = {
      id: newId,
      name: newPartnerData.name,
      telegramId: newPartnerData.telegramId,
      telegramTopicId: newPartnerData.telegramTopicId,
      type: 'individual',
      isExcluded: false
    };
    const updatedPartners = [...partners, newPartner];
    updateGlobalSetting('partners', null, updatedPartners);
    setIsAddingPartner(false);
    setNewPartnerData({ name: '', telegramId: '', telegramTopicId: '' });
    setSelectedPartnerId(newId);
  };

 const handleExportExcel = (partner = selectedPartner) => {
 if (!partner) return;
 const receiptsToExport = ledgers?.[partner.id] || [];
 if (!receiptsToExport.length) {
 window.appAlert('لا يوجد سجل إيصالات حاليًا لتصديره.');
 return;
 }

 const csvRows = [];
 // Headers
 csvRows.push(['#', 'التاريخ', 'المبلغ', 'البيان', 'الحالة', 'الصافي'].join(','));
 
 [...receiptsToExport]
 .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
 .forEach((record, index) => {
 const breakdown = calculateLedgerBreakdown(record.amount, globalSettings);
 csvRows.push([
 index + 1,
 formatDateTime(record.date).replace(/,/g, ''),
 record.amount,
 (record.note || '').replace(/,/g, ' '),
 getReceiptStatusLabel(record.status),
 breakdown.net
 ].join(','));
 });

 const csvContent = "\ufeff" + csvRows.join("\n"); // BOM for UTF-8 Arabic support
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.setAttribute("href", url);
 link.setAttribute("download", `Statement_${partner.name}_${new Date().toISOString().slice(0, 10)}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 const partnerIds = useMemo(() => new Set(partners.map(p => String(p.id))), [partners]);
 const allReceipts = useMemo(() => (
 Object.entries(ledgers || {})
 .filter(([pid]) => partnerIds.has(String(pid)))
 .map(([_, recs]) => recs)
 .flat()
 .filter(Boolean)
 ), [ledgers, partnerIds]);
 const totalSummary = summarizeLedgerRecords(allReceipts, globalSettings);

  if (selectedPartner) {
  return (
  <PageContainer>
  <Header 
  title={selectedPartner.name}
  subtitle="دفتر الأفراد التفصيلي"
  isDarkMode={isDarkMode}
  setIsSidebarOpen={setIsSidebarOpen}
   unreadNotificationsCount={unreadNotificationsCount}
   onOpenNotifications={onOpenNotifications}
  />
  <div className="flex justify-end mb-4">
  <button
  type="button"
  onClick={() => setSelectedPartnerId(null)}
  className={`text-sm font-black flex items-center gap-2 ${
  isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
  }`}
 >
  عودة لقائمة الأفراد <ChevronLeft size={16} className="rotate-180"/>
  </button>
  </div>

  <div className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-100 shadow-xl'}`}>
  <div className="flex flex-col items-center text-center mb-6">
  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-500'}`}>
  <Users size={32}/>
  </div>
  <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-[#0B0E12]'}`}>
  {selectedPartner.name}
  </h2>
  <p className="text-xs font-bold text-slate-500 mb-2">
  سجل الإيصالات والمبالغ مع عرض الخصومات والتفاصيل
  </p>
  <p className="text-[10px] font-black text-emerald-600">
  يتم احتساب الإجماليات على الإيصالات المؤكدة فقط.
  </p>
  </div>

  <div className="grid grid-cols-2 gap-3 mb-6">
  <div className={`p-4 rounded-[1.5rem] border-2 text-center ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
  <p className={`text-[10px] font-black mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>الإجمالي</p>
  <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatNumber(summary.gross)}</p>
  </div>
  <div className={`p-4 rounded-[1.5rem] text-center border-2 ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-500'}`}>
  <p className="text-[10px] font-black mb-2">الخصومات {globalSettings?.financials?.partyBPct || 10}%</p>
  <p className="text-xl font-black">{formatNumber(summary.discount)}</p>
  </div>
  <div className={`p-4 rounded-[1.5rem] border-2 text-center ${isDarkMode ? 'border-blue-500/30 bg-blue-500/5 text-blue-400' : 'border-blue-200 bg-blue-50 text-blue-500'}`}>
  <p className="text-[10px] font-black mb-2">الصافي</p>
  <p className="text-xl font-black">{formatNumber(summary.net)}</p>
  </div>
  <div className={`p-4 rounded-[1.5rem] border-2 text-center ${isDarkMode ? 'border-orange-500/30 bg-orange-500/5 text-orange-400' : 'border-orange-200 bg-orange-50 text-orange-500'}`}>
  <p className="text-[10px] font-black mb-2">العمولة {globalSettings?.financials?.bankCommRate || 2}% بعد الخصم</p>
  <p className="text-xl font-black">{formatNumber(summary.bankComm)}</p>
  </div>
  </div>

  <div className="grid grid-cols-4 gap-2 mb-6">
    <button 
      onClick={async () => {
        const params = new URLSearchParams();
        params.set('sharedMode', 'write');
        params.set('partnerId', String(selectedPartner.id));
        params.set('partnerName', selectedPartner.name);
        
        const tgConfig = getTelegramConfig();
        if (tgConfig.token) params.set('tgToken', tgConfig.token);
        if (tgConfig.chatId) params.set('tgAdmin', tgConfig.chatId);
        if (selectedPartner.telegramId) params.set('tgPartner', selectedPartner.telegramId);
        if (selectedPartner.telegramTopicId) params.set('tgTopic', selectedPartner.telegramTopicId);

        const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
          window.appAlert?.('تم نسخ رابط الشريك بنجاح!');
        } catch (err) {
          alert('تعذر نسخ الرابط.');
        }
      }}
      title="نسخ رابط الشريك"
      className={`p-4 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${isDarkMode ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
    >
      <Share2 size={24} className="text-rose-500"/>
    </button>

    <button 
      onClick={async () => {
        const defaultMsg = `📊 *تنبيه مراجعة حساب*\n━━━━━━━━━━━━━━\nالسلام عليكم ${selectedPartner.name}،\nيرجى مراجعة إيصالاتك وسجلك المالي بانتظام لضمان الدقة.\n━━━━━━━━━━━━━━`;
        const customMsg = await window.appPrompt?.('اكتب محتوى الرسالة التي تريد إرسالها للفرد:', defaultMsg, 'إرسال رسالة');
        
        if (!customMsg || !customMsg.trim()) return;

        try {
          await pushPartnerMessageToServer({
            partnerId: selectedPartner.id,
            partnerName: selectedPartner.name,
            text: customMsg,
            sentAt: new Date().toISOString()
          });

          if (selectedPartner.telegramId) {
            try {
              await sendToTelegramBot(customMsg, null, selectedPartner.telegramId, selectedPartner.telegramTopicId);
            } catch (tgError) {
              console.error('Failed to send Telegram notification:', tgError);
            }
          }

          window.appAlert?.(`تم إرسال التنبيه إلى واجهة ${selectedPartner.name} بنجاح!`);
        } catch (e) {
          window.appAlert?.(`تعذر إرسال التنبيه: ${e.message}`);
        }
      }}
      title="إرسال رسالة للفرد"
      className={`p-4 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}
    >
      <MessageSquare size={24} className="text-indigo-500"/>
    </button>

    <div className="relative">
      <button 
        onClick={() => setShowExportOptions(!showExportOptions)}
        title="كشف الحساب"
        className={`w-full h-full p-4 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}
      >
        <FileSpreadsheet size={24}/>
      </button>
      
      {showExportOptions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowExportOptions(false)}/>
          <div className={`absolute bottom-full left-0 right-0 mb-3 z-50 p-3 rounded-3xl border shadow-2xl min-w-[200px] ${isDarkMode ? 'bg-[#1a222c] border-white/10' : 'bg-white border-slate-200'}`}>
            <button 
              onClick={() => { handleExportStatement(true); setShowExportOptions(false); }}
              className={`w-full p-4 rounded-2xl flex items-center gap-4 text-xs font-black transition-all hover:bg-indigo-500 hover:text-white ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
            >
              <FileText size={20}/> PDF مرتب
            </button>
            <button 
              onClick={() => { handleExportExcel(); setShowExportOptions(false); }}
              className={`w-full p-4 rounded-2xl flex items-center gap-4 text-xs font-black transition-all hover:bg-emerald-500 hover:text-white ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
            >
              <FileSpreadsheet size={20}/> Excel (CSV)
            </button>
          </div>
        </>
      )}
    </div>

    <button 
      onClick={async () => {
        const confirmMsg = `هل أنت متأكد من تصفير حساب ${selectedPartner.name}؟ سيتم إرسال التقرير النهائي وأرشفة السجل في إدارة التقارير.`;
        if (!(await window.appConfirm?.(confirmMsg, 'تصفير الحساب'))) return;
        
        const partnerRecords = ledgers[selectedPartner.id] || [];
        const breakdown = summarizeLedgerRecords(partnerRecords, globalSettings);
        
        const msg = `📊 *تصفير كشف حساب*\n━━━━━━━━━━━━━━\n👤 *الاسم:* ${selectedPartner.name}\n💰 *الرصيد:* ${breakdown.gross.toLocaleString()} ريال\n🧾 *عدد الإيصالات:* ${breakdown.records}\n✂️ *الخصومات:* ${breakdown.discount.toLocaleString()} ريال\n🏛 *العمولة:* ${breakdown.bankComm.toLocaleString()} ريال\n✅ *الصافي:* ${breakdown.net.toLocaleString()} ريال\n━━━━━━━━━━━━━━\n🚀 *عبر سجلاتي*`;
        
        try {
          const targetId = selectedPartner.telegramId || null;
          await sendToTelegramBot(msg, null, targetId, selectedPartner.telegramTopicId);
        } catch (e) {
          console.error('Telegram notification failed:', e);
        }
        
        if (typeof setHistory === 'function') {
          setHistory(prev => [{
            id: Date.now(),
            date: new Date().toISOString(),
            type: 'ledger_clear',
            partnerName: selectedPartner.name,
            partnerId: selectedPartner.id,
            breakdown,
            receipts: partnerRecords,
            note: `تم تصفير حساب ${selectedPartner.name}`
          }, ...prev]);
        }
        
        const updatedLedgers = { ...ledgers };
        delete updatedLedgers[selectedPartner.id];
        setLedgers(updatedLedgers);
        try { await pushLedgerStateToServer(updatedLedgers); } catch (e) {}
        try {
          await pushPartnerMessageToServer({
            partnerId: selectedPartner.id,
            partnerName: selectedPartner.name,
            text: '__RESET__',
            sentAt: new Date().toISOString()
          });
        } catch (e) {}
        
        setSelectedPartnerId(null);
      }}
      title="إرسال وتصفير"
      className={`p-4 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
    >
      <Trash2 size={24} className="text-rose-500"/>
    </button>
  </div>

   {/* --- طلبات المراجعة المعلقة --- */}
  {editRequests.filter(req => String(req.partnerId) === String(selectedPartner.id) && req.status === 'pending').length > 0 && (
    <div className="mb-6 space-y-3">
      <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest mr-2 flex items-center gap-2">
        <Clock size={14} /> طلبات مراجعة بانتظار ردك
      </h3>
      {editRequests.filter(req => String(req.partnerId) === String(selectedPartner.id) && req.status === 'pending').map(req => (
        <div key={req.id} className={`p-5 rounded-3xl border-2 border-dashed ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
          <div className="flex justify-between items-start mb-3">
            <div className="text-right">
              <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>تعديل مبلغ الإيصال</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{formatDateTime(req.date)}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 line-through">{formatNumber(req.oldAmount)}</span>
              <span className="text-sm font-black text-indigo-500">{formatNumber(req.newAmount)} ريال</span>
            </div>
          </div>
          {req.note && (
            <p className={`text-[11px] font-bold leading-relaxed mb-4 p-3 rounded-xl ${isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-600'}`}>
              💬 {req.note}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => resolveEditRequest?.(req.id, 'approved')}
              className="py-3 rounded-2xl bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20"
            >
              قبول التعديل
            </button>
            <button 
              onClick={() => resolveEditRequest?.(req.id, 'rejected')}
              className={`py-3 rounded-2xl font-black text-xs ${isDarkMode ? 'bg-white/5 text-rose-500' : 'bg-white border border-rose-200 text-rose-500'}`}
            >
              رفض التعديل
            </button>
          </div>
        </div>
      ))}
    </div>
  )}

<button 
          onClick={() => openKeypad?.('addReceipt', '', selectedPartner)}
          className="fixed bottom-28 left-6 w-16 h-16 rounded-full bg-rose-600 text-white shadow-2xl shadow-rose-500/40 flex items-center justify-center transition-all active:scale-90 hover:rotate-90 z-[100] border-4 border-white/20"
          title="إضافة إيصال جديد"
        >
          <Plus size={36} strokeWidth={3}/>
        </button>

        <div className="flex items-center justify-between mb-4 mt-6 px-2">
          <h3 className={`text-sm font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
            سجل الإيصالات ({partnerReceipts.length})
          </h3>
          
          {partnerReceipts.some(r => r.status === 'pending') && (
            <button
              onClick={handleConfirmAll}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-2 transition-all active:scale-95 ${
                isDarkMode ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
              }`}
            >
              <CheckCircle2 size={14}/> تأكيد الكل
            </button>
          )}
        </div>

 <div className="space-y-4">
 {partnerReceipts.length> 0 ? partnerReceipts.map((receipt) => (
 <AppCard 
    key={receipt.id} 
    isDarkMode={isDarkMode} 
    className={`!p-5 relative overflow-hidden !border-2 ${
      getReceiptStatusTone(receipt.status) === 'amber' ? '!border-amber-500/40' :
      getReceiptStatusTone(receipt.status) === 'emerald' ? '!border-emerald-500/40' :
      getReceiptStatusTone(receipt.status) === 'rose' ? '!border-rose-500/40' :
      getReceiptStatusTone(receipt.status) === 'indigo' ? '!border-indigo-500/40' :
      '!border-slate-500/20'
    }`}
  >
 <div className="flex items-start justify-between gap-3 mb-4">
 <div className="flex items-center gap-3">
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-white/5 text-rose-500' : 'bg-rose-50 text-rose-500'}`}>
 <FileText size={22}/>
 </div>
 <div className="text-right">
 <span className={`block text-lg font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
 {formatNumber(receipt.amount)} <span className="text-[10px] font-bold text-slate-500">ريال</span>
 </span>
 <div className="flex items-center gap-1.5 mt-1">
 <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${toneClassMap[getReceiptStatusTone(receipt.status)]}`}>
 {getReceiptStatusLabel(receipt.status)}
 </span>
 <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${toneClassMap[getTelegramStatusTone(receipt.telegramStatus)]}`}>
 {getTelegramStatusLabel(receipt.telegramStatus)}
 </span>
 </div>
 </div>
 </div>

 {(receipt.imageUrl || receipt.imageDataUrl) && (
 <button
 type="button"
 onClick={() => setPreviewImage(receipt.imageUrl || receipt.imageDataUrl)}
 className={`p-3 rounded-2xl transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 shadow-sm'}`}
 title="معاينة الصورة"
>
 <Eye size={18}/>
 </button>
 )}
 </div>

 <div className="space-y-1.5 mb-5 text-right border-r-2 border-slate-200 dark:border-white/5 pr-3 mr-1">
 <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
 📅 {formatDateTime(receipt.date || receipt.createdAt)}
 </p>
 <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
 👤 المصدر: <span className="text-[var(--primary-color)]">{receipt.source || 'partner'}</span>
 </p>
 {receipt.note && (
 <p className={`text-[11px] font-bold leading-relaxed mt-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
 💬 {receipt.note}
 </p>
 )}
 </div>

 <div className="grid grid-cols-4 gap-2">
 {statusActions.map((action) => {
 const isActive = receipt.status === action.key;
 return (
 <button
 key={action.key}
 type="button"
 disabled={busyReceiptId === String(receipt.id)}
 onClick={() => handleStatusChange(receipt.id, action.key)}
 className={`py-3 rounded-2xl text-[9px] font-black flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 shadow-sm ${
 isActive 
 ? action.className 
 : (isDarkMode ? 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50')
 }`}
>
 <action.icon size={16}/>
 {action.label}
 </button>
 );
 })}
 </div>
 </AppCard>
 )) : (
 <AppCard isDarkMode={isDarkMode} className="!p-10 text-center">
 <p className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
 لا توجد إيصالات مسجلة لهذا الشريك.
 </p>
 </AppCard>
 )}
 </div>
 </div>

 {previewImage && (
 <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4">
 <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setPreviewImage(null)}/>
 <div className={`relative w-full max-w-md rounded-[2rem] p-4 ${isDarkMode ? 'bg-[#141A21]' : 'bg-white'}`}>
 <img src={previewImage} alt="صورة الإيصال" className="w-full max-h-[70vh] object-contain rounded-[1.5rem]"/>
 </div>
 </div>
 )}

 <div className="fixed top-0 -right-[9999px] opacity-100 pointer-events-none">
 <div
 ref={statementExportRef}
 className="w-[900px] bg-white text-slate-900 p-10 font-['Changa',_sans-serif]"
 dir="rtl"
>
 <div className="rounded-[32px] border border-slate-200 p-8">
 <div className="flex items-center justify-between pb-6 border-b border-slate-200">
 <div>
 <p className="text-sm font-black text-rose-600 tracking-[0.25em]">سجلاتي</p>
 <h2 className="text-3xl font-black mt-3">
 {isExportingSorted ? 'كشف حساب مرتب' : 'كشف حساب الإيصالات'}
 </h2>
 <p className="text-sm font-bold text-slate-500 mt-2">تقرير تفصيلي خاص بالفرد مع هوية التطبيق</p>
 </div>
 <div className="text-right">
 <p className="text-lg font-black">{selectedPartner.name}</p>
 <p className="text-sm font-bold text-slate-500 mt-2">التاريخ: {formatDateTime(new Date())}</p>
 <p className="text-sm font-bold text-slate-500">عدد الإيصالات: {partnerReceipts.length}</p>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4 mt-6">
 <ExportSummaryCard label="إجمالي المبلغ" value={`${formatNumber(summary.gross)} ريال`} accent="rose"/>
 <ExportSummaryCard label="إجمالي الخصم" value={`${formatNumber(summary.discount)} ريال`} accent="amber"/>
 <ExportSummaryCard label="عمولة البنك" value={`${formatNumber(summary.bankComm)} ريال`} accent="slate"/>
 <ExportSummaryCard label="الصافي" value={`${formatNumber(summary.net)} ريال`} accent="emerald"/>
 </div>

 <table className="w-full mt-8 border-collapse text-right">
 <thead>
 <tr className="bg-rose-50 text-rose-700">
 <th className="border border-slate-200 p-3 text-sm font-black">#</th>
 <th className="border border-slate-200 p-3 text-sm font-black">التاريخ</th>
 <th className="border border-slate-200 p-3 text-sm font-black">المبلغ</th>
 <th className="border border-slate-200 p-3 text-sm font-black">البيان</th>
 <th className="border border-slate-200 p-3 text-sm font-black">الحالة</th>
 <th className="border border-slate-200 p-3 text-sm font-black">الصافي</th>
 </tr>
 </thead>
 <tbody>
 {sortedReceipts.map((record, index) => {
 const breakdown = calculateLedgerBreakdown(record.amount, globalSettings);
 return (
 <tr key={`export-${record.id}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
 <td className="border border-slate-200 p-3 text-sm font-bold">{index + 1}</td>
 <td className="border border-slate-200 p-3 text-sm font-bold">{formatDateTime(record.date)}</td>
 <td className="border border-slate-200 p-3 text-sm font-bold">{formatNumber(record.amount)} ريال</td>
 <td className="border border-slate-200 p-3 text-sm font-bold">{record.note || '--'}</td>
 <td className="border border-slate-200 p-3 text-sm font-bold">{getReceiptStatusLabel(record.status)}</td>
 <td className="border border-slate-200 p-3 text-sm font-bold">{formatNumber(breakdown.net)} ريال</td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </PageContainer>
 );
 }

 const handleExportAndClear = async () => {
 const partnersWithReceipts = partners.filter(p => (ledgers?.[p.id] || []).length> 0);
 
 if (partnersWithReceipts.length === 0) {
 window.appAlert?.('لا توجد سجلات حالياً لتصديرها وتصفيرها.');
 return;
 }

 const confirmMsg = `هل أنت متأكد من تصفير حسابات جميع الشركاء (${partnersWithReceipts.length})؟\nسيتم إرسال كشف حساب PDF لكل شخص إلى تلجرام ومسح السجلات الحالية.`;
 if (!(await window.appConfirm?.(confirmMsg, 'تصفير الحسابات'))) return;

 setIsExporting(true);
 const tgConfig = getTelegramConfig();

 try {
 for (const partner of partnersWithReceipts) {
 // Switch to this partner to render their statement
 setSelectedPartnerId(partner.id);
 
 // Wait for render
 await new Promise(resolve => setTimeout(resolve, 500));

 if (!statementExportRef.current) continue;

 // 1. Generate PDF
 const imageData = await captureNodeAsPng(statementExportRef.current, '#FFFFFF', 2);
 const pdf = new jsPDF('p', 'mm', 'a4');
 const pageWidth = pdf.internal.pageSize.getWidth() - 20;
 const imageProps = pdf.getImageProperties(imageData);
 const imageHeight = (imageProps.height * pageWidth) / imageProps.width;
 pdf.addImage(imageData, 'PNG', 10, 10, pageWidth, imageHeight);
 
 // Convert to base64
 const pdfBase64 = pdf.output('datauristring').split(',')[1];

 // 2. Send to Telegram
 try {
 await sendTelegramDocument({
 botToken: tgConfig.token,
 chatId: partner.telegramId || tgConfig.chatId,
 messageThreadId: partner.telegramTopicId,
 caption: `📊 *كشف حساب نهائي وتصفير*\n━━━━━━━━━━━━━━\n👤 *الاسم:* ${partner.name}\n📅 *التاريخ:* ${formatDateTime(new Date())}\n━━━━━━━━━━━━━━\n✅ تم تصفير حسابك والبدء من جديد.`,
 fileName: `Sijilati_Final_${partner.name}_${new Date().toISOString().slice(0, 10)}.pdf`,
 base64Data: pdfBase64,
 });
 } catch (e) {
 console.error(`Failed to send PDF to ${partner.name}:`, e);
 }

 // 3. Push Reset Message to Partner UI
 try {
 await pushPartnerMessageToServer({
 partnerId: partner.id,
 partnerName: partner.name,
 text: '__RESET__',
 sentAt: new Date().toISOString(),
 });
 } catch (e) {
 console.error(`Failed to push reset message to ${partner.name}:`, e);
 }
 }

 // 4. Actually clear the ledgers for these partners
 try {
 await clearLedgers();
 setSelectedPartnerId(null); // Return to the list view
 window.appAlert?.('تم تصفير جميع الحسابات بنجاح وإرسال التقارير النهائية لجميع الشركاء.');
 } catch (e) {
 console.error('Final clear failed:', e);
 window.appAlert?.('حدث خطأ أثناء تصفير الحسابات.');
 }
 } catch (err) {
 console.error('Export and Clear failed:', err);
 window.appAlert?.('حدث خطأ غير متوقع أثناء العملية.');
 } finally {
 setIsExporting(false);
 }
 };

 const handleExportAllStatements = async () => {
 const partnersWithReceipts = partners.filter(p => (ledgers?.[p.id] || []).length > 0);

 if (partnersWithReceipts.length === 0) {
 window.appAlert?.('لا توجد إيصالات لأي فرد حاليًا.');
 return;
 }

 setIsExporting(true);
 const pdf = new jsPDF('p', 'mm', 'a4');
 let firstPage = true;

 try {
 const originalPartnerId = selectedPartnerId;

 for (const partner of partnersWithReceipts) {
 setSelectedPartnerId(partner.id);
 
 await new Promise(resolve => setTimeout(resolve, 500));

 if (!statementExportRef.current) continue;

 const imageData = await captureNodeAsPng(statementExportRef.current, '#FFFFFF', 2);
 
 if (!firstPage) {
 pdf.addPage();
 } else {
 firstPage = false;
 }

 const pageWidth = pdf.internal.pageSize.getWidth() - 20;
 const imageProps = pdf.getImageProperties(imageData);
 const imageHeight = (imageProps.height * pageWidth) / imageProps.width;
 
 pdf.addImage(imageData, 'PNG', 10, 10, pageWidth, imageHeight);
 }

 pdf.save(`Sijilati_All_Partners_${new Date().toISOString().slice(0, 10)}.pdf`);
 
 setSelectedPartnerId(originalPartnerId);
 } catch (err) {
 console.error('Export all PDF failed:', err);
 window.appAlert?.('حدث خطأ أثناء تصدير ملف PDF.');
 } finally {
 setIsExporting(false);
 }
 };

 return (
 <PageContainer>
 <Header 
 title="دفتر الأفراد"
 subtitle="إدارة الشركاء"
 isDarkMode={isDarkMode}
 setIsSidebarOpen={setIsSidebarOpen}
 unreadNotificationsCount={unreadNotificationsCount}
 onOpenNotifications={onOpenNotifications}
/>

 <div className="grid grid-cols-2 gap-4 mb-6 mt-4">
 <div className={`p-5 rounded-[2rem] border-2 flex flex-col justify-center items-center ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
 <p className="text-[10px] font-black mb-2 uppercase tracking-widest">إجمالي المبالغ</p>
 <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatNumber(totalSummary.gross)}</p>
 </div>
 <div className={`p-5 rounded-[2rem] border-2 flex flex-col justify-center items-center ${isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
 <p className="text-[10px] font-black mb-2 uppercase tracking-widest">إجمالي الخصومات</p>
 <p className={`text-2xl font-black ${isDarkMode ? 'text-rose-500' : 'text-rose-600'}`}>{formatNumber(totalSummary.discount)}</p>
 </div>
 <div className={`p-5 rounded-[2rem] border-2 flex flex-col justify-center items-center ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
 <p className="text-[10px] font-black mb-2 uppercase tracking-widest">إجمالي العمولة {globalSettings?.financials?.bankCommRate || 2}%</p>
 <p className={`text-2xl font-black ${isDarkMode ? 'text-orange-500' : 'text-orange-600'}`}>{formatNumber(totalSummary.bankComm)}</p>
 </div>
 <div className={`p-5 rounded-[2rem] border-2 flex flex-col justify-center items-center ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
 <p className="text-[10px] font-black mb-2 uppercase tracking-widest">الصافي النهائي</p>
 <p className={`text-2xl font-black ${isDarkMode ? 'text-indigo-500' : 'text-indigo-600'}`}>{formatNumber(totalSummary.net)}</p>
 </div>
 </div>

  <div className="flex gap-3 mb-6">
    <div className={`flex-1 flex items-center gap-3 px-4 py-4 rounded-[1.8rem] border ${
      isDarkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <Search size={18} className="text-slate-400"/>
      <input
        type="text"
        placeholder="ابحث عن فرد..."
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="bg-transparent border-none outline-none w-full text-xs font-black text-right placeholder-slate-400"
      />
    </div>
    <button 
      onClick={() => setIsAddingPartner(true)}
      className="w-14 h-14 rounded-[1.8rem] bg-[var(--primary-color)] text-white flex items-center justify-center shadow-lg shadow-[var(--primary-glow)] active:scale-95 transition-all"
    >
      <Plus size={24} />
    </button>
  </div>

 <div className="space-y-4">
 {filteredPartners.length> 0 ? filteredPartners.map((partner) => {
 const partnerReceiptsCount = (ledgers?.[partner.id] || []).length;
 const approvedTotal = (ledgers?.[partner.id] || [])
 .filter((receipt) => isReceiptApproved(receipt))
 .reduce((sum, receipt) => sum + (Number(receipt.amount) || 0), 0);

   return (
    <div 
      key={partner.id} 
      onClick={() => setSelectedPartnerId(partner.id)}
      className={`group p-5 rounded-[2.5rem] border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
        isDarkMode 
          ? 'bg-[#141A21] border-white/5 hover:bg-white/10 shadow-2xl shadow-black/20' 
          : 'bg-white border-slate-100 shadow-xl hover:shadow-2xl shadow-slate-200/50'
      }`}
    >
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            const params = new URLSearchParams();
            params.set('sharedMode', 'write');
            params.set('partnerId', String(partner.id));
            params.set('partnerName', partner.name);
            
            const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
            
            try {
              await navigator.clipboard.writeText(shareUrl);
              window.appAlert?.('تم نسخ رابط المشاركة بنجاح!');
            } catch (err) {
              console.error('Copy failed:', err);
              alert('تعذر نسخ الرابط.');
            }
          }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
            isDarkMode 
              ? 'bg-white/5 text-slate-400 group-hover:bg-rose-500/20 group-hover:text-rose-400' 
              : 'bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 shadow-inner'
          }`}
          title="مشاركة رابط واجهة الشريك"
        >
          <Share2 size={22}/>
        </button>
        <div className="text-left">
          <p className="text-xl font-black text-rose-600 leading-none mb-1">{formatNumber(approvedTotal)}</p>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ريال سعودي</p>
        </div>
      </div>

      <div className="flex items-center gap-5 text-right">
        <div>
          <div className="flex items-center justify-end gap-2 mb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAccess(partner.id);
              }}
              className={`p-1.5 rounded-lg transition-all ${
                disabledPartnerIds.includes(String(partner.id))
                  ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
              }`}
              title={disabledPartnerIds.includes(String(partner.id)) ? 'تفعيل الرابط' : 'إيقاف الرابط'}
            >
              {disabledPartnerIds.includes(String(partner.id)) ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            <h4 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{partner.name}</h4>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
              partnerReceiptsCount > 0 
                ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') 
                : (isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400')
            }`}>
              {partnerReceiptsCount} إيصالات
            </span>
          </div>
        </div>
        <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6 ${
          isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-400 border border-slate-100 shadow-sm'
        }`}>
          <Users size={32}/>
        </div>
      </div>
    </div>
  );
 }) : (
 <div className="text-center p-12 opacity-30">
 <Users size={48} className="mx-auto mb-4"/>
 <p className="text-xs font-black">لا يوجد أفراد مطابقين</p>
 </div>
 )}
 </div>

 <div className="mt-8 mb-4 space-y-3">
   {/* زر تصدير كشف حساب جميع الأفراد */}
   <button
     type="button"
     onClick={handleExportAllStatements}
     className={`w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-sm transition-all active:scale-[0.98] ${
       isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
     }`}
   >
     <FileDown size={20} />
     تصدير كشف حساب جميع الأفراد
   </button>

   {/* زر تصدير وتصفير */}
   <button
     type="button"
     onClick={handleExportAndClear}
     className={`w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-sm transition-all active:scale-[0.98] ${
       isDarkMode ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border border-indigo-200 text-indigo-600'
     }`}
   >
     تصدير وتصفير جميع السجلات
     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
   </button>
   <p className={`text-center text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
     سيتم مسح الإيصالات المؤقتة وحفظها بشكل دائم في شاشة التقارير
   </p>
 </div>

  {isAddingPartner && (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
      <div onClick={() => setIsAddingPartner(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#141A21] border border-white/10' : 'bg-white border border-slate-200'}`}>
        {/* Aesthetic background element */}
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-[var(--primary-color)]"></div>
        
        <h3 className={`text-xl font-black mb-8 text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>إضافة فرد جديد</h3>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 block mr-1 font-black uppercase tracking-widest">الاسم الكامل</label>
            <input 
              type="text" 
              placeholder="مثلاً: محمد علي"
              value={newPartnerData.name} 
              onChange={(e) => setNewPartnerData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full border rounded-2xl p-4 text-xs font-bold outline-none focus:border-[var(--primary-color)] transition-all ${
                isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 block mr-1 font-black uppercase tracking-widest">معرف تليجرام</label>
              <input 
                type="text" 
                placeholder="Chat ID"
                value={newPartnerData.telegramId} 
                onChange={(e) => setNewPartnerData(prev => ({ ...prev, telegramId: e.target.value }))}
                className={`w-full border rounded-2xl p-4 text-[10px] font-black outline-none focus:border-[var(--primary-color)] transition-all ${
                  isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 block mr-1 font-black uppercase tracking-widest">معرف الموضوع</label>
              <input 
                type="text" 
                placeholder="Topic ID"
                value={newPartnerData.telegramTopicId} 
                onChange={(e) => setNewPartnerData(prev => ({ ...prev, telegramTopicId: e.target.value }))}
                className={`w-full border rounded-2xl p-4 text-[10px] font-black outline-none focus:border-[var(--primary-color)] transition-all ${
                  isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setIsAddingPartner(false)}
              className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              إلغاء
            </button>
            <button 
              onClick={handleAddPartner}
              className="flex-1 py-4 rounded-2xl bg-[var(--primary-color)] text-white font-black text-sm shadow-xl shadow-[var(--primary-glow)] hover:opacity-90 transition-all active:scale-95"
            >
              حفظ العضو
            </button>
          </div>
        </div>
      </div>
    </div>
  )}
 </PageContainer>
 );
};

const ExportSummaryCard = ({ label, value, accent = 'slate' }) => {
 const accentClass = {
 rose: 'bg-rose-50 text-rose-700 border-rose-100',
 amber: 'bg-amber-50 text-amber-700 border-amber-100',
 slate: 'bg-slate-100 text-slate-700 border-slate-200',
 emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
 }[accent] || 'bg-slate-100 text-slate-700 border-slate-200';

 return (
 <div className={`rounded-[24px] border p-4 ${accentClass}`}>
 <p className="text-[11px] font-black opacity-75">{label}</p>
 <p className="text-lg font-black mt-3">{value}</p>
 </div>
 );
};

export default LedgersView;
