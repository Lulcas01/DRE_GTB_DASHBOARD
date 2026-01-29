import React, { useState, useMemo } from 'react';
import {
  DollarSign, TrendingUp, Activity, Wallet, Users, Zap, Fuel, MapPin, TrendingDown,
  BarChart3, LayoutDashboard, Scale, Filter, Landmark, FileText, ArrowRightLeft, X
} from 'lucide-react';

// Hooks e Utils
import { useFinanceData } from './hooks/useFinanceData';
import { MESES } from './utils/constants';
import { formatCompact, formatMoney, formatPercent } from './utils/formatters';
// Componentes
import { CardKPI } from './components/ui/KpiCard';
import { MiniRankingCard } from './components/ui/MiniRankingCard';
import { MainChart } from './components/dashboard/MainChart';
import { BreakEvenTable } from './components/dashboard/BreakEvenTable';
import { ExpensesAnalysis } from './components/dashboard/ExpensesAnalysis';
import { VariationAnalysis } from './components/dashboard/VariationAnalysis';
import { ComparativeTable } from './components/dashboard/ComparativeTable';
// --- IMPORTAÇÃO DO COMPONENTE CORRIGIDO ---
import { MonthlyDreTable } from './components/dashboard/MonthlyDreTable';

export default function FinanceDashboard() {
  const [filtroMes, setFiltroMes] = useState('Anual'); 
  const [mesComparacao, setMesComparacao] = useState('NENHUM'); 
  const [filtroPosto, setFiltroPosto] = useState('GTB'); 
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [filtroStatus, setFiltroStatus] = useState('TODOS'); 


  const { dadosGraficoTempo, totais, rankingPostos,listaPostos, loading,dadosBrutos } = useFinanceData(filtroPosto, filtroMes);

  const dadosParaGraficos = useMemo(() => {
    if (mesComparacao === 'NENHUM' || filtroMes === 'Anual') {
      return dadosGraficoTempo;
    }
    return dadosGraficoTempo.filter(d => d.name === filtroMes || d.name === mesComparacao);
  }, [dadosGraficoTempo, filtroMes, mesComparacao]);

  const kpisDespesas = useMemo(() => {
    let acc = { pessoal: 0, operacional: 0, financeiro: 0, impostos: 0 };
    const fonteDados = dadosParaGraficos; 

    fonteDados.forEach(item => {
        const val = (key) => Math.abs(item[key] || 0);
        const salarios = val('salarios') > 0 ? val('salarios') : val('pessoal');
        acc.pessoal += salarios + val('beneficios') + val('rescisao') + val('acordo') + val('comissao') + val('pausa_esocial') + val('outros_pessoal');
        acc.operacional += val('energia') + val('manutencao') + val('comerciais') + val('logistica') + val('rateio') + val('outras_operacionais') + val('consumo') + val('prestacao_servico');
        acc.financeiro += val('taxas') + val('juros_naturgy') + val('antecipacao') + val('tarifas_bancarias');
        acc.impostos += val('taxas_multas') + val('credito_impostos') + val('impostos_pausados');
    });
    return acc;
  }, [dadosParaGraficos]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800 pb-20 md:pb-6">
      
      {/* --- HEADER E FILTROS --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-slate-900">
            <Activity className="text-blue-600" /> Painel Gerencial
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Análise consolidada e indicadores de performance.</p>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap gap-3 w-full xl:w-auto">
           <div className="flex bg-gray-200 p-1 rounded-xl w-full md:w-auto order-2 md:order-1">
              <button onClick={() => setActiveTab('DASHBOARD')} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'DASHBOARD' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-gray-100'}`}>
                <LayoutDashboard size={14}/> <span className="hidden md:inline">Visão</span> Geral
              </button>
              <button onClick={() => setActiveTab('INDICES')} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'INDICES' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-gray-100'}`}>
                <BarChart3 size={14}/> Indicadores
              </button>
           </div>

           <div className="flex flex-wrap gap-2 w-full md:w-auto order-1 md:order-2">
             <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex items-center flex-1 md:flex-none min-w-[140px]">
                <MapPin size={16} className="ml-2 text-slate-400"/>
                <select value={filtroPosto} onChange={(e) => setFiltroPosto(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer p-2 w-full">
                  <option value="GTB">GTB</option>
                  <hr />
                  {listaPostos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
             </div>

             <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex-1 md:flex-none min-w-[120px]">
                <select value={filtroMes} 
                  onChange={(e) => {
                    setFiltroMes(e.target.value);
                    if (e.target.value === 'Anual') setMesComparacao('NENHUM'); 
                  }} 
                  className="bg-transparent text-sm font-semibold text-slate-600 outline-none cursor-pointer px-2 w-full hover:text-blue-600"
                >
                  <option value="Anual">2025 (Anual)</option>
                  <hr/>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>

             {filtroMes !== 'Anual' && (
               <div className="flex items-center bg-blue-50 p-1 rounded-xl border border-blue-100 shadow-sm flex-1 md:flex-none animate-in fade-in slide-in-from-right-4">
                  <div className="px-2 text-blue-400"><ArrowRightLeft size={14}/></div>
                  <select 
                    value={mesComparacao} 
                    onChange={(e) => setMesComparacao(e.target.value)} 
                    className="bg-transparent text-sm font-bold text-blue-700 outline-none cursor-pointer w-full min-w-[100px]"
                  >
                    <option value="NENHUM">Comparar...</option>
                    <hr/>
                    {MESES.filter(m => m !== filtroMes).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {mesComparacao !== 'NENHUM' && (
                    <button onClick={() => setMesComparacao('NENHUM')} className="p-1 hover:bg-blue-100 rounded-full text-blue-400">
                      <X size={14}/>
                    </button>
                  )}
               </div>
             )}
           </div>
        </div>
      </div>

      {activeTab === 'DASHBOARD' && (
        <div className="animate-in fade-in duration-300">
           {mesComparacao !== 'NENHUM' ? (
              <VariationAnalysis 
                 mesBase={filtroMes} 
                 mesComparacao={mesComparacao} 
                 dados={dadosGraficoTempo} 
              />
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <CardKPI title="Faturamento" value={formatCompact(totais.receita)} icon={DollarSign} colorHex="#2563eb" subtext="Receita Bruta" />
                  <CardKPI title="Margem Bruta" value={formatCompact(totais.receita - totais.cmv)} icon={Zap} colorHex="#f59e0b" subtext={formatPercent(totais.receita - totais.cmv, totais.receita)} />
                  <CardKPI title="Margem Líquida Acumulada" value={formatMoney(totais.lucro)} icon={totais.lucro >= 0 ? Wallet : TrendingDown} colorHex={totais.lucro >= 0 ? "#16a34a" : "#ef4444"} subtext={formatPercent(totais.lucro, totais.receita)} isNegative={totais.lucro < 0} />
              </div>
           )}

           {/* --- SEÇÃO PRINCIPAL (TELA TODA) --- */}
           <div className="mb-8 w-full bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-base md:text-lg text-slate-800 flex items-center gap-2">
                       <TrendingUp size={18} className="text-blue-600" /> 
                       {mesComparacao !== 'NENHUM' ? `Comparativo: ${filtroMes} vs ${mesComparacao}` : 'Evolução Mensal'}
                     </h3>
                 </div>
                 
                 {/* Gráfico */}
                 <MainChart data={dadosParaGraficos} />

                 {/* Tabela Mensal Corrigida */}
                 <MonthlyDreTable data={dadosParaGraficos} />
           </div>
           
           {/* --- ANÁLISE DE DESPESAS --- */}
           <div className="mt-8 border-t border-gray-200 pt-6">
               {/* ... (Conteúdo de despesas mantido igual) ... */}
               <div className="mb-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Filter size={20} className="text-red-600"/> Raio-X de Custos & Despesas
                    </h2>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                   <CardKPI title="Pessoal & RH" value={formatCompact(kpisDespesas.pessoal)} icon={Users} colorHex="#ef4444" subtext={`${formatPercent(kpisDespesas.pessoal, kpisDespesas.pessoal + kpisDespesas.operacional + kpisDespesas.financeiro + kpisDespesas.impostos)} do Total`} />
                   <CardKPI title="Desp. Operacionais" value={formatCompact(kpisDespesas.operacional)} icon={Zap} colorHex="#eab308" subtext={`${formatPercent(kpisDespesas.operacional, kpisDespesas.pessoal + kpisDespesas.operacional + kpisDespesas.financeiro + kpisDespesas.impostos)} do Total`} />
                   <CardKPI title="Financeiro" value={formatCompact(kpisDespesas.financeiro)} icon={Landmark} colorHex="#8b5cf6" subtext={`${formatPercent(kpisDespesas.financeiro, kpisDespesas.pessoal + kpisDespesas.operacional + kpisDespesas.financeiro + kpisDespesas.impostos)} do Total`} />
                   <CardKPI title="Impostos/Taxas" value={formatCompact(kpisDespesas.impostos)} icon={FileText} colorHex="#64748b" subtext={`${formatPercent(kpisDespesas.impostos, kpisDespesas.pessoal + kpisDespesas.operacional + kpisDespesas.financeiro + kpisDespesas.impostos)} do Total`} />
               </div>

               <ExpensesAnalysis dadosGraficoTempo={dadosParaGraficos} />
           </div>
        </div>
      )}

      {/* === ABA INDICADORES (Restaurada) === */}
      {activeTab === 'INDICES' && (
        <div className="animate-in fade-in duration-300">
            {filtroPosto === 'GTB' || filtroPosto === 'TODOS' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* MAIOR LUCRO */}
                    <MiniRankingCard 
                        title="Maior Margem Líquida (R$)" 
                        data={rankingPostos?.porLucroAbsoluto || []} 
                        valueKey="lucro" 
                        icon={Wallet} 
                        color="text-green-600" 
                    />
                    
                    {/* MELHOR MARGEM (COM FILTRO DE RECEITA > 0) */}
                    <MiniRankingCard 
                        title="Melhor Margem (%)" 
                        data={rankingPostos?.porMargemPct.filter(p => p.receita > 0) || []} 
                        valueKey="margem_pct" 
                        icon={TrendingUp} 
                        color="text-blue-600" 
                        isPercent 
                    />
                    
                    {/* MAIOR DESPESA PESSOAL (ALTERADO DE MENOR PARA MAIOR) */}
                    {/* Removemos o .reverse() para mostrar os que mais gastam */}
                    <MiniRankingCard 
                        title="Maior Despesa Pessoal" 
                        data={rankingPostos?.porPessoal || []} 
                        valueKey="pessoal" 
                        icon={Users} 
                        color="text-red-600" 
                    />
                    
                    {/* MENOR CUSTO ENERGIA (Mantido Menor .reverse) */}
                    <MiniRankingCard 
                        title="Menor Custo Energia" 
                        data={[...(rankingPostos?.porEnergia || [])].reverse()} 
                        valueKey="energia" 
                        icon={Zap} 
                        color="text-yellow-600" 
                    />
                </div>

                <div className="animate-in fade-in duration-300">
  
            <ComparativeTable 
              dados={rankingPostos?.dadosCompletos || []}
              // AQUI ESTÁ A MÁGICA: Passamos todos os dados brutos para o modal filtrar
              todosDados={dadosBrutos} 
              onNavigateToProfile={(nomePosto) => {
                  setFiltroPosto(nomePosto);
                  setFiltroMes('Anual');
                  setActiveTab('DASHBOARD');
              }}
            />
         </div>
        
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-gray-300">
                 <div className="p-4 bg-blue-50 rounded-full mb-3 text-blue-500">
                    <BarChart3 size={32}/>
                 </div>
                 <h3 className="font-bold text-slate-600">Visão de Ranking Indisponível</h3>
                 <p className="text-sm text-slate-400 mt-1 max-w-md text-center">
                    Selecione <strong>GTB</strong> ou <strong>Anual</strong> para ver os rankings comparativos.
                 </p>
                 <button onClick={() => setFiltroPosto('GTB')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                    Mudar para Visão Global
                 </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}