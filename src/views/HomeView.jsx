import React from 'react';
import { sendToTelegramBot, openTelegramFallback } from '../utils/telegramBotService';
import { jsPDF } from 'jspdf';
import { captureNodeAsPng } from '../utils/capture';
import { 
  LayoutDashboard, Bell, Calculator, User, Users, 
  Heart, AlertCircle, Info, ChevronDown, Banknote, Menu, Send,
  Download, Copy, FileText
} from 'lucide-react';

import PageContainer from '../components/layout/PageContainer';
import { CustomInput } from '../components/Common';

import Header from '../components/layout/Header';

const StatItem = ({ label, value, icon: Icon, colorClass, bgColor, isDarkMode }) => (
  <div className={`group p-6 rounded-[2.5rem] border flex items-center justify-between transition-all hover:scale-[1.02] text-right shadow-lg ${
    isDarkMode 
      ? 'bg-[#141A21] border-white/5 shadow-black/20 hover:bg-white/10' 
      : 'bg-white border-slate-100 shadow-slate-200/50 hover:shadow-xl'
  }`}>
    <div className="flex items-center gap-5">
      <div className={`w-14 h-14 rounded-[1.5rem] ${colorClass} flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6`}>
        <Icon size={28}/>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 opacity-60">{label}</p>
        <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {Number(value || 0).toLocaleString()} <span className="text-[10px] font-bold opacity-40">ريال</span>
        </p>
      </div>
    </div>
  </div>
);

const HomeView = ({ 
  isDarkMode, results, globalSettings, inputs, updateInputValue, 
  openKeypad, applyMariamDiscount, setApplyMariamDiscount, setIsSidebarOpen, updateGlobalSetting,
  unreadNotificationsCount, onOpenNotifications
}) => {
  const MARIAM_FIXED_AMOUNT = globalSettings.financials.partyCAmount;
  const [showFlowchart, setShowFlowchart] = React.useState(false);

  return (
    <PageContainer>
      <div id="report-content" className="pb-8">
        <Header 
          title="مساء الخير، عبد العالم"
          subtitle="النظام المالي الذكي"
          isDarkMode={isDarkMode}
          setIsSidebarOpen={setIsSidebarOpen}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={onOpenNotifications}
        />
        
        <div className="px-6 py-4">
          <div className="relative overflow-hidden bg-[var(--primary-color)] rounded-[2.5rem] p-8 text-white shadow-2xl h-52 flex flex-col justify-between group">
            <div className="absolute inset-0 opacity-10 transition-transform group-hover:scale-110 duration-1000" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="flex justify-between items-start z-10 text-white">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">إجمالي المبالغ الخام (قبل التوزيع)</span>
              <Banknote size={24} className="opacity-60"/>
            </div>
            <div className="z-10">
              <div className="text-4xl font-black mb-2 flex items-baseline gap-2">
                {results.totalInitial.toLocaleString()} <span className="text-sm font-bold opacity-60">ريال</span>
              </div>
              <div className="flex gap-6 mt-4 text-[10px] font-black opacity-80 uppercase tracking-widest">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div> {globalSettings.names.partyA}</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> {globalSettings.names.partyB}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 space-y-6">
          <div className={`p-8 rounded-[2.5rem] border space-y-6 shadow-xl ${isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-100'}`}>
            <CustomInput 
              label={`حساب ${globalSettings.names.partyA}`} 
              value={inputs.abdulalem || ''} 
              icon={User} 
              onCalcClick={() => openKeypad('abdulalem', inputs.abdulalem || '')} 
              onChange={(v) => updateInputValue('abdulalem', v)} 
              isDarkMode={isDarkMode}
            />
            
            <CustomInput 
              label={`حساب الأفراد`} 
              value={inputs.brothers || ''} 
              icon={Users} 
              onCalcClick={() => openKeypad('brothers', inputs.brothers || '')} 
              onChange={(v) => updateInputValue('brothers', v)} 
              isDarkMode={isDarkMode}
            />
            
            <button 
              onClick={() => setApplyMariamDiscount(!applyMariamDiscount)} 
              className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between group mb-2 ${
                applyMariamDiscount 
                  ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)] shadow-[var(--primary-glow)]' 
                  : `border-transparent ${isDarkMode ? 'bg-[#0B0E12]' : 'bg-slate-50'}`
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-all ${
                  applyMariamDiscount 
                    ? 'bg-[var(--primary-color)] text-white' 
                    : `${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-white text-slate-400 shadow-sm'}`
                }`}>
                  <Heart size={20} fill={applyMariamDiscount ? "currentColor" : "none"}/>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-black ${applyMariamDiscount ? 'text-[var(--primary-color)]' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>تفعيل حصة {globalSettings.names.partyC}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">خصم {globalSettings.financials.partyCAmount} ريال من النسبة</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                applyMariamDiscount 
                  ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' 
                  : `border-slate-300 ${isDarkMode ? 'opacity-20' : ''}`
              }`}>
                {applyMariamDiscount && <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>}
              </div>
            </button>

            {/* Monthly Progress Bar for Maryam's Share */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-500">استحقاق الشهر الحالي</span>
                <span className={`text-[10px] font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {(() => {
                    const now = new Date();
                    const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    const left = total - now.getDate();
                    return left === 0 ? 'مستحق اليوم' : `متبقي ${left} يوم`;
                  })()}
                </span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div 
                  className="h-full bg-indigo-500 transition-all duration-1000" 
                  style={{ 
                    width: `${(() => {
                      const now = new Date();
                      const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                      return (now.getDate() / total) * 100;
                    })()}%` 
                  }}
                />
              </div>
            </div>
            
            {applyMariamDiscount && results.totalPool < MARIAM_FIXED_AMOUNT && (
              <div className="overflow-hidden">
                <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl flex items-start gap-4 shadow-inner">
                  <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-xs font-black text-rose-500 mb-1">مبلغ الصندوق غير كافٍ</p>
                    <p className="text-[10px] text-rose-400 font-bold leading-relaxed opacity-90">
                      صندوق النسب أفرز <strong>{results.totalPool.toLocaleString()} ريال</strong> مما لا يغطي حصة {globalSettings.names.partyC} بالكامل. سيتحمل باقي الأطراف الفرق إجبارياً.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <StatItem 
              label={`صافي ${globalSettings.names.partyA}`} 
              value={results.finalA} 
              icon={User} 
              colorClass="bg-blue-600" 
              bgColor={isDarkMode ? 'bg-blue-500/5' : 'bg-blue-50'} 
              isDarkMode={isDarkMode}
            />
            <StatItem 
              label={`صافي الأفراد`} 
              value={results.finalB} 
              icon={Users} 
              colorClass="bg-emerald-600" 
              bgColor={isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-50'} 
              isDarkMode={isDarkMode}
            />
            <StatItem 
              label={`صافي عاصم`} 
              value={results.finalAsim} 
              icon={User} 
              colorClass="bg-purple-600" 
              bgColor={isDarkMode ? 'bg-purple-500/5' : 'bg-purple-50'} 
              isDarkMode={isDarkMode}
            />
            <StatItem 
              label={`حصة ${globalSettings.names.partyC}`} 
              value={results.mariamShare} 
              icon={Heart} 
              colorClass="bg-pink-600" 
              bgColor={isDarkMode ? 'bg-pink-500/5' : 'bg-pink-50'} 
              isDarkMode={isDarkMode}
            />
          </div>

          {/* --- مبلغ التحويل المستحق --- */}
          <button 
            onClick={() => {
              const amount = results.finalA + results.finalB;
              navigator.clipboard.writeText(amount.toString());
              window.appAlert?.(`تم نسخ مبلغ التحويل: ${amount.toLocaleString()} ريال`);
            }}
            className="w-full text-right active:scale-[0.98] transition-all"
          >
            <StatItem 
              label="المبلغ المستحق للتحويل" 
              value={results.finalA + results.finalB} 
              icon={Send} 
              colorClass="bg-indigo-600" 
              bgColor={isDarkMode ? 'bg-indigo-500/5' : 'bg-indigo-50'} 
              isDarkMode={isDarkMode}
            />
          </button>

          {/* --- خريطة سير العمليات --- */}
          <button 
            onClick={() => setShowFlowchart(!showFlowchart)}
            className={`w-full flex items-center justify-between p-5 rounded-3xl border transition-all active:scale-95 group ${
              isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-100 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl flex items-center justify-center transition-colors ${
                isDarkMode ? 'bg-white/5 text-slate-500 group-hover:text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <Info size={20}/>
              </div>
              <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>تسلسل العمليات وطريقة الحسبة</span>
            </div>
            <ChevronDown size={20} className={`text-slate-500 transition-transform duration-300 ${showFlowchart ? 'rotate-180' : ''}`}/>
          </button>
          
          {showFlowchart && (
            <div className="overflow-hidden">
              <div className={`rounded-[2.5rem] border p-8 mb-4 ${isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-100'}`}>
                <div className={`relative border-r-2 pr-6 space-y-8 mt-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  <FlowStep 
                    title="إجمالي المدخلات"
                    desc={`المبلغ الأساسي المدخل: ${results.totalInitial.toLocaleString()} ريال.`}
                    dotColor="bg-slate-400"
                  />
                  <FlowStep 
                    title="استقطاع النسب (صندوق الشراكة)"
                    desc={`يُستقطع ${globalSettings.financials.partyAPct}% من ${globalSettings.names.partyA} و ${globalSettings.financials.partyBPct}% من ${globalSettings.names.partyB} لتكوين الصندوق.`}
                    dotColor="bg-indigo-500"
                  />
                  <FlowStep 
                    title={`حصة ${globalSettings.names.partyC}`}
                    desc={`يُخصم من الصندوق مبلغ ${results.mariamShare.toLocaleString()} ريال لـ ${globalSettings.names.partyC}.`}
                    dotColor="bg-pink-500"
                  />
                  <FlowStep 
                    title="توزيع المتبقي"
                    desc={`يُقسم المتبقي من الصندوق بالنصف بين ${globalSettings.names.partyA} وعاصم.`}
                    dotColor="bg-purple-500"
                  />
                  <FlowStep 
                    title={`العمولة البنكية ${globalSettings.financials.bankCommRate}%`}
                    desc="تُحسب العمولة على المبالغ المتبقية بعد استقطاع النسب."
                    dotColor="bg-rose-500"
                    last
                  />
                </div>
              </div>
            </div>
          )}
          
                              <button
            onClick={async () => {
              const amount = results.finalA + results.finalB;
              const reportText = `📊 *التقرير المالي النهائي*\n━━━━━━━━━━━━━━\n💰 *الإجمالي الخام:* ${results.totalInitial.toLocaleString()} ريال\n👤 *صافي ${globalSettings.names.partyA}:* ${results.finalA.toLocaleString()} ريال\n👤 *صافي عاصم:* ${results.finalAsim.toLocaleString()} ريال\n👥 *صافي الأفراد:* ${results.finalB.toLocaleString()} ريال\n🏦 *مبلغ التحويل:* ${amount.toLocaleString()} ريال\n❤️ *حصة مريم:* ${results.mariamShare.toLocaleString()} ريال\n━━━━━━━━━━━━━━\n📅 *التاريخ:* ${new Date().toLocaleDateString('ar-EG')}`;
              
              try {
                await navigator.clipboard.writeText(reportText);
                window.appAlert?.('تم نسخ التقرير النصي للحافظة!');
              } catch (e) {
                window.appAlert?.('فشل نسخ التقرير.');
              }
            }}
            className="w-full p-5 rounded-[2rem] bg-indigo-600 text-white font-black text-sm shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all mt-4 mb-8"
          >
            <Copy size={20} />
            <span>نسخ التقرير النهائي</span>
          </button>
        </div>
      </div>
    </PageContainer>
  );
};

const FlowStep = ({ title, desc, dotColor, last }) => (
  <div className="relative">
    <div className={`absolute w-5 h-5 rounded-full -right-[32.5px] top-0 border-4 ${dotColor.replace('bg-', 'border-')} flex items-center justify-center bg-white dark:bg-[#0B0E12] shadow-sm`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
    </div>
    <h4 className="text-xs font-black text-slate-400 mb-1.5 uppercase tracking-wide">{title}</h4>
    <p className="text-[11px] font-bold text-slate-500 leading-relaxed opacity-80">{desc}</p>
  </div>
);

export default HomeView;
