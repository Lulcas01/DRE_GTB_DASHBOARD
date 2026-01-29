import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { BarChart2, TrendingUp, ArrowLeft, Layers, Activity, CornerDownRight } from 'lucide-react';
import { formatCompact, formatMoney } from '../../utils/formatters';

// --- HIERARQUIA COMPLETA ---
const HIERARQUIA = {
  ROOT: {
    label: 'Visão Geral (Grandes Grupos)',
    groups: [
      { id: 'GRUPO_PESSOAL', label: 'Pessoal & Encargos', color: '#ef4444' }, 
      { id: 'GRUPO_OPERACIONAL', label: 'Despesas Operacionais', color: '#eab308' },
      { id: 'GRUPO_FINANCEIRO', label: 'Despesas Financeiras', color: '#8b5cf6' }, 
      { id: 'GRUPO_IMPOSTOS', label: 'Impostos & Taxas', color: '#64748b' }
    ]
  },
  GRUPO_PESSOAL: {
    label: 'Detalhamento: Pessoal',
    colorBase: '#ef4444',
    keys: [
      { key: 'salarios', label: 'Salários & Férias', color: '#ef4444' },
      { key: 'beneficios', label: 'Benefícios', color: '#f87171' },
      { key: 'rescisao', label: 'Rescisão', color: '#fca5a5' },
      { key: 'pausa_esocial', label: 'Pausa e-social', color: '#fee2e2' },
      { key: 'acordo', label: 'Acordo', color: '#fda4af' },
      { key: 'comissao', label: 'Comissão', color: '#b91c1c' },
      { key: 'outros_pessoal', label: 'Outros (Pessoal)', color: '#991b1b' }
    ]
  },
  GRUPO_OPERACIONAL: {
    label: 'Detalhamento: Operacional',
    colorBase: '#eab308',
    keys: [
      { key: 'energia', label: 'Energia (Light)', color: '#eab308' },
      { key: 'manutencao', label: 'Manutenção', color: '#f59e0b' },
      { key: 'logistica', label: 'Logística', color: '#d97706' },
      { key: 'rateio', label: 'Rateio', color: '#fbbf24' },
      { key: 'comerciais', label: 'Comerciais', color: '#fcd34d' },
      { key: 'consumo', label: 'Consumo', color: '#fffbeb' },
      { key: 'prestacao_servico', label: 'Prest. Serviço', color: '#b45309' },
      { key: 'outras_operacionais', label: 'Outras Desp. Op.', color: '#78350f' }
    ]
  },
  GRUPO_FINANCEIRO: {
    label: 'Detalhamento: Financeiro',
    colorBase: '#8b5cf6',
    keys: [
      { key: 'taxas', label: 'Taxas Cartão', color: '#8b5cf6' },
      { key: 'juros_naturgy', label: 'Juros Naturgy', color: '#6366f1' },
      { key: 'antecipacao', label: 'Antecipação', color: '#4f46e5' },
      { key: 'tarifas_bancarias', label: 'Tarifas Banc.', color: '#a855f7' }
    ]
  },
  GRUPO_IMPOSTOS: {
    label: 'Detalhamento: Impostos',
    colorBase: '#64748b',
    keys: [
      { key: 'taxas_multas', label: 'Taxas e Multas', color: '#64748b' },
    //  { key: 'credito_impostos', label: 'Crédito Impostos', color: '#94a3b8' },
     // { key: 'impostos_pausados', label: 'Impostos Pausados', color: '#cbd5e1' }
    ]
  }
};

// --- TOOLTIP CUSTOMIZADO (AQUI ESTÁ O SEGREDO DA ORDENAÇÃO) ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // 1. Clona e ordena do Maior para o Menor valor
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl min-w-[200px] z-50">
        <p className="text-sm font-bold text-slate-700 mb-2 border-b border-gray-100 pb-1">{label}</p>
        <div className="space-y-1">
          {sortedPayload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center text-xs gap-4">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-2 h-2 rounded-full shadow-sm" 
                  style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} 
                />
                <span className="font-medium text-slate-600">{entry.name}</span>
              </div>
              <span className="font-bold text-slate-800">{formatMoney(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const ExpensesAnalysis = ({ dadosGraficoTempo }) => {
  const [nivelAtual, setNivelAtual] = useState('ROOT'); 
  const [tipoGrafico, setTipoGrafico] = useState('LINE'); 

  // --- 1. PROCESSAMENTO DE DADOS ---
  const dadosParaGrafico = useMemo(() => {
    if (nivelAtual === 'ROOT') {
      return dadosGraficoTempo.map(item => {
        const getVal = (k) => Math.abs(item[k] || 0);
        
        const totalPessoal = HIERARQUIA.GRUPO_PESSOAL.keys.reduce((acc, k) => acc + getVal(k.key), 0);
        const totalOperacional = HIERARQUIA.GRUPO_OPERACIONAL.keys.reduce((acc, k) => acc + getVal(k.key), 0);
        const totalFinanceiro = HIERARQUIA.GRUPO_FINANCEIRO.keys.reduce((acc, k) => acc + getVal(k.key), 0);
        const totalImpostos = HIERARQUIA.GRUPO_IMPOSTOS.keys.reduce((acc, k) => acc + getVal(k.key), 0);

        const totalAbs = Math.abs(item.despesas_totais || 0);
        const somaMapeada = totalPessoal + totalOperacional + totalFinanceiro + totalImpostos;
        const residuo = totalAbs - somaMapeada;

        return {
          name: item.name,
          GRUPO_PESSOAL: totalPessoal,
          GRUPO_OPERACIONAL: totalOperacional,
          GRUPO_FINANCEIRO: totalFinanceiro,
          GRUPO_IMPOSTOS: totalImpostos,
          GRUPO_OUTROS: residuo > 1 ? residuo : 0 
        };
      });
    }

    const configGrupo = HIERARQUIA[nivelAtual];
    return dadosGraficoTempo.map(item => {
      const obj = { name: item.name };
      configGrupo.keys.forEach(k => {
        obj[k.key] = Math.abs(item[k.key] || 0);
      });
      return obj;
    });
  }, [dadosGraficoTempo, nivelAtual]);

  // --- 2. SÉRIES ---
  const seriesAtuais = useMemo(() => {
    if (nivelAtual === 'ROOT') {
      return [
        ...HIERARQUIA.ROOT.groups.map(g => ({ key: g.id, label: g.label, color: g.color })),
        { key: 'GRUPO_OUTROS', label: 'Outros (Não ident.)', color: '#9ca3af' }
      ];
    }
    return HIERARQUIA[nivelAtual].keys;
  }, [nivelAtual]);

  // --- 3. DADOS PARA A PIZZA/TABELA ---
  const dadosTotais = useMemo(() => {
    const totais = seriesAtuais.map(serie => {
      const soma = dadosParaGrafico.reduce((acc, item) => acc + (item[serie.key] || 0), 0);
      return {
        name: serie.label,
        value: soma,
        color: serie.color,
        key: serie.key 
      };
    });
    return totais.filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  }, [dadosParaGrafico, seriesAtuais]);

  const handleDrillDown = (dataKey) => {
    if (nivelAtual === 'ROOT') {
       const grupoId = dataKey; 
       if (HIERARQUIA[grupoId]) setNivelAtual(grupoId);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
             {nivelAtual !== 'ROOT' ? (
                <button 
                  onClick={() => setNivelAtual('ROOT')}
                  className="p-2 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Voltar para Visão Geral"
                >
                  <ArrowLeft size={20}/>
                </button>
             ) : (
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Layers size={20}/></div>
             )}
             
             <div>
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 {nivelAtual === 'ROOT' ? 'Visão Geral por Grupo' : HIERARQUIA[nivelAtual].label}
               </h3>
               <p className="text-xs text-slate-500">
                 {nivelAtual === 'ROOT' 
                    ? 'Clique nas barras para detalhar os itens.' 
                    : 'Visualizando itens individuais.'
                 }
               </p>
             </div>
          </div>
          
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
             <button onClick={() => setTipoGrafico('AREA')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${tipoGrafico === 'AREA' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>
               <TrendingUp size={16}/> Área
             </button>
             <button onClick={() => setTipoGrafico('BAR')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${tipoGrafico === 'BAR' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>
               <BarChart2 size={16}/> Barras
             </button>
             <button onClick={() => setTipoGrafico('LINE')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${tipoGrafico === 'LINE' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>
               <Activity size={16}/> Linha
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[400px]">
          
          {/* GRÁFICO */}
          <div className="lg:col-span-2 h-80 lg:h-full cursor-pointer relative group">
            
            {/* Dica flutuante para avisar que é clicável (apenas no Root) */}
            {nivelAtual === 'ROOT' && (
              <div className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur text-[10px] px-2 py-1 rounded border border-gray-200 text-slate-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
                <CornerDownRight size={10}/> Clique para detalhar
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              {tipoGrafico === 'AREA' ? (
                <AreaChart data={dadosParaGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={(e) => e && e.activePayload && handleDrillDown(e.activePayload[0]?.dataKey)}>
                  <defs>
                    {seriesAtuais.map(serie => (
                      <linearGradient key={serie.key} id={`grad_${serie.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={serie.color} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={serie.color} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10}/>
                  <YAxis axisLine={false} tickLine={false} tickFormatter={formatCompact} tick={{fill: '#94a3b8', fontSize: 10}} />
                  
                  {/* TOOLTIP CUSTOMIZADO AQUI */}
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  
                  {seriesAtuais.map(serie => (
                    <Area 
                      key={serie.key} type="linear" dataKey={serie.key} name={serie.label} 
                      stroke={serie.color} fill={`url(#grad_${serie.key})`} strokeWidth={2} stackId="1" 
                      activeDot={{r: 6, onClick: () => handleDrillDown(serie.key)}} 
                    />
                  ))}
                </AreaChart>
              ) : tipoGrafico === 'BAR' ? (
                <BarChart data={dadosParaGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10}/>
                  <YAxis axisLine={false} tickLine={false} tickFormatter={formatCompact} tick={{fill: '#94a3b8', fontSize: 10}} />
                  
                  {/* TOOLTIP CUSTOMIZADO AQUI */}
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                  
                  {seriesAtuais.map(serie => (
                    <Bar 
                      key={serie.key} dataKey={serie.key} name={serie.label} fill={serie.color} 
                      radius={[4, 4, 0, 0]} onClick={() => handleDrillDown(serie.key)}
                      cursor={nivelAtual === 'ROOT' ? 'pointer' : 'default'}
                      stackId={nivelAtual === 'ROOT' ? "a" : undefined}
                    />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={dadosParaGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10}/>
                  <YAxis axisLine={false} tickLine={false} tickFormatter={formatCompact} tick={{fill: '#94a3b8', fontSize: 10}} />
                  
                  {/* TOOLTIP CUSTOMIZADO AQUI */}
                  <Tooltip content={<CustomTooltip />} />
                  
                  {seriesAtuais.map(serie => (
                    <Line 
                      key={serie.key} type="linear" dataKey={serie.key} name={serie.label} 
                      stroke={serie.color} strokeWidth={3} dot={{r: 4}} 
                      activeDot={{r: 7, onClick: () => handleDrillDown(serie.key)}}
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* KPI SIDEBAR (Resumo rápido) */}
          <div className="h-64 lg:h-full flex flex-col bg-slate-50/50 rounded-xl border border-gray-100 p-4">
             <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Resumo do Período</h4>
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                {dadosTotais.map((item, idx) => {
                  const totalGeral = dadosTotais.reduce((a,b) => a + b.value, 0);
                  const percent = totalGeral ? (item.value / totalGeral) * 100 : 0;
                  
                  return (
                    <button 
                      key={idx}
                      onClick={() => handleDrillDown(item.key)}
                      disabled={nivelAtual !== 'ROOT'}
                      className={`w-full text-left group transition-all ${nivelAtual === 'ROOT' ? 'hover:bg-white hover:shadow-sm p-2 rounded-lg' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]" title={item.name}>{item.name}</span>
                         <span className="text-xs font-bold text-slate-900">{formatCompact(item.value)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                         <div className="h-full rounded-full" style={{width: `${percent}%`, backgroundColor: item.color}} />
                      </div>
                      <div className="text-[10px] text-slate-400 text-right mt-1">{percent.toFixed(1)}%</div>
                    </button>
                  )
                })}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};