import React from 'react';
import { 
  Settings, User, Coins, Palette, Clock, AlertCircle, 
  Moon, Sun, Check, Trash2, ChevronLeft
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Header from '../components/layout/Header';
import AppCard from '../components/shared/AppCard';

const SettingsView = ({ 
  isDarkMode, globalSettings, updateSetting, setHistory, setIsSidebarOpen 
}) => {
  const [isTelegramEditing, setIsTelegramEditing] = React.useState(false);
  const updateGlobalSetting = (section, key, value) => {
    updateSetting(section, key, value);
  };

  return (
    <PageContainer>
      <Header 
        title="الإعدادات والتحكم"
        subtitle="تخصيص وإدارة النظام"
        isDarkMode={isDarkMode}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="space-y-6 pb-8">
        {/* Names Settings */}
        <section>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 mr-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>مسميات الأطراف</h3>
          <AppCard isDarkMode={isDarkMode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 block mr-1">الطرف الأول (سابقاً {globalSettings.names?.partyA || ''})</label>
              <input 
                type="text" 
                value={globalSettings.names?.partyA || ''} 
                onChange={(e) => updateGlobalSetting('names', 'partyA', e.target.value)} 
                className={`w-full border rounded-2xl p-4 text-xs font-bold outline-none focus:border-[var(--primary-color)] transition-all ${
                  isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 block mr-1">الطرف الثاني (سابقاً {globalSettings.names?.partyB || ''})</label>
              <input 
                type="text" 
                value={globalSettings.names?.partyB || ''} 
                onChange={(e) => updateGlobalSetting('names', 'partyB', e.target.value)} 
                className={`w-full border rounded-2xl p-4 text-xs font-bold outline-none focus:border-[var(--primary-color)] transition-all ${
                  isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 block mr-1">الطرف الثالث (سابقاً {globalSettings.names?.partyC || ''})</label>
              <input 
                type="text" 
                value={globalSettings.names?.partyC || ''} 
                onChange={(e) => updateGlobalSetting('names', 'partyC', e.target.value)} 
                className={`w-full border rounded-2xl p-4 text-xs font-bold outline-none focus:border-[var(--primary-color)] transition-all ${
                  isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}
              />
            </div>
          </AppCard>
        </section>

        {/* Financial Settings */}
        <section>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 mr-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>النسب والأرقام المالية</h3>
          <AppCard isDarkMode={isDarkMode} className="space-y-4">
            <FinancialInput 
              label={`استقطاع ${globalSettings.names?.partyA || 'الطرف الأول'} (%)`}
              value={globalSettings.financials?.partyAPct || 0}
              onChange={(v) => updateGlobalSetting('financials', 'partyAPct', Number(v))}
              isDarkMode={isDarkMode}
            />
            <FinancialInput 
              label={`استقطاع ${globalSettings.names?.partyB || 'الطرف الثاني'} (%)`}
              value={globalSettings.financials?.partyBPct || 0}
              onChange={(v) => updateGlobalSetting('financials', 'partyBPct', Number(v))}
              isDarkMode={isDarkMode}
            />
            <FinancialInput 
              label={`حصة ${globalSettings.names?.partyC || 'الطرف الثالث'} الثابتة (ريال)`}
              value={globalSettings.financials?.partyCAmount || 0}
              onChange={(v) => updateGlobalSetting('financials', 'partyCAmount', Number(v))}
              isDarkMode={isDarkMode}
            />
            <FinancialInput 
              label="العمولة البنكية المخصومة (%)"
              value={globalSettings.financials?.bankCommRate || 0}
              step="0.1"
              onChange={(v) => updateGlobalSetting('financials', 'bankCommRate', Number(v))}
              isDarkMode={isDarkMode}
            />
          </AppCard>
        </section>

        {/* Appearance Settings */}
        <section>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 mr-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>مظهر وتنسيق التطبيق</h3>
          <AppCard isDarkMode={isDarkMode}>
            <div className={`flex items-center justify-between mb-6 p-4 rounded-[1.8rem] border ${
              isDarkMode ? 'bg-[#0B0E12]/50 border-white/5' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center gap-3 text-right">
                <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                  {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <div>
                  <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{isDarkMode ? 'الوضع الليلي' : 'الوضع النهاري'}</h4>
                  <p className="text-[9px] text-slate-500 font-bold">تغيير مظهر التطبيق بالكامل</p>
                </div>
              </div>
              <button 
                onClick={() => updateGlobalSetting('appearance', 'isDarkMode', !isDarkMode)}
                className={`w-12 h-6 rounded-full relative transition-all ${isDarkMode ? 'bg-[var(--primary-color)]' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDarkMode ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <label className="text-[10px] text-slate-500 block mb-4 mr-1 font-black uppercase">لون الطابع الأساسي</label>
            <div className="flex flex-wrap gap-4 justify-between pt-2">
              {[
                { name: 'أحمر', color: '#E11D2E' },
                { name: 'أزرق', color: '#3B82F6' },
                { name: 'أخضر', color: '#10B981' },
                { name: 'ذهبي', color: '#F59E0B' },
                { name: 'بنفسجي', color: '#8B5CF6' },
                { name: 'وردي', color: '#EC4899' }
              ].map((theme) => (
                <button 
                  key={theme.color}
                  onClick={() => updateGlobalSetting('appearance', 'themeColor', theme.color)}
                  className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                    globalSettings.appearance.themeColor === theme.color ? 'border-[var(--text-main)] scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: theme.color }}
                >
                  {globalSettings.appearance.themeColor === theme.color && <Check size={20} className="text-white" />}
                </button>
              ))}
            </div>
          </AppCard>
        </section>

        {/* Telegram Settings */}
        <section>
          <div className="flex items-center justify-between mb-3 mr-1">
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>إعدادات بوت تليجرام</h3>
            <button 
              onClick={() => setIsTelegramEditing(!isTelegramEditing)}
              className={`text-[9px] font-black px-3 py-1 rounded-lg transition-all ${
                isTelegramEditing 
                  ? 'bg-emerald-500 text-white' 
                  : (isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600')
              }`}
            >
              {isTelegramEditing ? 'حفظ وإغلاق' : 'تعديل الإعدادات'}
            </button>
          </div>
          <AppCard isDarkMode={isDarkMode} className={`space-y-4 transition-all ${!isTelegramEditing ? 'opacity-70' : ''}`}>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 block mr-1">رمز البوت (Bot Token)</label>
              <input 
                type="text" 
                placeholder="مثال: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                value={globalSettings.telegram?.botToken || ''} 
                onChange={(e) => updateGlobalSetting('telegram', 'botToken', e.target.value.trim())} 
                readOnly={!isTelegramEditing}
                className={`w-full border rounded-2xl p-4 text-xs font-bold outline-none transition-all text-left dir-ltr ${
                  isTelegramEditing ? 'focus:border-[var(--primary-color)] shadow-sm' : 'cursor-not-allowed opacity-50'
                } ${
                  isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}
                style={{ direction: 'ltr' }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 block mr-1">معرف الإدارة الأساسي (Admin Chat ID)</label>
              <input 
                type="text" 
                placeholder="مثال: -1003918458927"
                value={globalSettings.telegram?.adminChatId || ''} 
                onChange={(e) => updateGlobalSetting('telegram', 'adminChatId', e.target.value.trim())} 
                readOnly={!isTelegramEditing}
                className={`w-full border rounded-2xl p-4 text-xs font-bold outline-none transition-all text-left dir-ltr ${
                  isTelegramEditing ? 'focus:border-[var(--primary-color)] shadow-sm' : 'cursor-not-allowed opacity-50'
                } ${
                  isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}
                style={{ direction: 'ltr' }}
              />
              <p className="text-[9px] text-slate-500 mt-1 mr-1">المعرف الذي ستصله التقارير والإشعارات الإدارية. (استخدم معرف المجموعة الذي يبدأ بـ -100)</p>
            </div>
          </AppCard>
        </section>

        {/* Management Settings */}
        <section>
          <div className="flex items-center justify-between mb-3 mr-1">
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>إدارة حسابات الأفراد</h3>
            <span className="text-[9px] font-bold text-indigo-500 px-2 py-1 bg-indigo-500/10 rounded-lg">الجمع التلقائي</span>
          </div>
          <AppCard isDarkMode={isDarkMode} className="space-y-6">
            {(globalSettings.partners || []).map((partner, index) => (
              <div key={partner.id} className="space-y-4 pb-6 border-b border-white/5 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{partner.name}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const newPartners = globalSettings.partners.filter(p => p.id !== partner.id);
                        updateGlobalSetting('partners', null, newPartners);
                      }}
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 font-bold mr-1">الاسم</label>
                    <input 
                      type="text" 
                      value={partner.name} 
                      onChange={(e) => {
                        const newPartners = [...globalSettings.partners];
                        newPartners[index].name = e.target.value;
                        updateGlobalSetting('partners', null, newPartners);
                      }} 
                      className={`w-full border rounded-xl p-3 text-xs font-bold outline-none ${
                        isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 font-bold mr-1">معرف تليجرام (Chat ID)</label>
                    <input 
                      type="text" 
                      placeholder="Chat ID"
                      value={partner.telegramId || ''} 
                      onChange={(e) => {
                        const newPartners = [...globalSettings.partners];
                        newPartners[index].telegramId = e.target.value;
                        updateGlobalSetting('partners', null, newPartners);
                      }} 
                      className={`w-full border rounded-xl p-3 text-[10px] font-black outline-none ${
                        isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 font-bold mr-1">معرف الموضوع (Topic ID)</label>
                    <input 
                      type="text" 
                      placeholder="Topic ID"
                      value={partner.telegramTopicId || ''} 
                      onChange={(e) => {
                        const newPartners = [...globalSettings.partners];
                        newPartners[index].telegramTopicId = e.target.value;
                        updateGlobalSetting('partners', null, newPartners);
                      }} 
                      className={`w-full border rounded-xl p-3 text-[10px] font-black outline-none ${
                        isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-500 font-bold mr-1">الحالة في الحسبة</label>
                  <button 
                    onClick={() => {
                      const newPartners = [...globalSettings.partners];
                      newPartners[index].isExcluded = !newPartners[index].isExcluded;
                      updateGlobalSetting('partners', null, newPartners);
                    }}
                    className={`w-full p-3 rounded-xl border text-[10px] font-black transition-all flex items-center justify-center gap-2 ${
                      partner.isExcluded 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    }`}
                  >
                    {partner.isExcluded ? 'مستثنى (خارج الحسبة)' : 'مدرج (داخل الحسبة)'}
                  </button>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => {
                const newPartners = [...(globalSettings.partners || []), { id: Date.now().toString(), name: 'حساب فردي جديد', type: 'individual', isExcluded: false, telegramId: '' }];
                updateGlobalSetting('partners', null, newPartners);
              }}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-indigo-500/30 text-indigo-500 text-xs font-black hover:bg-indigo-500/5 transition-all"
            >
              + إضافة حساب فردي
            </button>
          </AppCard>
        </section>

        {/* System Settings */}
        <section>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 mr-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>النظام والمتابعة</h3>
          <AppCard isDarkMode={isDarkMode} className="flex items-center justify-between gap-4">
            <div className="text-right">
              <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>دورة الاستحقاق (بالأيام)</h4>
              <p className="text-[9px] text-slate-500 font-bold mt-1">تُعتمد لحساب التأخير والتنبيه لمستحقات {globalSettings.names.partyC}</p>
            </div>
            <input 
              type="number" 
              dir="ltr" 
              value={globalSettings.cycle?.days || 30} 
              onChange={(e) => updateGlobalSetting('cycle', 'days', Number(e.target.value))} 
              className={`w-20 border rounded-xl p-3 text-center text-xs font-black outline-none ${
                isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
              }`} 
            />
          </AppCard>
        </section>

        {/* Receipt Management */}
        <section>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 mr-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>إدارة الإيصالات</h3>
          <AppCard isDarkMode={isDarkMode} className="space-y-4">
             <div className={`flex items-center justify-between p-2`}>
                <div className="text-right">
                  <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>الحالة التلقائية للإيصال</h4>
                  <p className="text-[9px] text-slate-500 font-bold mt-1">اختر الحالة التي سيتم تعيينها للإيصالات الجديدة فور إرسالها.</p>
                </div>
                <select 
                  value={globalSettings.financials?.defaultReceiptStatus || 'pending'}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateGlobalSetting('financials', 'defaultReceiptStatus', val);
                    updateGlobalSetting('financials', 'autoApprove', val === 'approved');
                  }}
                  className={`border rounded-xl p-2 text-[10px] font-black outline-none ${
                    isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                  }`}
                >
                  <option value="pending">بانتظار التأكيد</option>
                  <option value="approved">مؤكد</option>
                </select>
             </div>

             <div className="h-px bg-white/5 w-full opacity-50"></div>

             <div className={`flex items-center justify-between p-2`}>
                <div className="text-right">
                  <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>اعتماد الإيصالات تلقائياً (Auto)</h4>
                  <p className="text-[9px] text-slate-500 font-bold mt-1">عند التفعيل، سيتم توثيق أي إيصال جديد فور إرساله دون الحاجة للموافقة اليدوية.</p>
                </div>
                <button 
                  onClick={() => {
                    const nextValue = !globalSettings.financials?.autoApprove;
                    updateGlobalSetting('financials', 'autoApprove', nextValue);
                    updateGlobalSetting('financials', 'defaultReceiptStatus', nextValue ? 'approved' : 'pending');
                  }}
                  className={`w-12 h-6 rounded-full relative transition-all ${globalSettings.financials?.autoApprove ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${globalSettings.financials?.autoApprove ? 'right-1' : 'left-1'}`} />
                </button>
             </div>
          </AppCard>
        </section>

        {/* Danger Zone */}
        <div className="bg-rose-500/5 rounded-[2rem] border border-rose-500/20 p-6 mt-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-rose-500/50"></div>
          <h3 className="text-sm font-black text-rose-500 mb-6 flex items-center gap-2"><AlertCircle size={16} /> منطقة البيانات (خطر)</h3>
          <div className="space-y-3">
            <button 
              onClick={async () => { if(await window.appConfirm?.('تأكيد مسح كافة السجلات؟ لا يمكن التراجع!', 'مسح السجلات')) { setHistory([]); window.appAlert?.('تم مسح السجلات.');} }} 
              className="w-full p-4 rounded-2xl bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95"
            >
              تصفير ومسح أرشيف السجلات
            </button>
            <button 
              onClick={async () => { if(await window.appConfirm?.('هل تريد استعادة الإعدادات الأصلية حقاً؟', 'تصفير')) { localStorage.removeItem('financial_settings'); window.location.reload(); } }} 
              className={`w-full p-4 rounded-2xl border text-xs font-black transition-all active:scale-95 ${
                isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-white border-slate-100 text-slate-500'
              }`}
            >
              استعادة الإعدادات الافتراضية
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

const FinancialInput = ({ label, value, onChange, step = "1", isDarkMode }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-xs font-black text-slate-500 whitespace-nowrap">{label}</label>
    <input 
      type="number" 
      step={step}
      dir="ltr" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className={`w-24 border rounded-xl p-3 text-center text-xs font-black outline-none ${
        isDarkMode ? 'bg-[#0B0E12] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
      }`} 
    />
  </div>
);

export default SettingsView;
