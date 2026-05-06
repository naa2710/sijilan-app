import React, { useState } from 'react';
import { 
  Wallet, Plus, Trash2, Edit3, ArrowUpRight, 
  ArrowDownLeft, Filter, Search, Calendar, Tag
} from 'lucide-react';
import { formatNumber } from '../utils/format';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import AppCard from '../components/shared/AppCard';

const AccountsView = ({ isDarkMode, results, globalSettings }) => {
  const [activeType, setActiveType] = useState('all');

  const stats = [
    { label: 'إجمالي الديون (لي)', value: 1500, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: ArrowDownLeft },
    { label: 'إجمالي الالتزامات (علي)', value: 450, color: 'text-rose-500', bg: 'bg-rose-500/10', icon: ArrowUpRight }
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="الديون والالتزامات" 
        subtitle="تتبع المبالغ المستحقة والمطلوبة"
        icon={Wallet}
        isDarkMode={isDarkMode}
      />

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <AppCard key={i} isDarkMode={isDarkMode} className="!p-4">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className={`text-[10px] font-black opacity-40 uppercase mb-1`}>{stat.label}</p>
            <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatNumber(stat.value)}
            </p>
          </AppCard>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {['all', 'receivable', 'payable'].map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black border transition-all whitespace-nowrap ${
              activeType === type
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : (isDarkMode ? 'bg-slate-900 border-white/5 text-slate-400' : 'bg-white border-slate-100 text-slate-500 shadow-sm')
            }`}
          >
            {type === 'all' ? 'الكل' : type === 'receivable' ? 'ديون (لي)' : 'التزامات (علي)'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {[1, 2].map((i) => (
          <DebtCard key={i} isDarkMode={isDarkMode} type={i === 1 ? 'receivable' : 'payable'} />
        ))}
      </div>

      <button className="w-full p-5 rounded-[2rem] bg-indigo-600 text-white font-black text-sm shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
        <Plus size={20} /> إضافة سجل جديد
      </button>
    </PageContainer>
  );
};

const DebtCard = ({ isDarkMode, type }) => (
  <AppCard isDarkMode={isDarkMode} className="relative overflow-hidden group">
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
          type === 'receivable' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
        }`}>
          {type === 'receivable' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
        </div>
        <div>
          <h4 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {type === 'receivable' ? 'دين من أحمد' : 'قسط السيارة'}
          </h4>
          <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
            <Calendar size={10} /> 25 أبريل 2024
          </p>
        </div>
      </div>
      <div className="text-left">
        <p className={`text-sm font-black ${type === 'receivable' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {type === 'receivable' ? '+' : '-'}{formatNumber(500)}
        </p>
        <p className="text-[9px] font-bold text-slate-500">ريال</p>
      </div>
    </div>
  </AppCard>
);

export default AccountsView;
