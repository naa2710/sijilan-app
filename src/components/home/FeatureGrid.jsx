import React from 'react';
import { Settings, History, Archive, Share2, Database, MessageSquare } from 'lucide-react';
import FeatureCard from '../shared/FeatureCard';

const FeatureGrid = ({ setActiveTab, isDarkMode, unreadMessages }) => {
  const features = [
    { id: 'reports', label: 'السجل والأرشيف', icon: History, color: 'bg-slate-600', desc: 'تاريخ العمليات' },
    { id: 'settings', label: 'الإعدادات', icon: Settings, color: 'bg-slate-500', desc: 'تهيئة النظام' },
    { id: 'personal_accounts', label: 'الرسائل', icon: MessageSquare, color: 'bg-indigo-500', desc: 'محادثات الشركاء', badge: unreadMessages > 0 ? unreadMessages : null },
    { id: 'personal_accounts', label: 'روابط المشاركة', icon: Share2, color: 'bg-sky-500', desc: 'إدارة الوصول' },
    { id: 'settings', label: 'نسخ احتياطي', icon: Database, color: 'bg-amber-600', desc: 'تأمين البيانات' },
    { id: 'reports', label: 'الأرشيف العام', icon: Archive, color: 'bg-rose-600', desc: 'السجلات القديمة' },
  ];

  return (
    <div className="mb-8">
      <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>الخدمات الإضافية</h3>
      <div className="grid grid-cols-3 gap-3">
        {features.map((feature, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(feature.id)}
            className={`p-4 rounded-[2rem] border text-center transition-all flex flex-col items-center gap-3 group relative ${
              isDarkMode 
                ? 'bg-[#141A21] border-white/5 hover:border-white/10 active:bg-white/5' 
                : 'bg-white border-slate-100 shadow-sm hover:shadow-md active:bg-slate-50'
            }`}
          >
            {feature.badge && (
              <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                {feature.badge}
              </div>
            )}
            <div className={`w-10 h-10 rounded-2xl ${feature.color} flex items-center justify-center text-white shadow-lg shadow-current/15 group-hover:scale-110 transition-transform`}>
              <feature.icon size={20} />
            </div>
            <span className={`text-[10px] font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{feature.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FeatureGrid;
