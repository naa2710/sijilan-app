import React from 'react';

import { TrendingUp, ArrowUpRight, CloudSync, UserCircle } from 'lucide-react';
import { formatNumber } from '../../utils/format';

const HomeHeaderCard = ({ totalInitial, totalToTransfer, isDarkMode, userName = 'أهلاً بك' }) => {
 return (
 <div 
 
 
 className={`p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl mb-6 ${
 isDarkMode ? 'bg-slate-900' : 'bg-slate-950 text-white'
 }`}
>
 {/* Decorative Gradients */}
 <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-color)]/20 rounded-full -mr-32 -mt-32 blur-[80px]"/>
 <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full -ml-24 -mb-24 blur-[60px]"/>
 
 <div className="relative z-10">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
 <UserCircle size={24} className="text-white/80"/>
 </div>
 <div>
 <p className="text-white/40 text-[10px] font-black tracking-widest">{userName}</p>
 <div className="flex items-center gap-1.5 mt-0.5">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
 <p className="text-[10px] font-bold text-white/60">حالة المزامنة: نشطة</p>
 </div>
 </div>
 </div>
 <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10">
 <TrendingUp className="text-[var(--primary-color)]" size={20}/>
 </div>
 </div>

 <div>
 <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mb-2">إجمالي الإيرادات اليومية</p>
 <h2 className="text-4xl font-black text-white flex items-baseline gap-2">
 {formatNumber(totalInitial)}
 <span className="text-sm font-normal opacity-50">ريال</span>
 </h2>
 </div>

 <div className="grid grid-cols-2 gap-4 mt-10 pt-6 border-t border-white/5">
 <div>
 <p className="text-white/40 text-[9px] font-black uppercase mb-1">صافي التحويل</p>
 <p className="text-lg font-black text-emerald-400">{formatNumber(totalToTransfer)} <span className="text-[10px] opacity-60">ريال</span></p>
 </div>
 <div className="text-left">
 <p className="text-white/40 text-[9px] font-black uppercase mb-1">الوضع الحالي</p>
 <div className="flex items-center justify-end gap-1 text-emerald-400 font-black">
 <ArrowUpRight size={14}/>
 <span>مستقر</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default HomeHeaderCard;
