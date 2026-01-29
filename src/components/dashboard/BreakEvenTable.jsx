import React from 'react';
import { formatCompact } from '../../utils/formatters';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export const BreakEvenTable = ({ dados, filtroStatus }) => {
  
  // Função auxiliar para calcular AV
  const calcAV = (parte, todo) => todo ? (parte / todo) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="px-3 py-3 rounded-tl-lg">Posto</th>
            <th className="px-3 py-3 text-right">Fat. Atual</th>
            {/* Novas Colunas de Análise Vertical */}
            <th className="px-3 py-3 text-right" title="Análise Vertical: Quanto da receita é Lucro">
                Margem (AV)
            </th>
            <th className="px-3 py-3 text-right" title="Análise Vertical: Quanto da receita é gasto com Despesa Operacional">
                Peso Desp.
            </th>
            <th className="px-3 py-3 text-center rounded-tr-lg">Meta / Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {dados
           .filter(posto => {
              const isLucrativo = posto.receita > posto.ponto_equilibrio;
              if (filtroStatus === 'TODOS') return true;
              if (filtroStatus === 'LUCRATIVO') return isLucrativo;
              if (filtroStatus === 'RISCO') return !isLucrativo;
              return true;
           })
           // Ordenar por Margem (Do maior para o menor) para ver os mais eficientes no topo
           .sort((a,b) => {
              const avA = a.receita ? (a.lucro / a.receita) : -999;
              const avB = b.receita ? (b.lucro / b.receita) : -999;
              return avB - avA;
           })
           .map((posto, idx) => {
            const seguro = posto.receita > posto.ponto_equilibrio;
            const avMargem = calcAV(posto.lucro, posto.receita);
            const avDespesa = calcAV(posto.despesa, posto.receita);
            
            // Definição de cores baseada na eficiência
            let corMargem = 'text-slate-600';
            if (avMargem > 5) corMargem = 'text-green-600 font-bold';
            else if (avMargem > 0) corMargem = 'text-yellow-600 font-medium';
            else corMargem = 'text-red-600 font-bold';

            return (
              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                
                {/* Nome do Posto */}
                <td className="px-3 py-3">
                    <div className="font-bold text-slate-700">{posto.nome}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Rank #{idx + 1}</div>
                </td>

                {/* Faturamento */}
                <td className="px-3 py-3 text-right text-slate-600 font-medium">
                    {formatCompact(posto.receita)}
                </td>

                {/* COLUNA 1: MARGEM LÍQUIDA (AV) */}
                <td className="px-3 py-3 text-right">
                    <div className={`flex items-center justify-end gap-1 ${corMargem}`}>
                        {avMargem.toFixed(1)}%
                        {avMargem < 0 ? <TrendingDown size={14}/> : <TrendingUp size={14}/>}
                    </div>
                    {/* Barrinha visual de Margem */}
                    <div className="w-16 h-1 bg-gray-100 rounded-full ml-auto mt-1 overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${avMargem < 0 ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{width: `${Math.min(Math.abs(avMargem) * 5, 100)}%`}} // Escala visual (*5 para dar volume)
                        />
                    </div>
                </td>

                {/* COLUNA 2: PESO DAS DESPESAS (AV) */}
                <td className="px-3 py-3 text-right">
                    <div className="text-slate-700 font-medium">{avDespesa.toFixed(1)}%</div>
                    <div className="text-[9px] text-slate-400">da Receita</div>
                </td>

                {/* Status Break-even */}
                <td className="px-3 py-3 text-center">
                  <div className="flex flex-col items-center justify-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${seguro ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {seguro ? 'LUCRO' : 'PREJUÍZO'}
                      </span>
                      {!seguro && (
                          <span className="text-[9px] text-red-400 mt-0.5 flex items-center gap-1">
                              <AlertCircle size={8}/> Meta: {formatCompact(posto.ponto_equilibrio)}
                          </span>
                      )}
                  </div>
                </td>

              </tr>
            )
          })}
        </tbody>
      </table>
      
      {/* Rodapé explicativo */}
      <div className="px-4 py-2 bg-slate-50 text-[10px] text-slate-400 text-center border-t border-slate-100">
         * <strong>Margem (AV)</strong>: Eficiência real (Lucro / Faturamento). 
         Quanto maior, melhor.
      </div>
    </div>
  );
};