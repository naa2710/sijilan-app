import React from 'react';
import { Bell } from 'lucide-react';

const PageHeader = ({ 
  title, 
  subtitle, 
  isDarkMode,
  unreadNotifications = 0,
  onNotificationClick
}) => {
  return (
    <div className="flex justify-between items-center p-6 pb-6 pt-8">
      <div className="text-right">
        <h2 className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mb-1">
          {subtitle || "النظام المالي الذكي"}
        </h2>
        <h1 className="text-[var(--text-main)] text-xl font-black">
          {title}
        </h1>
      </div>
      <button 
        onClick={onNotificationClick}
        className="relative p-2.5 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] transition-all active:scale-95"
      >
        <Bell size={22} className="text-[var(--text-muted)]" />
        {unreadNotifications > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white shadow-lg ring-2 ring-[var(--bg-color)]">
            {unreadNotifications}
          </span>
        )}
      </button>
    </div>
  );
};

export default PageHeader;
