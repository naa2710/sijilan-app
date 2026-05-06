import React, { useState, useMemo } from 'react';
import { 
 Plus, Trash2, Banknote, Calendar, 
 ChevronRight, Info, AlertCircle 
} from 'lucide-react';

import PageContainer from '../components/layout/PageContainer';
import Header from '../components/layout/Header';
import { formatNumber, formatDateTime } from '../utils/format';

const AbdulalemView = ({ isDarkMode, setIsSidebarOpen, abdalalemEntries = [], setAbdalalemEntries, globalSettings }) => {
 const [newAmount, setNewAmount] = useState('');
 const [newNote, setNewNote] = useState('');
 const [showAddModal, setShowAddModal] = useState(false);

 const stats = useMemo(() => {
 const gross = abdalalemEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
 const discountRate = globalSettings?.financials?.partyAPct || 5;
 const commRate = globalSettings?.financials?.bankCommRate || 2;
 
 const discount = (gross * discountRate) / 100;
 const comm = ((gross - discount) * commRate) / 100;
 const net = gross - discount - comm;

 return { gross, discount, comm, net, discountRate, commRate };
 }, [abdalalemEntries, globalSettings]);

 const handleAddEntry = (e) => {
 e.preventDefault();
 if (!newAmount) return;
 
 const entry = {
 id: Date.now(),
 amount: parseFloat(newAmount),
 note: newNote,
 createdAt: new Date().toISOString(),
 };
 
 setAbdalalemEntries(prev => [entry, ...prev]);
 setNewAmount('');
 setNewNote('');
 setShowAddModal(false);
 };

 const deleteEntry = async (id) => {
 if (await window.appConfirm?.('هل أنت متأكد من حذف هذا القيد؟', 'حذف')) {
 setAbdalalemEntries(prev => prev.filter(e => e.id !== id));
 }
 };

 return (
 <PageContainer>
 <Header 
 title="حساب عبد العالم"
 subtitle="المدخلات المباشرة"
 isDarkMode={isDarkMode}
 setIsSidebarOpen={setIsSidebarOpen}
/>

 {/* Summary Cards */}
 <div className="grid grid-cols-2 gap-4 mb-6 mt-4">
 <div className={`p-5 rounded-[2rem] border-2 flex flex-col justify-center items-center ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
 <p className="text-[10px] font-black mb-2 uppercase tracking-widest text-center">إجمالي المبالغ</p>
 <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatNumber(stats.gross)}</p>
 </div>
 <div className={`p-5 rounded-[2rem] border-2 flex flex-col justify-center items-center ${isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
 <p className="text-[10px] font-black mb-2 uppercase tracking-widest text-center">خصم {stats.discountRate}%</p>
 <p className={`text-2xl font-black ${isDarkMode ? 'text-rose-500' : 'text-rose-600'}`}>{formatNumber(stats.discount)}</p>
 </div>
 <div className={`p-5 rounded-[2rem] border-2 flex flex-col justify-center items-center ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
 <p className="text-[10px] font-black mb-2 uppercase tracking-widest text-center">عمولة {stats.commRate}%</p>
 <p className={`text-2xl font-black ${isDarkMode ? 'text-orange-500' : 'text-orange-600'}`}>{formatNumber(stats.comm)}</p>
 </div>
 <div className={`p-5 rounded-[2rem] border-2 flex flex-col justify-center items-center ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
 <p className="text-[10px] font-black mb-2 uppercase tracking-widest text-center">الصافي لترحيله</p>
 <p className={`text-2xl font-black ${isDarkMode ? 'text-indigo-500' : 'text-indigo-600'}`}>{formatNumber(stats.net)}</p>
 </div>
 </div>

 <div className="px-1 flex justify-between items-center mb-4">
 <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>القيود الأخيرة</h3>
 <button 
 onClick={() => setShowAddModal(true)}
 className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-color)] text-white rounded-xl text-xs font-black shadow-lg shadow-[var(--primary-color)]/20 active:scale-95 transition-all"
>
 <Plus size={16}/> إضافة قيد جديد
 </button>
 </div>

 <div className="space-y-4 pb-20">
 {abdalalemEntries.length === 0 ? (
 <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
 <Banknote size={48} className="opacity-20"/>
 <p className="text-xs font-bold text-slate-500 text-center">لا توجد قيود مسجلة لـ عبد العالم بعد.</p>
 </div>
 ) : (
 abdalalemEntries.map((entry) => (
 <div 
 
 
 
 key={entry.id}
 className={`p-5 rounded-[2rem] border transition-all ${
 isDarkMode ? 'bg-[#141A21] border-white/5' : 'bg-white border-slate-100 shadow-sm'
 }`}
>
 <div className="flex justify-between items-center mb-3">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
 <Banknote size={18}/>
 </div>
 <div>
 <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatNumber(entry.amount)} ريال</p>
 <p className="text-[10px] font-bold text-slate-500">{formatDateTime(entry.createdAt)}</p>
 </div>
 </div>
 <button 
 onClick={() => deleteEntry(entry.id)}
 className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'hover:bg-rose-500/20 text-rose-500/50 hover:text-rose-500' : 'hover:bg-rose-50 text-rose-300 hover:text-rose-500'}`}
>
 <Trash2 size={16}/>
 </button>
 </div>
 {entry.note && (
 <div className={`mt-3 p-3 rounded-2xl text-[10px] font-bold leading-relaxed ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
 {entry.note}
 </div>
 )}
 </div>
 ))
 )}
 </div>

 {/* Add Modal */}
 
 {showAddModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <div 
 
 
 
 onClick={() => setShowAddModal(false)}
 className="absolute inset-0 bg-black/60 backdrop-blur-sm"
/>
 <div 
 
 
 
 className={`relative w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl ${isDarkMode ? 'bg-[#141A21] border border-white/10' : 'bg-white border border-slate-200'}`}
>
 <h3 className={`text-lg font-black mb-6 text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>إضافة قيد لـ عبد العالم</h3>
 
 <form onSubmit={handleAddEntry} className="space-y-5">
 <div>
 <label className={`block text-[10px] font-black mb-2 uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>المبلغ</label>
 <input 
 autoFocus
 type="number" 
 step="any"
 value={newAmount}
 onChange={(e) => setNewAmount(e.target.value)}
 placeholder="0.00"
 className={`w-full p-4 rounded-2xl text-lg font-black outline-none transition-all ${
 isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-[var(--primary-color)]' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-[var(--primary-color)]'
 } border-2`}
/>
 </div>
 
 <div>
 <label className={`block text-[10px] font-black mb-2 uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ملاحظة (اختياري)</label>
 <textarea 
 value={newNote}
 onChange={(e) => setNewNote(e.target.value)}
 placeholder="اكتب تفاصيل القيد هنا..."
 className={`w-full p-4 rounded-2xl text-xs font-bold outline-none transition-all resize-none h-24 ${
 isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-[var(--primary-color)]' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-[var(--primary-color)]'
 } border-2`}
/>
 </div>

 <div className="flex gap-3 pt-4">
 <button 
 type="button"
 onClick={() => setShowAddModal(false)}
 className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
>
 إلغاء
 </button>
 <button 
 type="submit"
 className="flex-1 py-4 rounded-2xl bg-[var(--primary-color)] text-white font-black text-sm shadow-xl shadow-[var(--primary-color)]/20 active:scale-95 transition-all"
>
 إضافة
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 
 </PageContainer>
 );
};

export default AbdulalemView;
