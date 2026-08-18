import React from 'react';
import { Check } from 'lucide-react';

export default function SuccessModal({ isOpen, onClose, title = "Success!", message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative overflow-hidden w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl text-center transform scale-100 transition-all">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
        
        {/* Animated Check Circle */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border-4 border-emerald-100 animate-bounce">
          <Check className="h-6 w-6 text-emerald-600 stroke-[3]" />
        </div>
        
        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">{title}</h3>
        <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6">{message}</p>
        
        <button 
          onClick={onClose}
          className="w-full rounded-2xl bg-emerald-600 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-emerald-700 active:scale-[0.98] transition cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
