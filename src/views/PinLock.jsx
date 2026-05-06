import React, { useEffect, useMemo, useState } from 'react';

import { Delete, Fingerprint, Lock, ShieldCheck } from 'lucide-react';

const MAX_ATTEMPTS_BEFORE_COOLDOWN = 5;
const COOLDOWN_SECONDS = 30;

const PinLock = ({
 correctPin,
 onUnlock,
 isDarkMode,
 biometricEnabled = false,
 onBiometricUnlock,
}) => {
 const [pin, setPin] = useState('');
 const [error, setError] = useState(false);
 const [failedAttempts, setFailedAttempts] = useState(0);
 const [cooldownRemaining, setCooldownRemaining] = useState(0);
 const [biometricBusy, setBiometricBusy] = useState(false);

 const isCoolingDown = cooldownRemaining> 0;
 const attemptsLeft = Math.max(MAX_ATTEMPTS_BEFORE_COOLDOWN - failedAttempts, 0);

 const statusMessage = useMemo(() => {
 if (isCoolingDown) return `تم إيقاف الإدخال مؤقتًا لمدة ${cooldownRemaining} ثانية.`;
 if (error) return attemptsLeft> 0 ? `الرمز غير صحيح. تبقّى ${attemptsLeft} محاولات.` : 'الرمز غير صحيح.';
 return 'أدخل الرمز السري لفتح التطبيق بأمان.';
 }, [attemptsLeft, cooldownRemaining, error, isCoolingDown]);

 const handleDigit = (digit) => {
 if (isCoolingDown || biometricBusy || pin.length>= 4) return;
 setPin((prev) => prev + digit);
 setError(false);
 };

 const handleDelete = () => {
 if (isCoolingDown || biometricBusy) return;
 setPin((prev) => prev.slice(0, -1));
 setError(false);
 };

 useEffect(() => {
 if (!isCoolingDown || cooldownRemaining <= 0) return undefined;
 const timer = window.setInterval(() => {
 setCooldownRemaining((current) => {
 if (current <= 1) {
 window.clearInterval(timer);
 setFailedAttempts(0);
 setPin('');
 setError(false);
 return 0;
 }
 return current - 1;
 });
 }, 1000);
 return () => window.clearInterval(timer);
 }, [cooldownRemaining, isCoolingDown]);

 useEffect(() => {
 if (pin.length !== 4 || isCoolingDown) return undefined;
 if (pin === correctPin) {
 onUnlock();
 return undefined;
 }
 setFailedAttempts(prev => prev + 1);
 setError(true);
 const resetPinTimer = window.setTimeout(() => setPin(''), 220);
 if (failedAttempts + 1>= MAX_ATTEMPTS_BEFORE_COOLDOWN) setCooldownRemaining(COOLDOWN_SECONDS);
 return () => window.clearTimeout(resetPinTimer);
 }, [correctPin, failedAttempts, isCoolingDown, onUnlock, pin]);

 return (
 <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-8 bg-[var(--bg-color)]">
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute -top-24 -right-24 w-96 h-96 bg-[var(--primary-color)]/10 rounded-full blur-[100px]"/>
 <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"/>
 </div>

 <div className="w-full max-w-sm relative z-10">
 <div className="text-center mb-10">
 <div className="w-20 h-20 bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-hover)] rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl">
 {isCoolingDown ? <ShieldCheck size={36}/> : <Lock size={36}/>}
 </div>
 <h1 className="text-2xl font-black mb-2 text-white">أهلاً بك في سجلاتي</h1>
 <p className="text-xs font-bold text-[var(--text-muted)]">{statusMessage}</p>
 </div>

 <div className="flex justify-center gap-6 mb-12">
 {[...Array(4)].map((_, i) => (
 <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length> i ? 'bg-[var(--primary-color)] border-[var(--primary-color)] scale-125' : 'border-white/10 bg-white/5'}`}/>
 ))}
 </div>

 <div className="grid grid-cols-3 gap-4 mb-8">
 {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
 <button key={num} onClick={() => handleDigit(String(num))} className="h-20 rounded-[1.8rem] text-xl font-black bg-white/5 text-white hover:bg-white/10 active:scale-90 transition-all">
 {num}
 </button>
 ))}
 <div/>
 <button onClick={() => handleDigit('0')} className="h-20 rounded-[1.8rem] text-xl font-black bg-white/5 text-white hover:bg-white/10 active:scale-90 transition-all">0</button>
 <button onClick={handleDelete} className="h-20 rounded-[1.8rem] flex items-center justify-center bg-rose-500/10 text-rose-500 active:scale-90 transition-all">
 <Delete size={24}/>
 </button>
 </div>

 {biometricEnabled && (
 <button onClick={onBiometricUnlock} className="w-full py-5 rounded-[2rem] bg-[var(--primary-color)] text-white font-black text-sm shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
 <Fingerprint size={20}/> الدخول بالبصمة
 </button>
 )}
 </div>
 </div>
 );
};

export default PinLock;
