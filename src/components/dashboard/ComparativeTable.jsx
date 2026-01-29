import React, { useState, useMemo } from 'react';
import { ArrowUpDown, X, ExternalLink, TrendingUp, Calendar } from 'lucide-react';
import { formatMoney } from '../../utils/formatters';

// Imports de Componentes
import { MainChart } from './MainChart';
import { MonthlyDreTable } from './MonthlyDreTable';
import { MESES } from '../../utils/constants';

// --- IMPORT DO JSON FOI REMOVIDO DAQUI ---

export const ComparativeTable = ({ dados, todosDados, onNavigateToProfile }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'lucro', direction: 'desc' });
  const [selectedStation, setSelectedStation] = useState(null); 

  const sortedData = useMemo(() => {
    let sortableItems = [...dados];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [dados, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const stationDetails = useMemo(() => {
    // Agora usa todosDados (que vem da API) em vez do JSON importado
    if (!selectedStation || !todosDados) return [];
    
    const rawData = todosDados.filter(d => d.posto_nome === selectedStation.nome);
    return rawData.sort((a, b) => MESES.indexOf(a.name) - MESES.indexOf(b.name));
  }, [selectedStation, todosDados]);

  const HeaderItem = ({ label, sortKey, align = "right" }) => (
    <th 
      className={`px-4 py-3 text-${align} text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none`}
      onClick={() => requestSort(sortKey)}
    >
      <div className={`flex items-center gap-1 justify-${align === 'left' ? 'start' : 'end'}`}>
        {label}
        <ArrowUpDown size={12} className={sortConfig.key === sortKey ? "text-blue-600" : "text-slate-300"} />
      </div>
    </th>
  );

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
           <div>
              <h3 className="font-bold text-lg text-slate-800">Matriz Comparativa de Postos</h3>
              <p className="text-sm text-slate-400">Clique em um posto para ver a evolução mensal.</p>
           </div>
           <div className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
              {dados.length} Unidades Listadas
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase w-10">#</th>
                <HeaderItem label="Posto" sortKey="nome" align="left" />
                <HeaderItem label="Receita Bruta" sortKey="receita" />
                <HeaderItem label="Margem Bruta" sortKey="margem_pct" />
                <HeaderItem label="Desp. Pessoal" sortKey="pessoal" />
                <HeaderItem label="Desp. Total" sortKey="despesa" />
                <HeaderItem label="Lucro Líquido" sortKey="lucro" />
                <HeaderItem label="Mg. Líquida" sortKey="lucro" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedData.map((posto, idx) => {
                const margemLiquida = posto.receita ? (posto.lucro / posto.receita) * 100 : 0;
                const isNegative = posto.lucro < 0;

                return (
                  <tr 
                    key={posto.nome} 
                    onClick={() => setSelectedStation(posto)}
                    className="hover:bg-blue-50 cursor-pointer transition-all group"
                  >
                    <td className="px-4 py-3 text-xs text-slate-400 font-bold group-hover:text-blue-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-700 group-hover:text-blue-700">{posto.nome}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {formatMoney(posto.receita)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                      {posto.margem_pct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-orange-600">
                      {formatMoney(posto.pessoal)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">
                      {formatMoney(posto.despesa)}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-black ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                      {formatMoney(posto.lucro)}
                    </td>
                    <td className="px-4 py-3 text-right">
                       <span className={`text-xs font-bold px-2 py-1 rounded ${isNegative ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {margemLiquida.toFixed(1)}%
                       </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
             
             <div className="bg-slate-50 p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                <div>
                   <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="text-blue-600"/> {selectedStation.nome}
                   </h2>
                   <p className="text-xs text-slate-500">Detalhamento mensal completo de 2025.</p>
                </div>
                <div className="flex gap-2">
                   <button 
                     onClick={() => onNavigateToProfile(selectedStation.nome)}
                     className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                   >
                      <ExternalLink size={14} /> Abrir no Dashboard
                   </button>
                   <button onClick={() => setSelectedStation(null)} className="p-2 hover:bg-gray-200 rounded-lg text-slate-500 transition-colors">
                      <X size={20} />
                   </button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                   <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-blue-500"/> Evolução Mensal
                   </h4>
                   <div className="h-64">
                      <MainChart data={stationDetails} />
                   </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                   <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-blue-500"/> DRE Mês a Mês
                   </h4>
                   <MonthlyDreTable data={stationDetails} />
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
};