
import React from 'react';
import { Bell, Menu } from 'lucide-react';

const Header = ({ title, subtitle, isDarkMode, setIsSidebarOpen, unreadNotificationsCount, onOpenNotifications }) => {
  return (
    <div className="flex justify-between items-center mb-6 px-1">
      <div className="text-right">
        {subtitle && <h2 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{subtitle}</h2>}
        <h1 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => onOpenNotifications?.()}
          className={`relative p-3 rounded-2xl border transition-all active:scale-90 ${isDarkMode ? 'bg-[#141A21] border-white/5 text-slate-400 hover:text-white' : 'bg-white border-slate-100 text-slate-500 shadow-sm hover:bg-slate-50'}`}
        >
          <Bell size={24} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#141A21]">
              {unreadNotificationsCount > 9 ? '+9' : unreadNotificationsCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => setIsSidebarOpen?.(true)}
          className={`p-3 rounded-2xl border transition-all active:scale-90 ${isDarkMode ? 'bg-[#141A21] border-white/5 text-slate-400 hover:text-white' : 'bg-white border-slate-100 text-slate-500 shadow-sm hover:bg-slate-50'}`}
        >
          <Menu size={24} />
        </button>
      </div>
    </div>
  );
};

export default Header;
