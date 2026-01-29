import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Filter, BarChart3, PieChart as PieIcon, List, Layers } from 'lucide-react';
import { formatCompact, formatMoney } from '../../utils/formatters';

// Mapeamento baseado EXATAMENTE na sua imagem
const ESTRUTURA_DESPESAS = {
  OPERACIONAIS: {
    label: 'Desp. Operacionais',
    color: '#f59e0b', // Laranja/Amarelo
    keys: ['energia', 'manutencao', 'comerciais', 'logistica', 'rateio', 'outras_operacionais', 'consumo', 'prestacao_servico']
  },
  PESSOAL: {
    label: 'Pessoal',
    color: '#ef4444', // Vermelho (Geralmente o maior custo)
    keys: ['salarios', 'beneficios', 'rescisao', 'acordo', 'comissao', 'pausa_esocial', 'outros_pessoal']
  },
  FINANCEIRAS: {
    label: 'Financeiras',
    color: '#8b5cf6', // Roxo
    keys: ['tarifas_bancarias', 'taxas_cartoes', 'antecipacao', 'juros_naturgy']
  },
  IMPOSTOS: {
    label: 'Impostos/Taxas',
    color: '#64748b', // Cinza
    keys: ['taxas_multas', 'credito_impostos', 'impostos_pausados']
  }
};

export const ExpensesDeepDive = ({ totais }) => {
  const [viewMode, setViewMode] = useState('MACRO'); // 'MACRO' (Grupos) ou 'DETALHADO' (Itens)
  const [chartType, setChartType] = useState('BAR'); // 'BAR' ou 'PIE'
  const [filtroGrupo, setFiltroGrupo] = useState('TODOS'); // Para filtrar o detalhado

  // 1. Processamento dos Dados MACRO (Soma dos Grupos)
  const dadosMacro = useMemo(() => {
    return Object.entries(ESTRUTURA_DESPESAS).map(([groupKey, config]) => {
      // Soma todas as chaves que pertencem a esse grupo
      const valorTotal = config.keys.reduce((acc, key) => acc + (totais[key] || 0), 0);
      
      // Fallback: Se o JSON antigo não tiver as chaves novas, usar os totais legados para preencher visualmente
      // (Isso é apenas para garantir que o gráfico não fique vazio enquanto você não atualiza o JSON completo)
      let valorFinal = valorTotal;
      if (groupKey === 'PESSOAL' && valorTotal === 0) valorFinal = totais.pessoal || 0;
      if (groupKey === 'OPERACIONAIS' && valorTotal === 0) valorFinal = (totais.energia || 0) + (totais.despesas || 0) * 0.2; // Estimativa
      if (groupKey === 'FINANCEIRAS' && valorTotal === 0) valorFinal = (totais.taxas || 0) + (totais.juros_naturgy || 0);

      return {
        name: config.label,
        value: valorFinal,
        color: config.color,
        key: groupKey
      };
    }).filter(d => d.value > 0);
  }, [totais]);

  // 2. Processamento dos Dados DETALHADOS (Item a Item)
  const dadosDetalha = useMemo(() => {
    let lista = [];
    
    Object.entries(ESTRUTURA_DESPESAS).forEach(([groupKey, config]) => {
      // Se tiver filtro ativo e não for esse grupo, pula
      if (filtroGrupo !== 'TODOS' && filtroGrupo !== groupKey) return;

      config.keys.forEach(key => {
        // Tenta pegar o valor exato, ou usa um fallback dos dados antigos se for chave conhecida
        let valor = totais[key] || 0;
        
        // Mapeamento de compatibilidade com seus dados atuais (enquanto não tem o JSON novo completo)
        if (key === 'energia') valor = totais.energia;
        if (key === 'taxas_cartoes') valor = totais.taxas;
        if (key === 'juros_naturgy') valor = totais.juros_naturgy;
        if (key === 'salarios') valor = totais.pessoal; // Assumindo pessoal como salário por enquanto

        if (valor > 0) {
          lista.push({
            name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), // Formata "taxas_cartoes" para "Taxas Cartoes"
            value: valor,
            groupColor: config.color,
            group: config.label
          });
        }
      });
    });

    return lista.sort((a, b) => b.value - a.value); // Ordena do maior para o menor
  }, [totais, filtroGrupo]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER E CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="text-blue-600" size={20}/> Raio-X das Despesas
            </h3>
            <p className="text-sm text-slate-500">Decomposição baseada no DRE Gerencial.</p>
        </div>

        <div className="flex flex-wrap gap-2">
            {/* Toggle Macro/Detalhado */}
            <div className="bg-slate-100 p-1 rounded-lg flex">
                <button 
                    onClick={() => { setViewMode('MACRO'); setFiltroGrupo('TODOS'); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'MACRO' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <PieIcon size={14}/> Grupos (Macro)
                </button>
                <button 
                    onClick={() => setViewMode('DETALHADO')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'DETALHADO' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <List size={14}/> Detalhado (Itens)
                </button>
            </div>

            {/* Toggle Tipo de Gráfico (Aparece apenas se for Detalhado ou Macro) */}
            <div className="bg-slate-100 p-1 rounded-lg flex">
                <button 
                    onClick={() => setChartType('BAR')}
                    className={`p-1.5 rounded-md transition-all ${chartType === 'BAR' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                    title="Gráfico de Barras"
                >
                    <BarChart3 size={16}/>
                </button>
                <button 
                    onClick={() => setChartType('PIE')}
                    className={`p-1.5 rounded-md transition-all ${chartType === 'PIE' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                    title="Gráfico de Pizza"
                >
                    <PieIcon size={16}/>
                </button>
            </div>
        </div>
      </div>

      {/* FILTROS RÁPIDOS (SÓ APARECEM NO MODO DETALHADO) */}
      {viewMode === 'DETALHADO' && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 custom-scrollbar">
            <button 
                onClick={() => setFiltroGrupo('TODOS')}
                className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${filtroGrupo === 'TODOS' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
            >
                Todos
            </button>
            {Object.entries(ESTRUTURA_DESPESAS).map(([key, config]) => (
                <button 
                    key={key}
                    onClick={() => setFiltroGrupo(key)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap transition-colors flex items-center gap-2 
                    ${filtroGrupo === key ? 'bg-opacity-10 border-opacity-0' : 'bg-white border-slate-200 text-slate-500 hover:bg-gray-50'}`}
                    style={filtroGrupo === key ? { backgroundColor: `${config.color}20`, color: config.color } : {}}
                >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}/>
                    {config.label}
                </button>
            ))}
        </div>
      )}

      {/* ÁREA GRÁFICA */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
            {chartType === 'PIE' ? (
                <PieChart>
                    <Pie
                        data={viewMode === 'MACRO' ? dadosMacro : dadosDetalha}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={viewMode === 'MACRO' ? 60 : 40} // Macro mais grosso (Donut), Detalhado mais cheio
                        outerRadius={viewMode === 'MACRO' ? 90 : 100}
                        paddingAngle={2}
                    >
                        {(viewMode === 'MACRO' ? dadosMacro : dadosDetalha).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || entry.groupColor || '#94a3b8'} stroke="none"/>
                        ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatMoney(val)} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
            ) : (
                <BarChart 
                    data={viewMode === 'MACRO' ? dadosMacro : dadosDetalha} 
                    layout="vertical" // Barras horizontais para facilitar leitura de muitos itens
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                    <XAxis type="number" hide />
                    <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100} 
                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} 
                        interval={0}
                    />
                    <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        formatter={(val) => formatMoney(val)} 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {(viewMode === 'MACRO' ? dadosMacro : dadosDetalha).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || entry.groupColor || '#94a3b8'} />
                        ))}
                    </Bar>
                </BarChart>
            )}
        </ResponsiveContainer>
      </div>

      {/* LEGENDA/RODAPÉ INFORMATIVO */}
      {viewMode === 'MACRO' && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {dadosMacro.map(d => (
                <div key={d.name} className="flex flex-col p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{d.name}</span>
                    <span className="text-sm font-bold text-slate-700">{formatMoney(d.value)}</span>
                    <span className="text-[10px] text-slate-400">{formatCompact(d.value)}</span>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};