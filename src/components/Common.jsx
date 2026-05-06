import React from 'react';
import { Calculator, AlertTriangle, Info } from 'lucide-react';


/**
 * CustomInput: Input field matching the 'Previous Design'
 */
export const CustomInput = ({ label, value, icon: Icon, onCalcClick, onChange, isDarkMode }) => (
 <div className="space-y-2 text-right w-full">
 <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mr-1">
 {label}
 </label>
 <div className="relative group flex items-center">
 <div className="absolute right-4 text-[var(--text-muted)] pointer-events-none group-focus-within:text-[var(--primary-color)] transition-colors">
 <Icon size={18}/>
 </div>
 <input 
 type="text"
 inputMode="decimal"
 value={value}
 onChange={(e) => {
 let val = e.target.value.replace(/[^\d.]/g, '');
 const parts = val.split('.');
 if (parts.length> 2) {
 val = parts[0] + '.' + parts.slice(1).join('');
 }
 onChange(val);
 }}
 placeholder="0"
 className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl py-4 pr-12 pl-16 text-[var(--text-main)] font-bold text-left min-h-[56px] outline-none focus:border-[var(--primary-color)] transition-all"
 dir="ltr"
/>
 <button 
 onClick={onCalcClick}
 type="button"
 className="absolute left-2 bg-[var(--card-border)] hover:bg-[var(--primary-color)] text-[var(--text-muted)] hover:text-white transition-all p-2.5 rounded-xl shadow-sm cursor-pointer"
>
 <Calculator size={18}/>
 </button>
 </div>
 </div>
);

/**
 * Re-usable Card Component (Legacy Name)
 */
export const Card = ({ children, className = "" }) => (
 <div className={`bg-[var(--card-bg)] p-6 rounded-[24px] border border-[var(--card-border)] ${className}`}>
 {children}
 </div>
);

/**
 * CustomDialog: Re-adding the missing export
 */
export const CustomDialog = ({ config, isDarkMode, onClose, onConfirm }) => {
 const { type, message, title, isDanger, confirmText } = config;
 
 return (
 <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6">
 <div
 
 
 
 onClick={onClose}
 className="absolute inset-0 bg-black/80 backdrop-blur-md"
/>
 <div
 
 
 
 className={`relative w-full max-w-[380px] rounded-[3rem] p-8 shadow-2xl border ${
 isDarkMode ? 'bg-[#0B0E12] border-white/10 shadow-black' : 'bg-white border-slate-100 shadow-slate-200'
 }`}
>
 <div className="text-center">
 <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] shadow-xl ${
 isDanger ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-[var(--primary-color)] text-white shadow-[var(--primary-color)]/20'
 }`}>
 {isDanger ? <AlertTriangle size={32}/> : <Info size={32}/>}
 </div>
 <h3 className={`text-xl font-black mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
 <p className={`text-xs font-bold leading-relaxed mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{message}</p>
 </div>

 <div className="flex gap-4">
 {type === 'confirm' && (
 <button
 onClick={onClose}
 className={`flex-1 py-4 rounded-2xl font-black text-[10px] transition-all ${
 isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
 }`}
>
 إلغاء
 </button>
 )}
 <button
 onClick={onConfirm}
 className={`flex-1 py-4 rounded-2xl font-black text-[10px] transition-all shadow-xl ${
 isDanger 
 ? 'bg-rose-500 text-white shadow-rose-500/30' 
 : 'bg-[var(--primary-color)] text-white shadow-[var(--primary-color)]/30'
 }`}
>
 {confirmText || 'موافق'}
 </button>
 </div>
 </div>
 </div>
 );
};
