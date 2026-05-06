import React from 'react';

const AppCard = ({ children, className = "", isDarkMode }) => {
  return (
    <div className={`w-full rounded-[24px] p-6 border transition-all ${
      isDarkMode 
        ? 'bg-[#141A21] border-[#1F2A3666] shadow-xl' 
        : 'bg-white border-slate-200 shadow-sm'
    } ${className}`}>
      {children}
    </div>
  );
};

export default AppCard;
