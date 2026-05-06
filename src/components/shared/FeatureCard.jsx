import React from 'react';


const FeatureCard = ({ label, description, icon: Icon, color, onClick, isDarkMode, badge }) => (
 <button
 
 onClick={onClick}
 className={`p-5 rounded-[2.5rem] border text-right transition-all flex flex-col gap-4 group relative overflow-hidden ${
 isDarkMode 
 ? 'bg-[#141A21] border-white/5 hover:border-white/10 active:bg-white/5' 
 : 'bg-white border-slate-100 shadow-sm hover:shadow-md active:bg-slate-50'
 }`}
>
 {badge && (
 <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-rose-500 text-white text-[8px] font-black animate-pulse">
 {badge}
 </div>
 )}
 
 <div className={`w-12 h-12 rounded-[1.2rem] ${color} flex items-center justify-center text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
 <Icon size={24}/>
 </div>
 
 <div>
 <h3 className={`text-sm font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{label}</h3>
 {description && (
 <p className={`text-[10px] font-bold leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{description}</p>
 )}
 </div>
 </button>
);

export default FeatureCard;
