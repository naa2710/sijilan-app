import React from 'react';
import BottomNavBar from './BottomNavBar';

const AppShell = ({ children, isDarkMode, activeTab, setActiveTab, unreadCount }) => {
  return (
    <div dir="rtl" className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-[#0B0E12] text-white' : 'bg-[#F8FAFC] text-slate-900'}`}>
      <div className={`mx-auto min-h-screen w-full max-w-md relative no-scrollbar ${isDarkMode ? 'bg-transparent' : 'bg-white shadow-2xl'}`}>
        <main className="pb-32 no-scrollbar">
          {children}
        </main>
        
        <BottomNavBar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isDarkMode={isDarkMode} 
            unreadCount={unreadCount}
        />
      </div>
    </div>
  );
};

export default AppShell;
