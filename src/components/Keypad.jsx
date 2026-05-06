import React from 'react';
import { Delete, Divide, X, Minus, Plus, Equal, CheckCircle2, RotateCcw } from 'lucide-react';
import { formatNumber } from '../utils/format';

export const Keypad = ({ 
  isOpen, 
  onClose, 
  display, 
  prevValue, 
  operator, 
  onDigit, 
  onOperator, 
  onClear, 
  onDelete, 
  onEquals, 
  onConfirm,
  isDarkMode
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000]" 
      />
      <div className="fixed inset-x-0 bottom-0 flex justify-center z-[1001] pointer-events-none">
        <div className={`w-full max-w-[430px] rounded-t-[40px] border-t pb-10 pointer-events-auto ${
          isDarkMode ? 'bg-[#141A21] border-white/10' : 'bg-white border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]'
        }`}>
          <div className={`w-12 h-1.5 rounded-full mx-auto my-4 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}/>
          
          {/* Display */}
          <div className="px-8 mb-6">
            <div className={`rounded-3xl p-6 text-right border transition-all ${
              isDarkMode ? 'bg-[#0B0E12] border-white/5' : 'bg-slate-50 border-slate-200 shadow-inner'
            }`}>
              <div className="h-6 text-slate-500 text-xs font-medium overflow-hidden mb-1">
                {prevValue !== null && `${formatNumber(prevValue)} ${operator || ''}`}
              </div>
              <div className={`text-4xl font-black flex items-center justify-end gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatNumber(display)} <span className="text-sm font-normal text-indigo-500">ريال</span>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-3 px-6" dir="ltr">
            {/* Row 1 */}
            <button onClick={onClear} className={`h-16 rounded-2xl font-black text-sm active:scale-95 transition-all ${isDarkMode ? 'bg-rose-500/10 text-rose-500' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
              AC
            </button>
            <button onClick={onDelete} className={`h-16 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
              <Delete size={20}/>
            </button>
            <button onClick={() => onOperator('/')} className={`h-16 rounded-2xl flex items-center justify-center font-black text-2xl transition-all ${operator === '/' ? 'bg-indigo-600 text-white shadow-lg' : (isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-50 text-slate-700 border border-slate-100')}`}>
              ÷
            </button>
            <button onClick={() => onOperator('*')} className={`h-16 rounded-2xl flex items-center justify-center font-black text-2xl transition-all ${operator === '*' ? 'bg-indigo-600 text-white shadow-lg' : (isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-50 text-slate-700 border border-slate-100')}`}>
              ×
            </button>

            {/* Row 2 */}
            <button onClick={() => onDigit('7')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>7</button>
            <button onClick={() => onDigit('8')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>8</button>
            <button onClick={() => onDigit('9')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>9</button>
            <button onClick={() => onOperator('-')} className={`h-16 rounded-2xl flex items-center justify-center font-black text-3xl transition-all ${operator === '-' ? 'bg-indigo-600 text-white shadow-lg' : (isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-50 text-slate-700 border border-slate-100')}`}>
              -
            </button>

            {/* Row 3 */}
            <button onClick={() => onDigit('4')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>4</button>
            <button onClick={() => onDigit('5')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>5</button>
            <button onClick={() => onDigit('6')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>6</button>
            <button onClick={() => onOperator('+')} className={`h-16 rounded-2xl flex items-center justify-center font-black text-3xl transition-all ${operator === '+' ? 'bg-indigo-600 text-white shadow-lg' : (isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-50 text-slate-700 border border-slate-100')}`}>
              +
            </button>

            {/* Row 4 */}
            <button onClick={() => onDigit('1')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>1</button>
            <button onClick={() => onDigit('2')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>2</button>
            <button onClick={() => onDigit('3')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>3</button>
            <button onClick={onEquals} className={`h-16 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
              <Equal size={24} strokeWidth={3}/>
            </button>

            {/* Row 5 */}
            <button onClick={() => onDigit('0')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>0</button>
            <button onClick={() => onDigit('.')} className={`h-16 rounded-2xl text-2xl font-black active:scale-95 transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>.</button>
            <button 
              onClick={onConfirm} 
              className="col-span-2 h-16 bg-indigo-600 rounded-2xl text-white font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-indigo-600/30 border-2 border-white/10"
              dir="rtl"
            >
              <CheckCircle2 size={24}/>
              <span>تأكيد المبلغ</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
