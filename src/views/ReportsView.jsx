import React from 'react';
import { 
  FileText, Calendar, Clock, Heart, Trash2, 
  History as HistoryIcon, AlertCircle, ChevronLeft, Send
} from 'lucide-react';
import { sendToTelegramBot, openTelegramFallback } from '../utils/telegramBotService';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Header from '../components/layout/Header';
import AppCard from '../components/shared/AppCard';

const ReportsView = ({ 
  isDarkMode, history = [], globalSettings, deleteHistoryRecord, setIsSidebarOpen 
}) => {
  const lastMariamRecord = history.find(r => r.applyMariamDiscount);
  let daysPassed = null;
  let remainingDays = null;
  let isOverdue = false;
  
  if (lastMariamRecord) {
    const diffTime = Math.abs(new Date() - new Date(lastMariamRecord.date));
    daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    remainingDays = globalSettings.cycle.days - daysPassed;
    isOverdue = remainingDays < 0;
  }

  return (
    <PageContainer>
      <Header 
        title="التقارير والسجلات"
        subtitle="مراجعة أرشيف العمليات"
        isDarkMode={isDarkMode}
        setIsSidebarOpen={setIsSidebarOpen}
      />

  const lastRecord = history[0];
  const totalArchivedAmount = history.reduce((sum, r) => sum + (Number(r.results?.totalInitial || r.breakdown?.gross || 0)), 0);

  return (
    <PageContainer>
      <Header 
        title="السجلات والتقارير"
        subtitle="الأرشيف المالي المتكامل"
        isDarkMode={isDarkMode}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="space-y-6 pb-8">
        {/* Quick Summary Dashboard */}
        <div className="grid grid-cols-2 gap-4">
           <div className={`p-5 rounded-[2rem] border text-right ${isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 opacity-60">إجمالي العمليات</p>
              <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{history.length}</p>
           </div>
           <div className={`p-5 rounded-[2rem] border text-right ${isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 opacity-60">حجم المبالغ المؤرشفة</p>
              <p className={`text-xl font-black text-emerald-500`}>{totalArchivedAmount.toLocaleString()} <span className="text-[9px] font-bold opacity-40">ريال</span></p>
           </div>
        </div>

        {/* History List - Most Important */}
        <section>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>أرشيف العمليات (الأحدث أولاً)</h3>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
          </div>

          <div className="space-y-4">
            {history.length > 0 ? history.map((record) => (
                <AppCard key={record.id} isDarkMode={isDarkMode} className="!p-0 overflow-hidden relative border-r-4 border-indigo-500">
                    <div className="p-5">
                      {record.type === 'ledger_clear' ? (
                        <>
                          <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-500/10">
                              <div>
                                  <div className={`flex items-center gap-2 text-xs font-black mb-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <FileText size={14} className="text-rose-500"/> تصفير حساب: {record.partnerName}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                                    <Clock size={12} /> {new Date(record.date).toLocaleDateString('ar-SA')} - {new Date(record.date).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                              </div>
                              <button 
                                onClick={() => deleteHistoryRecord(record.id)} 
                                className={`p-2 transition-all rounded-xl border ${
                                  isDarkMode ? 'bg-[#0B0E12] border-white/5 text-slate-500 hover:text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-rose-500'
                                }`}
                              >
                                <Trash2 size={16} />
                              </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1 text-right">
                                  <p className="text-[9px] text-slate-500 font-black uppercase">الصافي</p>
                                  <p className={`text-base font-black text-rose-500`}>{Number(record.breakdown?.net || 0).toLocaleString()} ريال</p>
                              </div>
                              <div className="space-y-1 text-right">
                                  <p className="text-[9px] text-slate-500 font-black uppercase">عدد الإيصالات</p>
                                  <p className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{record.breakdown?.count || 0}</p>
                              </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-500/10">
                              <div>
                                  <div className={`flex items-center gap-2 text-xs font-black mb-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <HistoryIcon size={14} className="text-indigo-500"/> تقرير مالي عام
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                                    <Clock size={12} /> {new Date(record.date).toLocaleDateString('ar-SA')} - {new Date(record.date).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={async () => {
                                    const reportText = `📄 *تقرير مالي مؤرشف*\n━━━━━━━━━━━━━━\n📅 *التاريخ:* ${new Date(record.date).toLocaleDateString('ar-SA')}\n💰 *الإجمالي:* ${Number(record.results?.totalInitial || 0).toLocaleString()} ريال\n💵 *الصافي:* ${Number((record.results?.finalA || 0) + (record.results?.finalB || 0)).toLocaleString()} ريال\n💡 *ملاحظة:* تم الإرسال من أرشيف التقارير.`;
                                    try {
                                      const res = await sendToTelegramBot(reportText);
                                      if (res.ok) window.appAlert?.('تم إرسال التقرير بنجاح عبر البوت!');
                                      else throw new Error(res.description || 'فشل الإرسال');
                                    } catch (e) {
                                      window.appAlert?.(`تعذر الإرسال: ${e.message}. تأكد من إعدادات تليجرام والاتصال.`);
                                    }
                                  }}
                                  className={`p-2 transition-all rounded-xl border ${
                                    isDarkMode ? 'bg-[#0B0E12] border-white/5 text-slate-500 hover:text-indigo-400' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-indigo-600'
                                  }`}
                                  title="إرسال عبر البوت"
                                >
                                  <Send size={16} />
                                </button>
                                <button 
                                  onClick={() => deleteHistoryRecord(record.id)} 
                                  className={`p-2 transition-all rounded-xl border ${
                                    isDarkMode ? 'bg-[#0B0E12] border-white/5 text-slate-500 hover:text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-rose-500'
                                  }`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1 text-right">
                                  <p className="text-[9px] text-slate-500 font-black uppercase">إجمالي المبالغ</p>
                                  <p className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Number(record.results?.totalInitial || 0).toLocaleString()} ريال</p>
                              </div>
                              <div className="space-y-1 text-right">
                                  <p className="text-[9px] text-slate-500 font-black uppercase">إجمالي التحويل</p>
                                  <p className={`text-base font-black text-emerald-500`}>{Number(record.results?.totalToTransfer || 0).toLocaleString()} ريال</p>
                              </div>
                          </div>
                        </>
                      )}
                    </div>
                </AppCard>
            )) : (
                <div className={`text-center p-16 rounded-[2.5rem] border border-dashed ${isDarkMode ? 'bg-[#141A21] border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-500/10 text-slate-500 flex items-center justify-center mx-auto mb-6">
                      <HistoryIcon size={32} className="opacity-40" />
                    </div>
                    <p className="text-xs font-black text-slate-500 leading-relaxed max-w-[200px] mx-auto">
                        لا توجد عمليات مؤرشفة حتى الآن. المبالغ التي يتم حفظها ستظهر هنا.
                    </p>
                </div>
            )}
          </div>
        </section>

        {/* Maryam Tracking - Secondary */}
        <section>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 mr-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>متابعة حصة {globalSettings.names.partyC}</h3>
          <AppCard isDarkMode={isDarkMode} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-pink-500 to-[var(--primary-color)]"></div>
            {lastMariamRecord ? (
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#0B0E12] border-white/5' : 'bg-slate-50 border-slate-100'} space-y-4`}>
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-500 uppercase">دورة الـ {globalSettings.cycle.days} يوماً</span>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black ${
                            isOverdue ? 'bg-rose-500/20 text-rose-500' : 
                            remainingDays <= 5 ? 'bg-amber-500/20 text-amber-500' : 
                            'bg-emerald-500/20 text-emerald-500'
                        }`}>
                            {isOverdue ? `متأخر (${Math.abs(remainingDays)})` : `متبقي (${remainingDays})`}
                        </div>
                    </div>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-[#1F2A36]' : 'bg-slate-200'}`}>
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                                isOverdue ? 'bg-rose-500' : remainingDays <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min((daysPassed / globalSettings.cycle.days) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            ) : (
                <p className="text-[10px] text-slate-500 font-bold text-center py-4">لم يتم تسجيل عمليات سابقة.</p>
            )}
          </AppCard>
        </section>

        {/* System Info - Footer */}
        <section className="pt-4 opacity-60">
           <AppCard isDarkMode={isDarkMode} className="!py-4">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500">العمولة البنكية المعتمدة</span>
                <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{globalSettings.financials.bankCommRate}%</span>
              </div>
           </AppCard>
        </section>
      </div>
    </PageContainer>
  );
};
    </PageContainer>
  );
};

export default ReportsView;
