import React from 'react';
import { PlusCircle, Receipt, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import FeatureCard from '../shared/FeatureCard';

const QuickActionsGrid = ({ setActiveTab, isDarkMode }) => {
  const actions = [
    { id: 'operations', label: 'إضافة عملية', icon: PlusCircle, color: 'bg-blue-500', desc: 'تسجيل دخل جديد' },
    { id: 'personal_accounts', label: 'إيصال جديد', icon: Receipt, color: 'bg-emerald-500', desc: 'مبالغ الأفراد' },
    { id: 'reconciliation', label: 'مطابقة بنكية', icon: ShieldCheck, color: 'bg-purple-500', desc: 'توازن الحساب' },
    { id: 'reports', label: 'تصدير كشف', icon: FileSpreadsheet, color: 'bg-amber-500', desc: 'ملفات Excel/PDF' },
  ];

  return (
    <div className="mb-8">
      <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>الإجراءات السريعة</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <FeatureCard
            key={action.id}
            label={action.label}
            description={action.desc}
            icon={action.icon}
            color={action.color}
            onClick={() => setActiveTab(action.id)}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
    </div>
  );
};

export default QuickActionsGrid;
