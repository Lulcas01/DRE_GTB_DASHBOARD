import React, { useState } from 'react';
import { ChevronDown, Calculator } from 'lucide-react';
import { formatMoney } from '../../utils/formatters';

// Componente de Linha Compacto
const DreLine = ({ label, value, basePercent, isSubtotal = false, isNegative = false, color = "text-slate-700", bgColor = "", children }) => {
  const [isOpen, setIsOpen] = useState(false); 
  const hasChildren = React.Children.count(children) > 0;
  const percent = basePercent ? (value / basePercent) * 100 : 0;

  return (
    <div className="border-b border-gray-50 last:border-0">
      {/* Reduzi py-3 para py-1.5 para ficar mais compacto */}
      <div 
        className={`py-1.5 flex justify-between items-center cursor-pointer transition-colors ${bgColor ? `${bgColor} px-2 rounded my-0.5` : 'hover:bg-slate-50'}`}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5">
          {/* Ícone menor e condicional para manter alinhamento se não tiver filhos */}
          <div className={`text-slate-400 w-4 flex justify-center ${hasChildren ? 'hover:text-blue-600' : 'opacity-0'}`}>
             <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
          </div>
          <span className={`text-xs md:text-sm ${isSubtotal ? 'font-bold' : 'font-medium'} ${color}`}>
            {label}
          </span>
        </div>
        
        <div className="text-right flex items-center gap-3">
          <span className={`text-xs md:text-sm font-bold ${color}`}>
            {isNegative && value > 0 ? '-' : ''} {formatMoney(value)}
          </span>
          {basePercent && (
             <span className={`text-[10px] w-10 text-right ${isNegative ? 'text-red-400' : 'text-slate-400'} font-medium`}>
               {Math.abs(percent).toFixed(1)}%
             </span>
          )}
        </div>
      </div>
      
      {/* Área Expandida */}
      {isOpen && hasChildren && (
        <div className="bg-slate-50/50 pl-2 py-1 mb-1 border-l-2 border-slate-200 ml-2 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

// Bloco de Resultado (Margem Bruta, Operacional, etc) - Versão Slim
const ResultBlock = ({ label, value, percent, colorBg, colorText, colorBorder }) => (
  <div className={`${colorBg} px-3 py-2 rounded border ${colorBorder} my-1 flex justify-between items-center`}>
      <span className={`text-xs font-black uppercase tracking-wide ${colorText}`}>{label}</span>
      <div className="text-right leading-tight">
          <div className={`text-sm font-black ${colorText}`}>{formatMoney(value)}</div>
          <div className={`text-[10px] font-bold opacity-80 ${colorText}`}>{percent}%</div>
      </div>
  </div>
);

export const DreView = ({ totais }) => {
  const v = (key) => Math.abs(totais[key] || 0);
  const vReal = (key) => totais[key] || 0; 

  // --- CÁLCULOS (Mantidos iguais) ---
  let receitaBruta = totais.receita || 0;
  if (receitaBruta === 0) receitaBruta = v('rec_combustivel') + v('rec_gnv') + v('rec_produtos');
  
  const cmvTotalCalculado = vReal('cmv_liquido') + vReal('cmv_gnv') + vReal('cmv_produto') + vReal('cmv_ajuste');
  const cmvFinal = cmvTotalCalculado !== 0 ? Math.abs(cmvTotalCalculado) : v('cmv_total');
  const margemBruta = receitaBruta - cmvFinal;

  const despOperacionais = v('energia') + v('manutencao') + v('comerciais') + v('logistica') + v('rateio') + v('outras_operacionais') + v('consumo') + v('prestacao_servico');
  const despPessoal = v('salarios') + v('beneficios') + v('rescisao') + v('acordo') + v('comissao') + v('pausa_esocial') + v('outros_pessoal') + v('encargos_folha') - v('credito_esocial');
  const margemOperacional = margemBruta - despOperacionais - despPessoal;

  const receitasFin = v('rec_financeiras');
  const despFin = v('taxas') + v('tarifas_bancarias') + v('antecipacao') + v('juros_naturgy');
  const resultadoFin = receitasFin - despFin; 

  const resultadoNaoOp = v('rec_nao_operacionais') - v('desp_nao_operacionais');
  const impostos = v('taxas_multas')  + v('impostos_pausados');
  const lucroLiquido = margemOperacional + resultadoFin + resultadoNaoOp - impostos;

  const p = (val) => receitaBruta ? ((val/receitaBruta)*100).toFixed(1) : 0;

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
        <Calculator size={16} className="text-blue-600"/>
        DRE Gerencial Consolidado
      </h3>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-0.5">
        
        {/* RECEITA */}
        <DreLine label="RECEITA BRUTA" value={receitaBruta} color="text-blue-700" bgColor="bg-blue-50/40" isSubtotal>
           <DreLine label="Combustível" value={v('rec_combustivel')} basePercent={receitaBruta} />
           <DreLine label="GNV" value={v('rec_gnv')} basePercent={receitaBruta} />
           <DreLine label="Produtos" value={v('rec_produtos')} basePercent={receitaBruta} />
        </DreLine>

        {/* CMV */}
        <DreLine label="(-) CMV TOTAL" value={cmvFinal} basePercent={receitaBruta} isNegative color="text-red-700" bgColor="bg-red-50/40">
           <DreLine label="Combustíveis (Líquido)" value={v('cmv_liquido')} basePercent={receitaBruta} />
           <DreLine label="GNV" value={v('cmv_gnv')} basePercent={receitaBruta} />
           <DreLine label="Produtos / Loja" value={v('cmv_produto')} basePercent={receitaBruta} />
           <DreLine label="Ajustes CMV" value={Math.abs(vReal('cmv_ajuste'))} basePercent={receitaBruta} color={vReal('cmv_ajuste') < 0 ? "text-green-600" : "text-red-600"} />
        </DreLine>

        {/* MARGEM BRUTA */}
        <ResultBlock label="Margem Bruta" value={margemBruta} percent={p(margemBruta)} colorBg="bg-blue-50" colorText="text-blue-800" colorBorder="border-blue-100" />

        {/* DESPESAS */}
        <DreLine label="(-) DESPESAS OPER." value={despOperacionais} basePercent={receitaBruta} isNegative color="text-red-700" bgColor="bg-red-50/40">
           <DreLine label="Energia" value={v('energia')} basePercent={receitaBruta} />
           <DreLine label="Manutenção" value={v('manutencao')} basePercent={receitaBruta} />
           <DreLine label="Comerciais" value={v('comerciais')} basePercent={receitaBruta} />
           <DreLine label="Logística" value={v('logistica')} basePercent={receitaBruta} />
           <DreLine label="Rateio" value={v('rateio')} basePercent={receitaBruta} />
           <DreLine label="Outras" value={v('outras_operacionais')} basePercent={receitaBruta} />
           <DreLine label="Consumo" value={v('consumo')} basePercent={receitaBruta} />
           <DreLine label="Serviços" value={v('prestacao_servico')} basePercent={receitaBruta} />
        </DreLine>

        {/* PESSOAL */}
        <DreLine label="(-) PESSOAL" value={despPessoal} basePercent={receitaBruta} isNegative color="text-red-700" bgColor="bg-red-50/40">
           <DreLine label="Salários" value={v('salarios') || v('pessoal')} basePercent={receitaBruta} />
           <DreLine label="Benefícios" value={v('beneficios')} basePercent={receitaBruta} />
           <DreLine label="Encargos" value={v('encargos_folha')} basePercent={receitaBruta} />
           <DreLine label="Rescisão" value={v('rescisao')} basePercent={receitaBruta} />
           <DreLine label="Acordos" value={v('acordo')} basePercent={receitaBruta} />
           <DreLine label="Comissões" value={v('comissao')} basePercent={receitaBruta} />
           <DreLine label="Crédito E-social" value={v('credito_esocial')} basePercent={receitaBruta} color="text-green-600" />
           <DreLine label="Outros" value={v('outros_pessoal')} basePercent={receitaBruta} />
        </DreLine>

        {/* MARGEM OPERACIONAL */}
        <ResultBlock label="Margem Operacional" value={margemOperacional} percent={p(margemOperacional)} colorBg="bg-blue-100" colorText="text-blue-900" colorBorder="border-blue-200" />

        {/* FINANCEIRO */}
        <DreLine label="(+/-) FINANCEIRO" value={Math.abs(resultadoFin)} basePercent={receitaBruta} isNegative={resultadoFin < 0} color={resultadoFin < 0 ? "text-red-700" : "text-blue-700"} bgColor="bg-gray-50">
           <DreLine label="Receitas Fin." value={receitasFin} basePercent={receitaBruta} color="text-blue-600" />
           <DreLine label="Taxas Cartão" value={v('taxas')} basePercent={receitaBruta} isNegative />
           <DreLine label="Tarifas Banc." value={v('tarifas_bancarias')} basePercent={receitaBruta} isNegative />
           <DreLine label="Antecipação" value={v('antecipacao')} basePercent={receitaBruta} isNegative />
           <DreLine label="Juros" value={v('juros_naturgy')} basePercent={receitaBruta} isNegative />
        </DreLine>

        {/* OUTROS BLOCOS SIMPLIFICADOS */}
        <DreLine label="(+/-) NÃO OPER." value={Math.abs(resultadoNaoOp)} basePercent={receitaBruta} isNegative={resultadoNaoOp < 0} color="text-slate-600" />
        <DreLine label="(-) IMPOSTOS" value={impostos} basePercent={receitaBruta} isNegative color="text-red-700" />

        {/* MARGEM LÍQUIDA (VERDE) */}
        <div className={`mt-2 p-3 rounded-lg border flex justify-between items-center ${lucroLiquido >= 0 ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'}`}>
           <div className="flex flex-col">
             <span className={`text-xs font-black uppercase ${lucroLiquido >= 0 ? 'text-green-800' : 'text-red-800'}`}>Margem Líquida</span>
             <span className={`text-[10px] ${lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>Resultado Consolidado</span>
           </div>
           <div className="text-right">
             <div className={`text-lg font-black ${lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(lucroLiquido)}</div>
             <div className={`text-xs font-bold ${lucroLiquido >= 0 ? 'text-green-800' : 'text-red-800'}`}>{p(lucroLiquido)}%</div>
           </div>
        </div>

      </div>
    </div>
  );
};