import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const DreSubItem = ({ label, value, percent }) => (
  <div className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors active:bg-gray-100">
    <span className="text-slate-600 font-medium">{label}</span>
    <div className="text-right">
       <div className="font-bold text-slate-700">{value}</div>
       {percent && <div className="text-[10px] text-slate-400">{percent}</div>}
    </div>
  </div>
);

export const DreItem = ({ title, value, percentage, colorBase, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  return (
    <div className="mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 md:p-4 rounded-xl transition-all border border-transparent active:scale-[0.98] duration-200 ${isOpen ? 'bg-white shadow-md border-gray-100' : 'bg-white/60 hover:bg-white'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorBase.bg} ${colorBase.text}`}>
             {children ? <Icon size={18} /> : <div className="w-4 h-4 rounded-full bg-current opacity-30"/>}
          </div>
          <div className="text-left">
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider">{title}</p>
            <p className={`text-lg md:text-xl font-bold ${colorBase.textPrincipal || 'text-slate-800'}`}>
              {value}
            </p>
          </div>
        </div>
        {percentage && (
           <div className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${colorBase.bg} ${colorBase.text}`}>
             {percentage}
           </div>
        )}
      </button>
      {isOpen && children && (
        <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1 py-2 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};