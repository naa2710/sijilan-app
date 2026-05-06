import React from 'react';
import { 
 X, Settings, Home, Calculator, Banknote, 
 ShieldCheck, FileText, UserCheck, Heart, Moon, Sun, Trash2
} from 'lucide-react';


const Sidebar = ({ isOpen, onClose, activeTab, setActiveTab, isDarkMode, toggleDarkMode, globalSettings }) => {
 const menuItems = [
 { id: 'home', label: 'الرئيسية', icon: Home },
 { id: 'accounts', label: 'دفتر الأفراد', icon: Banknote },
 { id: 'individual', label: 'حاسبة الأفراد', icon: UserCheck },
 { id: 'reconciliation', label: 'المطابقة البنكية', icon: ShieldCheck },
 { id: 'reports', label: 'السجلات والتقارير', icon: FileText },
 { id: 'operations', label: 'العمليات المالية', icon: Calculator },
 { id: 'settings', label: 'الإعدادات', icon: Settings },
 ];

 return (
    <>
      {isOpen && (
 <>
 {/* Overlay */}
 <div
 
 
 
 onClick={onClose}
 className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] max-w-md mx-auto"
/>
 
 {/* Sidebar Panel */}
 <div
 
 
 
 
 className={`fixed top-0 right-0 bottom-0 w-[280px] z-[1001] shadow-2xl flex flex-col ${
 isDarkMode ? 'bg-[#141A21] text-white' : 'bg-white text-slate-900'
 }`}
>
 {/* Header */}
 <div className="p-6 flex items-center justify-between border-b border-slate-500/10">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[var(--primary-color)] flex items-center justify-center text-white shadow-lg">
 <Banknote size={24}/>
 </div>
 <div>
 <h2 className="text-sm font-black">ميزان السجلات</h2>
 <p className="text-[10px] text-slate-500 font-bold">النظام المالي الذكي</p>
 </div>
 </div>
 <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors">
 <X size={20}/>
 </button>
 </div>

 {/* Menu Items */}
 <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 no-scrollbar">
 {menuItems.map((item) => (
 <button
 key={item.id}
 onClick={() => {
 setActiveTab(item.id);
 onClose();
 }}
 className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
 activeTab === item.id 
 ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-glow)]' 
 : 'hover:bg-slate-500/5 text-slate-500'
 }`}
>
 <item.icon size={20}/>
 <span className="text-xs font-black">{item.label}</span>
 </button>
 ))}
 </div>

 {/* Footer / Quick Actions */}
 <div className="p-6 border-t border-slate-500/10 space-y-4">
 <button 
 onClick={toggleDarkMode}
 className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
 isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
 }`}
>
 <div className="flex items-center gap-3">
 {isDarkMode ? <Moon size={18} className="text-amber-400"/> : <Sun size={18} className="text-amber-500"/>}
 <span className="text-[10px] font-black">{isDarkMode ? 'الوضع الليلي' : 'الوضع النهاري'}</span>
 </div>
 <div className={`w-10 h-5 rounded-full relative transition-all ${isDarkMode ? 'bg-[var(--primary-color)]' : 'bg-slate-300'}`}>
 <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isDarkMode ? 'right-1' : 'left-1'}`}/>
 </div>
 </button>
 
 <div className="text-center pt-2">
 <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">إصدار النظام V2.0</p>
 </div>
 </div>
 </div>
 </>
      )}
    </>
  );
};

export default Sidebar;
