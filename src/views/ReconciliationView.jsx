import React from 'react';
import { 
  ShieldCheck, Landmark, ShoppingBag, Users, User, Heart, 
  CheckCircle2, AlertCircle, Info
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Header from '../components/layout/Header';
import AppCard from '../components/shared/AppCard';
import { CustomInput } from '../components/Common';

const ReconciliationView = ({ 
  isDarkMode, 
  globalSettings, 
  reconciliation, 
  reconResults, 
  updateInputValue, 
  openKeypad,
  setIsSidebarOpen
}) => {
  return (
    <PageContainer>
      <Header 
        title="المطابقة البنكية"
        subtitle="مطابقة الرصيد والتحويلات"
        isDarkMode={isDarkMode}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="space-y-4 pb-8">
        <AppCard isDarkMode={isDarkMode} className="space-y-4">
          <CustomInput 
            label="رصيد البنك الحالي" 
            value={reconciliation.bankBalance} 
            icon={Landmark} 
            onCalcClick={() => openKeypad('bankBalance', reconciliation.bankBalance)} 
            onChange={(v) => updateInputValue('bankBalance', v)} 
            isDarkMode={isDarkMode}
          />
          <CustomInput 
            label="مبيعات المتجر" 
            value={reconciliation.storeSales} 
            icon={ShoppingBag} 
            onCalcClick={() => openKeypad('storeSales', reconciliation.storeSales)} 
            onChange={(v) => updateInputValue('storeSales', v)} 
            isDarkMode={isDarkMode}
          />
          <CustomInput 
            label={`تحويلات ${globalSettings.names.partyB}`} 
            value={reconciliation.brothersTransfers} 
            icon={Users} 
            onCalcClick={() => openKeypad('brothersTransfers', reconciliation.brothersTransfers)} 
            onChange={(v) => updateInputValue('brothersTransfers', v)} 
            isDarkMode={isDarkMode}
          />
          <CustomInput 
            label={`تحويلات ${globalSettings.names.partyA}`} 
            value={reconciliation.abdulalemTransfers} 
            icon={User} 
            onCalcClick={() => openKeypad('abdulalemTransfers', reconciliation.abdulalemTransfers)} 
            onChange={(v) => updateInputValue('abdulalemTransfers', v)} 
            isDarkMode={isDarkMode}
          />
          <CustomInput 
            label="تحويلات النساء" 
            value={reconciliation.womenTransfers} 
            icon={Heart} 
            onCalcClick={() => openKeypad('womenTransfers', reconciliation.womenTransfers)} 
            onChange={(v) => updateInputValue('womenTransfers', v)} 
            isDarkMode={isDarkMode}
          />
        </AppCard>
        
        <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all shadow-xl ${
            reconResults.status === 'balanced' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-emerald-500/5' :
            reconResults.status === 'surplus' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 shadow-blue-500/5' :
            'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-rose-500/5'
        }`}>
            <div className="p-4 rounded-[1.8rem] bg-current/10 mb-2">
                {reconResults.status === 'balanced' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">النتيجة النهائية للمطابقة</p>
                <h3 className="text-2xl font-black mb-1">
                    {reconResults.status === 'balanced' ? 'الحساب مطابق تماماً' : 
                     reconResults.status === 'surplus' ? `يوجد فائض بنكي` : 
                     `يوجد عجز بنكي`}
                </h3>
                {reconResults.status !== 'balanced' && (
                  <p className="text-lg font-black mt-2">
                    {Math.abs(reconResults.difference).toLocaleString()} <span className="text-xs font-normal">ريال</span>
                  </p>
                )}
            </div>
        </div>

        <div className={`p-6 rounded-2xl border flex items-start gap-4 ${isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-blue-50/50 border-blue-100'}`}>
          <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className={`text-[10px] font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            تتم عملية المطابقة من خلال مقارنة "رصيد البنك الحالي" مع مجموع (مبيعات المتجر + كافة التحويلات الواردة). أي اختلاف يظهر كفائض أو عجز.
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default ReconciliationView;
