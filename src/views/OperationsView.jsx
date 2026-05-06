import React from 'react';
import {
 Receipt,
 Users,
 User,
 Heart,
 Banknote,
 Landmark,
 AlertCircle,
 Info,
 ChevronDown,
 Copy,
 CheckCircle2,
 FileText,
 History,
} from 'lucide-react';

import { CustomInput } from '../components/Common';
import { formatNumber } from '../utils/format';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Header from '../components/layout/Header';
import AppCard from '../components/shared/AppCard';

const OperationsView = ({
 isDarkMode,
 results,
 inputs,
 globalSettings,
 updateInputValue,
 openKeypad,
 saveToHistory,
 isDownloading,
 copied,
 copyReport,
 printReport,
 applyMariamDiscount,
 setApplyMariamDiscount,
 showFlowchart,
 setShowFlowchart,
 setIsSidebarOpen,
}) => {
 const fixedShareAmount = Number(globalSettings?.financials?.partyCAmount) || 0;
 const totalPool = Number(results?.totalPool) || 0;
 const insufficientPool = applyMariamDiscount && totalPool < fixedShareAmount;

 return (
 <PageContainer>
 <Header 
 title="العمليات المالية"
 subtitle="حساب وتوزيع الحصص"
 isDarkMode={isDarkMode}
 setIsSidebarOpen={setIsSidebarOpen}
/>

 <div id="report-content" className="space-y-6">
 <div className="relative overflow-hidden rounded-[24px] bg-[var(--primary-color)] p-6 text-white shadow-xl">
 <div
 className="absolute inset-0 opacity-10"
 style={{
 backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
 backgroundSize: '24px 24px',
 }}
/>
 <div className="relative z-10 flex items-start justify-between">
 <span className="text-xs font-bold uppercase tracking-wider text-white/80">إجمالي المبالغ المدخلة</span>
 <Landmark size={20} className="opacity-70"/>
 </div>
 <div className="relative z-10 mt-5">
 <div className="text-3xl font-black">
 {formatNumber(results?.totalInitial || 0)} <span className="text-sm font-normal">ريال</span>
 </div>
 <div className="mt-4 flex gap-4 text-[10px] font-bold text-white/80">
 <div className="flex items-center gap-1">
 <User size={12}/>
 {globalSettings?.names?.partyA}
 </div>
 <div className="flex items-center gap-1">
 <Users size={12}/>
 {globalSettings?.names?.partyB}
 </div>
 </div>
 </div>
 </div>

 <AppCard isDarkMode={isDarkMode} className="space-y-4 !rounded-[24px]">
 <CustomInput
 label={`حساب ${globalSettings?.names?.partyA}`}
 value={inputs?.abdulalem || ''}
 icon={User}
 onCalcClick={() => openKeypad('abdulalem', inputs?.abdulalem)}
 onChange={(value) => updateInputValue('abdulalem', value)}
 isDarkMode={isDarkMode}
/>

 <CustomInput
 label={`حساب ${globalSettings?.names?.partyB}`}
 value={inputs?.brothers || ''}
 icon={Users}
 onCalcClick={() => openKeypad('brothers', inputs?.brothers)}
 onChange={(value) => updateInputValue('brothers', value)}
 isDarkMode={isDarkMode}
/>

 <button
 type="button"
 onClick={() => setApplyMariamDiscount(!applyMariamDiscount)}
 className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-right transition-all ${
 applyMariamDiscount
 ? 'border-[var(--primary-color)] bg-[var(--primary-faint)]'
 : isDarkMode
 ? 'border-white/10 bg-[#0b0e12]'
 : 'border-slate-200 bg-slate-50'
 }`}
>
 <div className="flex items-center gap-3">
 <div className={`rounded-xl p-2 ${
 applyMariamDiscount
 ? 'bg-[var(--primary-color)] text-white'
 : isDarkMode
 ? 'bg-white/5 text-slate-400'
 : 'bg-slate-200 text-slate-600'
 }`}>
 <Heart size={18} fill={applyMariamDiscount ? 'currentColor' : 'none'}/>
 </div>
 <div>
 <p className={`text-xs font-bold ${applyMariamDiscount ? 'text-[var(--primary-color)]' : isDarkMode ? 'text-white' : 'text-slate-900'}`}>
 تفعيل حصة {globalSettings?.names?.partyC}
 </p>
 <p className={`mt-1 text-[9px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
 خصم {formatNumber(fixedShareAmount)} ريال من النسبة
 </p>
 </div>
 </div>
 <div className={`h-5 w-5 rounded-full border-2 ${applyMariamDiscount ? 'border-[var(--primary-color)] bg-[var(--primary-color)]' : isDarkMode ? 'border-white/15' : 'border-slate-300'}`}/>
 </button>

 
 {insufficientPool && (
 <div
 
 
 
 className="overflow-hidden"
>
 <div className="mt-1 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
 <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500"/>
 <div>
 <p className="text-xs font-bold text-rose-500">مبلغ الصندوق غير كافٍ</p>
 <p className="mt-1 text-[10px] leading-relaxed text-rose-400">
 صندوق النسب أفرز <strong>{formatNumber(totalPool)} ريال</strong> مما لا يغطي حصة {globalSettings?.names?.partyC} بالكامل.
 </p>
 </div>
 </div>
 </div>
 )}
 
 </AppCard>

 <div className="grid gap-3">
 <StatItem label={`الصافي لـ ${globalSettings?.names?.partyA}`} value={results?.finalA} icon={User} colorClass="bg-blue-600" bgColor="bg-blue-50/5" isDarkMode={isDarkMode}/>
 <StatItem label={`الصافي لـ ${globalSettings?.names?.partyB}`} value={results?.finalB} icon={Users} colorClass="bg-emerald-600" bgColor="bg-emerald-50/5" isDarkMode={isDarkMode}/>
 <div className="grid grid-cols-2 gap-3">
 <StatItem label="حصة عاصم" value={results?.finalAsim} icon={User} colorClass="bg-purple-600" bgColor="bg-purple-50/5" isDarkMode={isDarkMode}/>
 <StatItem label={`حصة ${globalSettings?.names?.partyC}`} value={results?.mariamShare} icon={Heart} colorClass="bg-pink-600" bgColor="bg-pink-50/5" isDarkMode={isDarkMode}/>
 </div>
 </div>

 <button
 type="button"
 onClick={() => setShowFlowchart(!showFlowchart)}
 className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all ${
 isDarkMode
 ? 'border-white/10 bg-[#141A21] hover:border-[var(--primary-color)]'
 : 'border-slate-200 bg-white hover:border-[var(--primary-color)]'
 }`}
>
 <div className="flex items-center gap-3">
 <div className={`flex items-center justify-center rounded-xl p-2 ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
 <Info size={18}/>
 </div>
 <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>تسلسل العمليات وطريقة الحسبة</span>
 </div>
 <ChevronDown size={18} className={`transition-transform ${showFlowchart ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}/>
 </button>

 
 {showFlowchart && (
 <div
 
 
 
 className="overflow-hidden"
>
 <AppCard isDarkMode={isDarkMode} className="!rounded-[24px] !pt-4">
 <div className={`relative mt-4 space-y-6 border-r-2 pr-5 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
 <FlowStep
 title="إجمالي المدخلات"
 tone="border-slate-400"
 body={`المبلغ الأساسي المدخل لجميع الأطراف: ${formatNumber(results?.totalInitial || 0)} ريال.`}
 isDarkMode={isDarkMode}
/>
 <FlowStep
 title="استقطاع النسب"
 tone="border-indigo-500"
 body={`يُستقطع ${globalSettings?.financials?.partyAPct}% من ${globalSettings?.names?.partyA} (${formatNumber(results?.discA || 0)}) و ${globalSettings?.financials?.partyBPct}% من ${globalSettings?.names?.partyB} (${formatNumber(results?.discB || 0)}) لتكوين الصندوق بإجمالي ${formatNumber(results?.totalPool || 0)} ريال.`}
 isDarkMode={isDarkMode}
/>
 <FlowStep
 title={`حصة ${globalSettings?.names?.partyC}`}
 tone="border-pink-500"
 body={`يُخصم من الصندوق مبلغ ${formatNumber(results?.mariamShare || 0)} ريال. المتبقي بعد الخصم ${formatNumber(results?.poolAfterMariam || 0)} ريال.`}
 isDarkMode={isDarkMode}
/>
 <FlowStep
 title="حصة عاصم والتوزيع"
 tone="border-purple-500"
 body={`المتبقي من الصندوق يُقسم بالنصف. نصف لعاصم: ${formatNumber(results?.halfDistribution || 0)} ريال، والنصف الآخر يُضاف إلى صافي ${globalSettings?.names?.partyA}.`}
 isDarkMode={isDarkMode}
/>
 <FlowStep
 title="العمولة البنكية"
 tone="border-rose-500"
 body={`تُحسب العمولة على المبالغ بعد الاستقطاع. خُصم ${formatNumber(results?.commA || 0)} من ${globalSettings?.names?.partyA} و ${formatNumber(results?.commB || 0)} من ${globalSettings?.names?.partyB}.`}
 isDarkMode={isDarkMode}
/>
 <FlowStep
 title="المستحق النهائي"
 tone="border-emerald-500"
 body="تم احتساب الصافي النهائي لكل مستفيد بعد تطبيق جميع الخصومات والعوائد."
 isDarkMode={isDarkMode}
/>
 </div>
 </AppCard>
 </div>
 )}
 

 <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-7 text-white shadow-2xl">
 <div className="relative z-10 flex items-center gap-5">
 <div className="rounded-2xl bg-[var(--primary-color)] p-4 shadow-lg">
 <Banknote className="h-8 w-8 text-white"/>
 </div>
 <div>
 <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/70">المستحق للتحويل من البنك</p>
 <div className="text-2xl font-black">
 {formatNumber(results?.totalToTransfer || 0)} <span className="text-sm font-medium opacity-60">ريال</span>
 </div>
 </div>
 </div>
 </div>

 <div  className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={copyReport}
 className={`flex items-center justify-center gap-2 rounded-2xl p-4 transition-all ${
 copied
 ? 'bg-emerald-500 text-white'
 : isDarkMode
 ? 'border border-white/10 bg-[#141A21] text-white hover:border-emerald-500 hover:text-emerald-400'
 : 'border border-slate-200 bg-white text-slate-900 hover:border-emerald-500 hover:text-emerald-600'
 }`}
>
 {copied ? <CheckCircle2 size={18}/> : <Copy size={18}/>}
 <span className="text-[11px] font-bold">{copied ? 'تم النسخ' : 'نسخ النص'}</span>
 </button>

  <button
    type="button"
    onClick={printReport}
    className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary-color)] p-4 text-white transition-all"
  >
    <FileText size={18}/>
    <span className="text-[11px] font-bold">طباعة التقرير</span>
  </button>
 </div>

 <button
 type="button"
 onClick={() => saveToHistory('distribution')}
 
 className={`flex w-full items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition-all ${
 isDarkMode
 ? 'border-white/10 bg-[#141A21] text-white hover:border-[var(--primary-color)]'
 : 'border-slate-200 bg-white text-slate-900 hover:border-[var(--primary-color)]'
 }`}
>
 <History size={18} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}/>
 حفظ العملية في السجل للرجوع إليها
 </button>
 </div>
 </PageContainer>
 );
};

const StatItem = ({ label, value, icon: Icon, colorClass, bgColor, isDarkMode }) => (
 <div className={`flex items-center justify-between rounded-2xl border p-4 text-right ${bgColor} ${isDarkMode ? 'border-white/10' : 'border-slate-200 bg-white'}`}>
 <div className="flex items-center gap-3">
 <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${colorClass}`}>
 <Icon size={20}/>
 </div>
 <div>
 <p className={`mb-1 text-[10px] font-medium uppercase leading-none ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
 <p className={`text-lg font-bold leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
 {formatNumber(value || 0)} <span className="text-[10px] font-normal opacity-60">ريال</span>
 </p>
 </div>
 </div>
 </div>
);

const FlowStep = ({ title, body, tone, isDarkMode }) => (
 <div className="relative">
 <div className={`absolute -right-[29px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-inherit ${tone}`}>
 <div className={`h-1.5 w-1.5 rounded-full ${tone.replace('border-', 'bg-')}`}/>
 </div>
 <h4 className={`mb-1 text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
 <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{body}</p>
 </div>
);

export default OperationsView;
