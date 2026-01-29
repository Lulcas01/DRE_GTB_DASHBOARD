// utils/constants.js

// utils/formatters.js
export const formatMoney = (val) => 
  `R$ ${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const formatCompact = (val) => 
  val >= 1000000 ? `R$ ${(val / 1000000).toFixed(1)}M` : `R$ ${(val / 1000).toFixed(0)}k`;

export const formatPercent = (val, total) => 
  total ? `${((val / total) * 100).toFixed(1)}%` : '0%';