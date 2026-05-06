import React from 'react';
import { 
  Calculator, FileText, LayoutDashboard, 
  ShieldCheck, Banknote, UserCheck
} from 'lucide-react';

const BottomNavBar = ({ activeTab, setActiveTab, isDarkMode, unreadCount }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--nav-bg)] backdrop-blur-md border-t border-[var(--card-border)] h-20 px-4 flex items-center justify-between z-50 max-w-md mx-auto shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)]">
      
      <NavButton 
        active={activeTab === 'accounts'} 
        onClick={() => setActiveTab('accounts')} 
        icon={<Banknote size={20}/>} 
        label="دفتر الأفراد" 
      />

      <NavButton 
        active={activeTab === 'abdulalem'} 
        onClick={() => setActiveTab('abdulalem')} 
        icon={<UserCheck size={20}/>} 
        label="عبدالعالم" 
      />

      <button 
        onClick={() => setActiveTab('home')} 
        className={`w-12 h-12 rounded-2xl flex items-center justify-center -mt-8 shadow-2xl transition-all hover:scale-110 active:scale-90 ${activeTab === 'home' ? 'bg-[var(--primary-color)] text-white shadow-[var(--primary-glow)]' : 'bg-slate-800 text-white shadow-black/50'}`}
      >
        <LayoutDashboard size={20}/>
      </button>

      <NavButton 
        active={activeTab === 'reconciliation'} 
        onClick={() => setActiveTab('reconciliation')} 
        icon={<ShieldCheck size={20}/>} 
        label="مطابقة" 
      />

      <NavButton 
        active={activeTab === 'reports'} 
        onClick={() => setActiveTab('reports')} 
        icon={<FileText size={20}/>} 
        label="سجلات" 
        unread={unreadCount > 0}
      />
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, unread }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 w-[60px] transition-all active:scale-90 relative ${active ? 'text-[var(--primary-color)]' : 'text-slate-500 hover:text-slate-400'}`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-[var(--primary-color)]/10' : ''}`}>
      {icon}
    </div>
    {unread && (
      <span className="absolute top-1 right-3 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-[var(--nav-bg)]" />
    )}
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default BottomNavBar;
