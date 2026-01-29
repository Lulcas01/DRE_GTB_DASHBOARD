import React from 'react';
import { formatMoney } from '../../utils/formatters'; 

export const MiniRankingCard = ({ title, data, valueKey, icon: Icon, color, isPercent = false }) => {
  
  // Função interna para decidir como formatar
  const formatValue = (val) => {
    if (val === undefined || val === null) return '-';
    
    if (isPercent) {
      // Se for porcentagem, usa 1 casa decimal e o símbolo %
      return `${Number(val).toFixed(1)}%`;
    } else {
      // Se não, usa formatação de dinheiro padrão
      return formatMoney(val);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[160px]">
      {/* Título do Card */}
      <h3 className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${color}`}>
         <Icon size={14} /> {title}
      </h3>

      {/* Lista de Ranking */}
      <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
         {/* Proteção contra dados vazios */}
         {data && data.length > 0 ? (
           data.slice(0, 5).map((item, idx) => ( // Mostra apenas top 5 para não estourar
            <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-50 last:border-0 pb-1 last:pb-0">
               <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-bold text-slate-400 w-4 flex-shrink-0">{idx + 1}°</span>
                  <span className="font-medium text-slate-700 truncate" title={item.nome}>
                    {item.nome}
                  </span>
               </div>
               <div className="font-bold text-slate-600 flex-shrink-0 ml-2">
                  {/* AQUI ESTAVA O ERRO: Agora usamos a função segura formatValue */}
                  {formatValue(item[valueKey])}
               </div>
            </div>
           ))
         ) : (
           <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
             Sem dados para exibir
           </div>
         )}
      </div>
    </div>
  );
};