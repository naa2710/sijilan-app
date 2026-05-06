import React from 'react';
import { AlertCircle, BellRing, Check, Lock, MessageSquareMore, Moon, Palette, Settings, Sun, X } from 'lucide-react';
import { getPartnerLabels } from '../utils/partnerProfile';

const PartnerSettingsSheet = ({
  open,
  onClose,
  partnerName,
  partnerGender,
  isDarkMode,
  settings,
  updateSetting,
  isBiometricAvailable,
  onEnableBiometric,
  onDisableBiometric,
  onRequestPinReset,
}) => {
  const biometricEnabled = !!settings?.security?.biometricEnabled;
  const themeColors = ['#EF233C', '#2563EB', '#0F766E', '#7C3AED', '#EA580C', '#059669'];
  const partnerLabels = getPartnerLabels(partnerGender);

  const handlePinToggle = () => {
    const currentPin = settings?.security?.pin;
    if (currentPin) {
      updateSetting('security', 'pin', null);
      updateSetting('security', 'biometricEnabled', false);
      updateSetting('security', 'biometricCredentialId', '');
      return;
    }
    const newPin = window.prompt(`أدخل رمزًا سريًا جديدًا لـ ${partnerLabels.installTitle} (4 أرقام):`);
    if (!newPin) return;
    if (!/^\d{4}$/.test(newPin)) {
      window.alert('يجب أن يتكون الرمز من 4 أرقام فقط.');
      return;
    }
    updateSetting('security', 'pin', newPin);
  };

  const handlePinChange = () => {
    const newPin = window.prompt('أدخل الرمز السري الجديد (4 أرقام):');
    if (!newPin) return;
    if (!/^\d{4}$/.test(newPin)) {
      window.alert('يجب أن يتكون الرمز من 4 أرقام فقط.');
      return;
    }
    updateSetting('security', 'pin', newPin);
  };

  return (
    <>
      {open && (
        <>
          <button
            type="button"
            onClick={onClose}
            className="fixed inset-0 z-[1200] bg-black/55 backdrop-blur-sm"
          />
          <aside
            className={`fixed top-0 right-0 bottom-0 z-[1201] w-full max-w-md overflow-y-auto ${
              isDarkMode ? 'bg-[#0B0E12] border-l border-white/5' : 'bg-[#F8FAFC] border-l border-slate-200'
            }`}
          >
            <div className={`sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b backdrop-blur-xl ${
              isDarkMode ? 'bg-[#0B0E12]/90 border-white/5' : 'bg-[#F8FAFC]/90 border-slate-200'
            }`}>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{partnerLabels.installTitle}</p>
                <h2 className={`text-lg font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>إعدادات {partnerName}</h2>
              </div>
              <button
                onClick={onClose}
                className={`p-2.5 rounded-xl border transition-all ${
                  isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <X size={20}/>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <section className={`p-5 rounded-[2rem] border ${
                isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-2xl bg-[var(--primary-color)]/10 text-[var(--primary-color)]">
                    <Settings size={20}/>
                  </div>
                  <div>
                    <h3 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>إعدادات مستقلة {partnerLabels.roleObject}</h3>
                  </div>
                </div>
              </section>

              <section className={`p-6 rounded-[2rem] border ${
                isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <h3 className={`text-sm font-black mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Lock size={18} className="text-[var(--primary-color)]"/> أمان {partnerLabels.installTitle}
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>قفل هذه الواجهة برمز سري</span>
                      <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        الرمز يخص {partnerLabels.recordOwner} فقط ولا يغيّر قفل الإدارة.
                      </p>
                    </div>
                    <button
                      onClick={handlePinToggle}
                      className={`w-12 h-6 rounded-full p-1 transition-all ${settings?.security?.pin ? 'bg-emerald-500' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${settings?.security?.pin ? '-translate-x-6' : 'translate-x-0'}`}/>
                    </button>
                  </div>

                  {settings?.security?.pin && (
                    <button
                      onClick={handlePinChange}
                      className={`w-full py-3 rounded-xl border text-[11px] font-black transition-all ${
                        isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      تغيير الرمز السري
                    </button>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>فتح الواجهة بالبصمة</span>
                      <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        يستخدم بصمة الجهاز أو قفل الشاشة عند الدعم.
                      </p>
                    </div>
                    <button
                      onClick={() => (biometricEnabled ? onDisableBiometric?.() : onEnableBiometric?.())}
                      disabled={!isBiometricAvailable || !settings?.security?.pin}
                      className={`w-12 h-6 rounded-full p-1 transition-all ${
                        !isBiometricAvailable || !settings?.security?.pin ? 'opacity-40 cursor-not-allowed' : ''
                      } ${biometricEnabled ? 'bg-emerald-500' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${biometricEnabled ? '-translate-x-6' : 'translate-x-0'}`}/>
                    </button>
                  </div>

                  <InfoNotice isDarkMode={isDarkMode}>
                    إذا نسيت الرمز، يمكن من شاشة القفل إرسال طلب مباشر إلى الإدارة لإعادة تعيينه.
                  </InfoNotice>

                  <div className={`rounded-2xl border p-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>مهلة القفل التلقائي</p>
                        <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          بعد هذه المدة بدون نشاط ستظهر شاشة الأمان لهذه الواجهة فقط.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          dir="ltr"
                          value={settings?.security?.lockTimeoutMinutes || 30}
                          onChange={(e) => updateSetting('security', 'lockTimeoutMinutes', Math.max(1, Number(e.target.value) || 30))}
                          className={`w-20 rounded-xl p-2 text-center text-xs font-black outline-none border ${
                            isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                        <span className="text-[10px] font-bold text-slate-400">دقيقة</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onRequestPinReset}
                    className={`w-full py-3 rounded-xl border text-[11px] font-black flex items-center justify-center gap-2 transition-all ${
                      isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <MessageSquareMore size={16}/>
                    طلب إعادة تعيين الرمز من الإدارة
                  </button>
                </div>
              </section>

              <section className={`p-6 rounded-[2rem] border ${
                isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <h3 className={`text-sm font-black mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Palette size={18} className="text-[var(--primary-color)]"/> مظهر واجهة الفرد
                </h3>

                <label className={`text-[10px] font-black block mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>نمط العرض</label>
                <div className={`flex p-1 rounded-2xl mb-6 ${isDarkMode ? 'bg-black/20' : 'bg-slate-100'}`}>
                  <button
                    onClick={() => updateSetting('appearance', 'isDarkMode', false)}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl transition-all font-black text-xs ${!isDarkMode ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    <Sun size={16}/> نهاري
                  </button>
                  <button
                    onClick={() => updateSetting('appearance', 'isDarkMode', true)}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl transition-all font-black text-xs ${isDarkMode ? 'bg-[#1F2937] text-white shadow-lg shadow-black/20' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Moon size={16}/> ليلي
                  </button>
                </div>

                <label className={`text-[10px] font-black block mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>لون الواجهة</label>
                <div className="grid grid-cols-3 gap-4">
                  {themeColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateSetting('appearance', 'themeColor', color)}
                      className={`w-full h-12 rounded-2xl transition-all flex items-center justify-center border-2 ${settings?.appearance?.themeColor === color ? (isDarkMode ? 'border-white scale-[1.03]' : 'border-slate-800 scale-[1.03]') : 'border-transparent opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: color }}
                    >
                      {settings?.appearance?.themeColor === color && <Check size={20} className="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]"/>}
                    </button>
                  ))}
                </div>
              </section>

              <section className={`p-6 rounded-[2rem] border ${
                isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <h3 className={`text-sm font-black mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <BellRing size={18} className="text-[var(--primary-color)]"/> تنبيهات الفرد
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>تنبيه عند وصول رسالة من الإدارة</p>
                      <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        يظهر تنبيه داخل الواجهة عند وصول رسالة أو ملاحظة جديدة.
                      </p>
                    </div>
                    <button
                      onClick={() => updateSetting('notifications', 'adminMessageAlerts', !settings?.notifications?.adminMessageAlerts)}
                      className={`w-12 h-6 rounded-full p-1 transition-all ${settings?.notifications?.adminMessageAlerts ? 'bg-emerald-500' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${settings?.notifications?.adminMessageAlerts ? '-translate-x-6' : 'translate-x-0'}`}/>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>صوت عند وصول رسالة من الإدارة</p>
                      <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        تشغيل نغمة خفيفة عند وصول تنبيه جديد من الإدارة.
                      </p>
                    </div>
                    <button
                      onClick={() => updateSetting('notifications', 'adminMessageSound', !settings?.notifications?.adminMessageSound)}
                      disabled={!settings?.notifications?.adminMessageAlerts}
                      className={`w-12 h-6 rounded-full p-1 transition-all ${
                        !settings?.notifications?.adminMessageAlerts ? 'opacity-40 cursor-not-allowed' : ''
                      } ${settings?.notifications?.adminMessageSound ? 'bg-emerald-500' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${settings?.notifications?.adminMessageSound ? '-translate-x-6' : 'translate-x-0'}`}/>
                    </button>
                  </div>

                  <div className={`rounded-2xl border p-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>مدة حفظ سجل الإشعارات</p>
                        <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          يتم الاحتفاظ بالإشعارات في سجل هذه الواجهة لهذه المدة.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          dir="ltr"
                          value={settings?.notifications?.retentionDays || 7}
                          onChange={(e) => updateSetting('notifications', 'retentionDays', Math.max(1, Number(e.target.value) || 7))}
                          className={`w-20 rounded-xl p-2 text-center text-xs font-black outline-none border ${
                            isDarkMode ? 'bg-black/20 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                        <span className="text-[10px] font-bold text-slate-400">يوم</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </>
      )}
    </>
  );
};

const InfoNotice = ({ isDarkMode, children }) => (
  <div className={`flex items-start gap-3 p-3 rounded-xl border border-dashed ${isDarkMode ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50'}`}>
    <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5"/>
    <p className="text-[9px] font-bold text-amber-600 leading-relaxed">{children}</p>
  </div>
);

export default PartnerSettingsSheet;
