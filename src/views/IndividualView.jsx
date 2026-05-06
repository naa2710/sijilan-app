import React, { useState } from 'react';
import { 
    UserCheck, Coins, ArrowRightLeft, Percent, Banknote, 
    Copy, Download, Share2, Check 
} from 'lucide-react';
import { CustomInput } from '../components/Common';
import { formatNumber } from '../utils/format';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Header from '../components/layout/Header';
import AppCard from '../components/shared/AppCard';

const IndividualView = ({ 
    isDarkMode, 
    individualInput, 
    updateInputValue, 
    openKeypad, 
    individualData, 
    globalSettings,
    setIsSidebarOpen
}) => {
    const [copied, setCopied] = useState(false);

    return (
        <PageContainer>
            <Header 
                title="حاسبة الأفراد"
                subtitle="حساب سريع ومستقل"
                isDarkMode={isDarkMode}
                setIsSidebarOpen={setIsSidebarOpen}
            />

            <AppCard isDarkMode={isDarkMode}>
                <h3 className={`text-xs font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>المبلغ الخام</h3>
                <CustomInput 
                    label="إجمالي المبلغ المراد حسابه" 
                    value={individualInput} 
                    icon={Coins} 
                    onCalcClick={() => openKeypad('individual', individualInput)} 
                    onChange={(v) => updateInputValue('individual', v)} 
                    isDarkMode={isDarkMode} 
                />
            </AppCard>

            <AppCard isDarkMode={isDarkMode} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="space-y-4">
                    <ResultRow 
                        label={`خصم النسبة (${globalSettings.financials.partyBPct}%)`} 
                        value={individualData.disc} 
                        isDarkMode={isDarkMode} 
                    />
                    <ResultRow 
                        label={`العمولة البنكية (${globalSettings.financials.bankCommRate}%)`} 
                        value={individualData.comm} 
                        isDarkMode={isDarkMode} 
                    />
                    
                    <div className="mt-8 p-8 rounded-[2.5rem] bg-indigo-600 text-white text-center shadow-xl shadow-indigo-600/20">
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2">الصافي النهائي المستحق</p>
                        <h2 className="text-3xl font-black">{formatNumber(individualData.net)} <span className="text-xs font-normal opacity-60">ريال</span></h2>
                    </div>
                </div>
            </AppCard>

            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={async () => {
                        const report = `👤 *حاسبة الأفراد*\nالمبلغ: ${formatNumber(individualData.amount)} ريال\nالنسبة: ${formatNumber(individualData.disc)} ريال\nالعمولة: ${formatNumber(individualData.comm)} ريال\nالصافي: ${formatNumber(individualData.net)} ريال`;
                        try {
                            await navigator.clipboard.writeText(report);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                            const msg = 'تم نسخ تقرير الأفراد بنجاح!';
                            if (window.appAlert) window.appAlert(msg);
                        } catch (err) {
                            console.error('Copy failed:', err);
                            window.appAlert?.('تعذر نسخ التقرير تلقائياً.');
                        }
                    }}
                    className={`flex items-center justify-center gap-3 py-4 rounded-[2rem] border font-black text-xs transition-all ${
                        isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-white border-slate-100 text-slate-900 shadow-sm'
                    }`}
                >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'تم النسخ!' : 'نسخ التقرير'}
                </button>
                <button 
                    className={`flex items-center justify-center gap-3 py-4 rounded-[2rem] border font-black text-xs transition-all ${
                        isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-white border-slate-100 text-slate-900 shadow-sm'
                    }`}
                >
                    <Download size={18} /> حفظ صورة
                </button>
            </div>
        </PageContainer>
    );
};

const ResultRow = ({ label, value, isDarkMode }) => (
    <div className="flex items-center justify-between">
        <span className={`text-xs font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
        <span className="text-rose-500 font-black text-sm">-{formatNumber(value)}</span>
    </div>
);

export default IndividualView;
