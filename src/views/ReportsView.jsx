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

      <div className="space-y-6 pb-8">
        {/* Tracking Card */}
        <section>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 mr-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>التتبع الزمني ({globalSettings.names.partyC})</h3>
          <AppCard isDarkMode={isDarkMode} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-pink-500 to-[var(--primary-color)]"></div>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-pink-500/10 text-pink-500 rounded-xl"><Heart size={20} /></div>
                <div>
                    <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>موعد الدفعة الشهرية</h4>
                    <p className="text-[9px] text-slate-500 font-bold">آخر تسليم وإحصائيات التأخير</p>
                </div>
            </div>

            {lastMariamRecord ? (
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0B0E12] border-white/5' : 'bg-slate-50 border-slate-100'} space-y-5`}>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase">الحالة الحالية</span>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black ${
                            isOverdue ? 'bg-rose-500/20 text-rose-500' : 
                            remainingDays <= 5 ? 'bg-amber-500/20 text-amber-500' : 
                            'bg-emerald-500/20 text-emerald-500'
                        }`}>
                            {isOverdue ? `متأخر منذ ${Math.abs(remainingDays)} يوماً` : 
                             remainingDays === 0 ? 'مستحق اليوم!' : 
                             `متبقي ${remainingDays} يوماً`}
                        </div>
                    </div>
                    
                    <div className="space-y-2 px-1 relative">
                        <div className="flex justify-between text-[9px] text-slate-500 font-black">
                            <span>مر ({daysPassed}) يوم</span>
                            <span>الدورة ({globalSettings.cycle.days}) يوم</span>
                        </div>
                        <div className={`h-2 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-[#1F2A36]' : 'bg-slate-200'}`}>
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                    isOverdue ? 'bg-rose-500' : 
                                    remainingDays <= 5 ? 'bg-amber-500' : 
                                    'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min((daysPassed / globalSettings.cycle.days) * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-500/10 pt-4">
                        <span className="flex items-center gap-1.5 font-bold"><Calendar size={14} /> تاريخ آخر تسليم</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black`}>{new Date(lastMariamRecord.date).toLocaleDateString('ar-SA')}</span>
                    </div>
                </div>
            ) : (
                <div className={`text-center p-8 border border-dashed rounded-2xl ${isDarkMode ? 'bg-[#0B0E12] border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <p className="text-[11px] font-bold">لا يوجد سجل يثبت تسليم مبلغ لـ {globalSettings.names.partyC}</p>
                </div>
            )}
          </AppCard>
        </section>

        {/* History List */}
        <section>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>أرشيف العمليات المحفوظة</h3>
            <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-full">{history.length} عملية</span>
          </div>

          <div className="space-y-4">
            {history.length > 0 ? history.map((record) => (
                <AppCard key={record.id} isDarkMode={isDarkMode} className="!p-0 overflow-hidden">
                    <div className="p-5">
                      {record.type === 'ledger_clear' ? (
                        <>
                          <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-500/10">
                              <div>
                                  <div className={`flex items-center gap-2 text-xs font-black mb-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <FileText size={14} className="text-rose-500"/> تصفير دفتر فردي
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                                    <Clock size={12} /> {new Date(record.date).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                              </div>
                              <div className="flex items-center gap-1.5">
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

                          <div className="grid grid-cols-2 gap-4 mb-5">
                              <div className="space-y-1.5 text-right">
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight">اسم الفرد</p>
                                  <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{record.partnerName}</p>
                              </div>
                              <div className="space-y-1.5 text-right">
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight">الصافي المعتمد</p>
                                  <p className={`text-sm font-black text-rose-500`}>{Number(record.breakdown?.net || 0).toLocaleString()} <span className="text-[10px] font-normal opacity-40">ريال</span></p>
                              </div>
                          </div>

                          <div className={`p-4 rounded-2xl grid grid-cols-3 gap-2 text-center text-[10px] font-black border ${
                            isDarkMode ? 'bg-[#0B0E12] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                          }`}>
                              <div>
                                  <span className="block opacity-60 mb-1">الإيصالات</span>
                                  <span className="text-white">{record.breakdown?.count || 0}</span>
                              </div>
                              <div className="border-r border-slate-200 dark:border-white/5">
                                  <span className="block opacity-60 mb-1">الخصومات</span>
                                  <span className="text-rose-400">{Number(record.breakdown?.discount || 0).toLocaleString()}</span>
                              </div>
                              <div className="border-r border-slate-200 dark:border-white/5">
                                  <span className="block opacity-60 mb-1">العمولة</span>
                                  <span className="text-orange-400">{Number(record.breakdown?.commission || 0).toLocaleString()}</span>
                              </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-500/10">
                              <div>
                                  <div className={`flex items-center gap-2 text-xs font-black mb-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <Calendar size={14} className="text-indigo-500"/> {new Date(record.date).toLocaleDateString('ar-SA')}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                                    <Clock size={12} /> {new Date(record.date).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}
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

                          <div className="grid grid-cols-2 gap-4 mb-5">
                              <div className="space-y-1.5 text-right">
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight">{globalSettings.names.partyA}</p>
                                  <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Number(record.inputs?.abdulalem || 0).toLocaleString()} <span className="text-[10px] font-normal opacity-40">ريال</span></p>
                              </div>
                              <div className="space-y-1.5 text-right">
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight">{globalSettings.names.partyB}</p>
                                  <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Number(record.inputs?.brothers || 0).toLocaleString()} <span className="text-[10px] font-normal opacity-40">ريال</span></p>
                              </div>
                          </div>

                          <div className={`p-4 rounded-2xl flex items-center justify-between text-[11px] font-black border ${
                            isDarkMode ? 'bg-[#0B0E12] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                          }`}>
                              <span className="flex items-center gap-2">حصة {globalSettings.names.partyC}</span>
                              <span className={`${record.applyMariamDiscount ? 'text-pink-500' : 'opacity-40'}`}>
                                {record.applyMariamDiscount ? `مُفعلة (${globalSettings.financials.partyCAmount} ريال)` : 'غير مُفعلة'}
                              </span>
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

        {/* System Info */}
        <section className="pt-4">
           <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 mr-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ثوابت النظام</h3>
           <AppCard isDarkMode={isDarkMode} className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-500/5">
                <span className="text-xs font-bold text-slate-500">نسبة استقطاع {globalSettings.names.partyA}</span>
                <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{globalSettings.financials.partyAPct}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-500/5">
                <span className="text-xs font-bold text-slate-500">نسبة استقطاع {globalSettings.names.partyB}</span>
                <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{globalSettings.financials.partyBPct}%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-bold text-slate-500">العمولة البنكية المحتسبة</span>
                <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{globalSettings.financials.bankCommRate}%</span>
              </div>
           </AppCard>
        </section>
      </div>
    </PageContainer>
  );
};

export default ReportsView;
