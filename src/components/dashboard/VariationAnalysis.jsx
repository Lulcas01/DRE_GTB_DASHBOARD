import React, { useState, useMemo } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Plus, Minus, ArrowLeft, Search } from 'lucide-react';
import { formatCompact, formatMoney } from '../../utils/formatters';

// --- CONFIGURAÇÃO DO DRILL DOWN ---
// Mapeia o "Nome da Linha" para as "Chaves do JSON" que compõem aquele grupo
const DETALHAMENTO_CONFIG = {
  'Pessoal': [
    { key: 'salarios', label: 'Salários' },
    { key: 'beneficios', label: 'Benefícios' },
    { key: 'rescisao', label: 'Rescisão' },
    { key: 'acordo', label: 'Acordo' },
    { key: 'comissao', label: 'Comissão' },
    { key: 'pausa_esocial', label: 'Pausa e-social' },
    { key: 'outros_pessoal', label: 'Outros Pessoal' }
  ],
  'Financeiro': [
    { key: 'taxas', label: 'Taxas Cartão' },
    { key: 'juros_naturgy', label: 'Juros Naturgy' },
    { key: 'antecipacao', label: 'Antecipação' },
    { key: 'tarifas_bancarias', label: 'Tarifas Bancárias' }
  ],
  'Outras Desp.': [ // Agrupa o resto das operacionais que não são Energia/Manutenção (que já aparecem separadas)
    { key: 'logistica', label: 'Logística' },
    { key: 'comerciais', label: 'Comerciais' },
    { key: 'rateio', label: 'Rateio' },
    { key: 'outras_operacionais', label: 'Outras Oper.' },
    { key: 'consumo', label: 'Consumo' },
    { key: 'prestacao_servico', label: 'Prest. Serviço' }
  ],
  // Impostos se quiser detalhar
  'Impostos': [
    { key: 'taxas_multas', label: 'Taxas e Multas' },
    { key: 'credito_impostos', label: 'Crédito Impostos' }
  ]
};

export const VariationAnalysis = ({ mesBase, mesComparacao, dados }) => {
  const [drilldownGroup, setDrilldownGroup] = useState(null); // Estado para controlar o clique

  // 1. CÁLCULOS PRINCIPAIS
  const analise = useMemo(() => {
    const dBase = dados.find(d => d.name === mesBase) || {};
    const dComp = dados.find(d => d.name === mesComparacao) || {};
    const val = (obj, key) => Math.abs(obj[key] || 0);

    // --- FUNÇÃO AUXILIAR DE CÁLCULO DE GRUPO ---
    const calcDeltaGrupo = (keysArray) => {
        const totalBase = keysArray.reduce((acc, k) => acc + val(dBase, k.key), 0);
        const totalComp = keysArray.reduce((acc, k) => acc + val(dComp, k.key), 0);
        // Despesa: Se aumentou (Comp > Base), o impacto é negativo no lucro (invertemos o sinal)
        return -(totalComp - totalBase);
    };

    // Variação Receita
    const deltaReceita = val(dComp, 'receita_bruta') - val(dBase, 'receita_bruta');
    const deltaCMV = -(val(dComp, 'cmv_total') - val(dBase, 'cmv_total'));
    
    // Variação das Despesas (Agrupadas ou Individuais)
    const deltaPessoal = calcDeltaGrupo(DETALHAMENTO_CONFIG['Pessoal']);
    const deltaFinanceiro = calcDeltaGrupo(DETALHAMENTO_CONFIG['Financeiro']);
    const deltaOutras = calcDeltaGrupo(DETALHAMENTO_CONFIG['Outras Desp.']);
    
    // Itens individuais de destaque
    const calcIndividual = (key) => -(val(dComp, key) - val(dBase, key));
    const deltaEnergia = calcIndividual('energia');
    const deltaManutencao = calcIndividual('manutencao');

    const impactos = [
      { label: 'Receita', valor: deltaReceita, tipo: 'RECEITA', isDrillable: false },
      { label: 'CMV', valor: deltaCMV, tipo: 'CUSTO', isDrillable: false },
      { label: 'Pessoal', valor: deltaPessoal, tipo: 'DESPESA', isDrillable: true }, // Clicável
      { label: 'Energia', valor: deltaEnergia, tipo: 'DESPESA', isDrillable: false },
      { label: 'Manutenção', valor: deltaManutencao, tipo: 'DESPESA', isDrillable: false },
      { label: 'Financeiro', valor: deltaFinanceiro, tipo: 'DESPESA', isDrillable: true }, // Clicável
      { label: 'Outras Desp.', valor: deltaOutras, tipo: 'DESPESA', isDrillable: true } // Clicável
    ];

    return {
      lucroBase: dBase.lucro_liquido || 0,
      lucroComp: dComp.lucro_liquido || 0,
      positivos: impactos.filter(i => i.valor > 0).sort((a,b) => b.valor - a.valor),
      negativos: impactos.filter(i => i.valor < 0).sort((a,b) => a.valor - b.valor),
      dBase, // Passamos os objetos originais para o drilldown usar
      dComp
    };
  }, [mesBase, mesComparacao, dados]);

  // 2. CÁLCULO DO DETALHE (DRILL DOWN)
  const detalheDrilldown = useMemo(() => {
    if (!drilldownGroup) return null;

    const config = DETALHAMENTO_CONFIG[drilldownGroup];
    if (!config) return null;

    const val = (obj, key) => Math.abs(obj[key] || 0);
    const { dBase, dComp } = analise;

    // Calcula a variação item a item dentro do grupo
    const lista = config.map(item => {
        const vBase = val(dBase, item.key);
        const vComp = val(dComp, item.key);
        // Despesa: Aumento = Negativo
        const delta = -(vComp - vBase); 
        return {
            label: item.label,
            valor: delta,
            valorBase: vBase,
            valorComp: vComp
        };
    });

    return {
        positivos: lista.filter(i => i.valor >= 0).sort((a,b) => b.valor - a.valor),
        negativos: lista.filter(i => i.valor < 0).sort((a,b) => a.valor - b.valor)
    };

  }, [drilldownGroup, analise]);

  const diffLucro = analise.lucroComp - analise.lucroBase;
  const isLucroMelhor = diffLucro >= 0;

  return (
    <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
      <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-lg border border-slate-700">
        
        {/* HEADER (LUCRO) */}
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-600 pb-6 mb-6 gap-6">
          <div className="text-center md:text-left">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Mês Base ({mesBase})</span>
            <div className="text-2xl md:text-3xl font-bold text-slate-200">{formatMoney(analise.lucroBase)}</div>
          </div>

          <div className="flex flex-col items-center">
             <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 mb-2 ${isLucroMelhor ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {isLucroMelhor ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                {isLucroMelhor ? '+' : ''}{formatMoney(diffLucro)}
             </div>
             <ArrowRight className="text-slate-500 hidden md:block" size={24}/>
          </div>

          <div className="text-center md:text-right">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Mês Atual ({mesComparacao})</span>
            <div className={`text-2xl md:text-3xl font-bold ${isLucroMelhor ? 'text-green-400' : 'text-red-400'}`}>
              {formatMoney(analise.lucroComp)}
            </div>
          </div>
        </div>

        {/* --- ÁREA DE CONTEÚDO (NORMAL OU DETALHE) --- */}
        
        {drilldownGroup ? (
            // === VISÃO DETALHADA ===
            <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <button 
                        onClick={() => setDrilldownGroup(null)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h4 className="text-lg font-bold text-white">Detalhando: {drilldownGroup}</h4>
                        <p className="text-xs text-slate-400">Composição da variação neste grupo.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Detalhe Positivo */}
                    <div>
                        <h5 className="text-xs font-bold text-green-400 uppercase mb-3 border-b border-slate-700 pb-2">Economias / Reduções</h5>
                        <div className="space-y-2">
                            {detalheDrilldown.positivos.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm bg-slate-700/30 p-2 rounded border border-slate-700/50">
                                    <span>{item.label}</span>
                                    <span className="font-bold text-green-400">+{formatCompact(item.valor)}</span>
                                </div>
                            ))}
                            {detalheDrilldown.positivos.length === 0 && <span className="text-xs text-slate-500">- Nada relevante -</span>}
                        </div>
                    </div>
                    {/* Detalhe Negativo */}
                    <div>
                        <h5 className="text-xs font-bold text-red-400 uppercase mb-3 border-b border-slate-700 pb-2">Aumentos / Gastos</h5>
                        <div className="space-y-2">
                            {detalheDrilldown.negativos.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm bg-slate-700/30 p-2 rounded border border-slate-700/50">
                                    <span>{item.label}</span>
                                    <span className="font-bold text-red-400">{formatCompact(item.valor)}</span>
                                </div>
                            ))}
                            {detalheDrilldown.negativos.length === 0 && <span className="text-xs text-slate-500">- Nada relevante -</span>}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            // === VISÃO GERAL (BRIDGE) ===
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-left-8 duration-300">
            
                {/* O QUE AJUDOU (VERDE) */}
                <div>
                    <h4 className="text-xs font-bold text-green-400 uppercase mb-3 flex items-center gap-2">
                    <Plus size={14} className="bg-green-500/20 rounded p-0.5"/> O que ajudou o resultado?
                    </h4>
                    <div className="space-y-2">
                    {analise.positivos.length > 0 ? analise.positivos.slice(0, 5).map((item, idx) => (
                        <button 
                            key={idx} 
                            disabled={!item.isDrillable}
                            onClick={() => setDrilldownGroup(item.label)}
                            className={`w-full flex justify-between items-center text-sm bg-slate-700/50 p-2 rounded-lg border border-slate-700 text-left group
                                ${item.isDrillable ? 'hover:bg-slate-700 hover:border-slate-500 cursor-pointer' : 'cursor-default'}`}
                        >
                            <span className="text-slate-300 flex items-center gap-2">
                                {item.label}
                                {item.isDrillable && <Search size={12} className="opacity-0 group-hover:opacity-50 transition-opacity"/>}
                            </span>
                            <span className="font-bold text-green-400">+{formatCompact(item.valor)}</span>
                        </button>
                    )) : (
                        <p className="text-xs text-slate-500 italic">Nenhum fator positivo relevante.</p>
                    )}
                    </div>
                </div>

                {/* O QUE PREJUDICOU (VERMELHO) */}
                <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase mb-3 flex items-center gap-2">
                    <Minus size={14} className="bg-red-500/20 rounded p-0.5"/> O que prejudicou?
                    </h4>
                    <div className="space-y-2">
                    {analise.negativos.length > 0 ? analise.negativos.slice(0, 5).map((item, idx) => (
                        <button 
                            key={idx} 
                            disabled={!item.isDrillable}
                            onClick={() => setDrilldownGroup(item.label)}
                            className={`w-full flex justify-between items-center text-sm bg-slate-700/50 p-2 rounded-lg border border-slate-700 text-left group
                                ${item.isDrillable ? 'hover:bg-slate-700 hover:border-slate-500 cursor-pointer' : 'cursor-default'}`}
                        >
                            <span className="text-slate-300 flex items-center gap-2">
                                {item.label}
                                {item.isDrillable && <Search size={12} className="opacity-0 group-hover:opacity-50 transition-opacity"/>}
                            </span>
                            <span className="font-bold text-red-400">{formatCompact(item.valor)}</span>
                        </button>
                    )) : (
                        <p className="text-xs text-slate-500 italic">Nenhum ofensor relevante.</p>
                    )}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};