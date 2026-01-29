import React from 'react';
import { TrendingDown, Wallet } from 'lucide-react';

export const CardKPI = ({ title, value, icon: Icon, subtext, colorHex, isNegative }) => (
  <div className={`bg-white p-4 md:p-5 rounded-xl border shadow-sm transition-all relative overflow-hidden ${isNegative ? 'border-red-200' : 'border-gray-100'}`}>
    <div className="flex justify-between items-start mb-3">
      <div className="p-2 md:p-2.5 rounded-lg" style={{ backgroundColor: isNegative ? '#fee2e2' : `${colorHex}15` }}>
        <Icon size={20} style={{ color: isNegative ? '#ef4444' : colorHex }} />
      </div>
      <span className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-full ${isNegative ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-700'}`}>
        {subtext}
      </span>
    </div>
    <div>
      <h3 className={`text-xl md:text-2xl font-bold tracking-tight ${isNegative ? 'text-red-600' : 'text-slate-800'}`}>{value}</h3>
      <p className="text-[10px] md:text-xs text-gray-500 font-medium uppercase mt-1">{title}</p>
    </div>
  </div>
);