import React from 'react';

import { formatNumber } from '../../utils/format';

const StatCard = ({ label, value, icon: Icon, color, isDarkMode, suffix = 'ريال' }) => (
 <div className={`p-4 rounded-[2rem] border transition-all flex flex-col gap-3 ${
 isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-100 shadow-sm'
 }`}>
 <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg shadow-current/20`}>
 <Icon size={20}/>
 </div>
 <div>
 <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
 <p className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
 {formatNumber(value || 0)} <span className="text-[10px] font-normal opacity-50">{suffix}</span>
 </p>
 </div>
 </div>
);

export default StatCard;
