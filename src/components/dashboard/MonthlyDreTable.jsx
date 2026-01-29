import React, { useState } from 'react';
import { formatCompact, formatMoney } from '../../utils/formatters';
import { ChevronRight } from 'lucide-react';

const ExpandableRow = ({ 
  label, 
  mainValues, 
  subRows = [], 
  isHeader = false, 
  isBold = false, 
  colorClass = "text-slate-700", 
  bgColor = "bg-white",
  isNegative = false, 
  defaultOpen = false,
  forceColor = null 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasChildren = subRows.length > 0;

  return (
    <>
      {/* LINHA PRINCIPAL */}
      <tr 
        className={`border-b border-gray-100 transition-colors cursor-pointer ${bgColor} ${hasChildren ? 'hover:brightness-95' : ''}`}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        {/* Adicionei 'bg-inherit' para garantir que herde a cor sólida da linha ou use a bgColor diretamente se ela for aplicada aqui */}
        <td className={`p-3 text-sm whitespace-nowrap sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${bgColor} ${isBold ? 'font-bold' : 'font-medium'} ${colorClass}`}>
          <div className="flex items-center gap-2">
            {hasChildren && (
              <div className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                 <ChevronRight size={14} />
              </div>
            )}
            <span className={!hasChildren ? 'ml-6' : ''}>{label}</span>
          </div>
        </td>
        {mainValues.map((val, idx) => {
          let finalColor = colorClass;
          if (forceColor) finalColor = forceColor;
          else if (isNegative) finalColor = "text-red-700"; 
          
          return (
            <td key={idx} className={`p-3 text-right text-sm whitespace-nowrap min-w-[110px] ${finalColor} ${isBold ? 'font-bold' : ''}`}>
              {isNegative && Math.abs(val) > 0 ? '-' : ''}
              {formatCompact(Math.abs(val))}
            </td>
          );
        })}
      </tr>

      {/* LINHAS FILHAS */}
      {isOpen && subRows.map((sub, idx) => (
        <tr key={idx} className="bg-slate-50 border-b border-slate-200 animate-in fade-in slide-in-from-top-1">
          {/* bg-slate-50 JÁ É SÓLIDO, ENTÃO AQUI ESTAVA OK */}
          <td className="p-2 pl-10 text-xs text-slate-600 font-medium sticky left-0 z-10 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
            {sub.label}
          </td>
          {sub.values.map((v, i) => {
            const isRedutor = sub.isRedutor; 
            const valDisplay = Math.abs(v);
            
            return (
              <td key={i} className={`p-2 text-right text-xs ${isRedutor ? 'text-red-600' : 'text-slate-500'}`}>
                 {isRedutor && valDisplay > 0 ? '-' : ''}{formatCompact(valDisplay)}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};

export const MonthlyDreTable = ({ data }) => {
  const v = (val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const monthNames = data.map(d => d.name);

  // --- 1. RECEITA ---
  const recComb = data.map(d => v(d.rec_combustivel));
  const recGnv = data.map(d => v(d.rec_gnv));
  const recProd = data.map(d => v(d.rec_produtos));
  
  const receitaBruta = data.map((d, i) => {
    const dbVal = v(d.receita_bruta || d.receita);
    return Math.abs(dbVal) > 1 ? dbVal : (recComb[i] + recGnv[i] + recProd[i]);
  });

  // --- 2. CMV ---
  const cmvLiq = data.map(d => v(d.cmv_liquido));
  const cmvGnv = data.map(d => v(d.cmv_gnv));
  const cmvProd = data.map(d => v(d.cmv_produto));
  const cmvAjuste = data.map(d => v(d.cmv_ajuste));

  const cmvTotal = data.map((d, i) => {
    const sum = cmvLiq[i] + cmvGnv[i] + cmvProd[i] + cmvAjuste[i]; 
    const dbVal = v(d.cmv_total);
    return Math.abs(dbVal) > 1 ? Math.abs(dbVal) : Math.abs(sum);
  });

  // --- 3. MARGEM BRUTA ---
  const margemBruta = receitaBruta.map((r, i) => r - cmvTotal[i]);
  const margemBrutaPercent = margemBruta.map((m, i) => receitaBruta[i] ? (m / receitaBruta[i]) * 100 : 0);

  // --- 4. DESPESAS OPERACIONAIS ---
  const dEnergia = data.map(d => v(d.energia));
  const dManut = data.map(d => v(d.manutencao));
  const dCom = data.map(d => v(d.comerciais));
  const dLog = data.map(d => v(d.logistica));
  const dRateio = data.map(d => v(d.rateio));
  const dOutras = data.map(d => v(d.outras_operacionais));
  const dConsumo = data.map(d => v(d.consumo));
  const dServico = data.map(d => v(d.prestacao_servico));

  const despOperacionais = data.map((d, i) => {
    const sum = dEnergia[i] + dManut[i] + dCom[i] + dLog[i] + dRateio[i] + dOutras[i] + dConsumo[i] + dServico[i];
    return Math.abs(sum);
  });

  // --- 5. PESSOAL ---
  const dSalario = data.map(d => v(d.salarios));
  const dBenef = data.map(d => v(d.beneficios));
  const dResc = data.map(d => v(d.rescisao));
  const dAcordo = data.map(d => v(d.acordo));
  const dComissao = data.map(d => v(d.comissao));
  const dEncargos = data.map(d => v(d.encargos_folha));
  const dOutrosPessoal = data.map(d => v(d.outros_pessoal));
  const dCreditoEsocial = data.map(d => v(d.credito_esocial));

  const despPessoal = data.map((d, i) => {
    const sum = dSalario[i] + dBenef[i] + dResc[i] + dAcordo[i] + dComissao[i] + dEncargos[i] + dOutrosPessoal[i];
    return Math.abs(sum) - Math.abs(dCreditoEsocial[i]);
  });

  // --- 6. MARGEM OPERACIONAL ---
  const margemOperacional = margemBruta.map((mb, i) => mb - despOperacionais[i] - despPessoal[i]);
  const margemOperacionalPercent = margemOperacional.map((m, i) => receitaBruta[i] ? (m / receitaBruta[i]) * 100 : 0);

  // --- 7. FINANCEIRO ---
  const finReceitas = data.map(d => v(d.rec_financeiras));
  const finTarifas = data.map(d => v(d.tarifas_bancarias));
  const finTaxas = data.map(d => v(d.taxas));
  const finAntecipacao = data.map(d => v(d.antecipacao));
  const finJuros = data.map(d => v(d.juros_naturgy));

  const resultadoFinanceiro = data.map((_, i) => {
    const despesas = Math.abs(finTarifas[i]) + Math.abs(finTaxas[i]) + Math.abs(finAntecipacao[i]) + Math.abs(finJuros[i]);
    return finReceitas[i] - despesas;
  });

  // --- 8. NÃO OPERACIONAL ---
  const naoOpRec = data.map(d => v(d.rec_nao_operacionais));
  const naoOpDesp = data.map(d => v(d.desp_nao_operacionais));
  const resultadoNaoOp = data.map((_, i) => naoOpRec[i] - Math.abs(naoOpDesp[i]));

  // --- 9. IMPOSTOS ---
  const impTaxas = data.map(d => v(d.taxas_multas));
  const impCredito = data.map(d => v(d.credito_impostos));
  const impPausados = data.map(d => v(d.impostos_pausados));

  const indexSetembro = monthNames.findIndex(name => 
    name.toLowerCase().includes('set')
  );

  const impostosTotal = data.map((_, i) => {
    if (indexSetembro !== -1 && i > indexSetembro) {
      const somaBase = Math.abs(impTaxas[i]) + Math.abs(impPausados[i]);
      return somaBase; 
    }
    const somaBase = Math.abs(impTaxas[i]) + Math.abs(impPausados[i]);
    const credito = Math.abs(impCredito[i]);
    return somaBase - credito;
  });

  // --- 10. LUCRO LÍQUIDO FINAL ---
  const lucroLiquido = data.map((d, i) => {
    return margemOperacional[i] + resultadoFinanceiro[i] + resultadoNaoOp[i] - impostosTotal[i];
  });
  
  const lucroLiquidoPercent = lucroLiquido.map((l, i) => receitaBruta[i] ? (l / receitaBruta[i]) * 100 : 0);

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm mt-6 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
         <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
           📊 Detalhamento Mensal do DRE
         </h4>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr className="bg-white text-slate-600 border-b border-gray-200">
              <th className="p-3 text-left text-xs font-bold uppercase sticky left-0 z-20 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[220px]">
                Conceito
              </th>
              {monthNames.map((m, idx) => (
                <th key={idx} className="p-3 text-right text-xs font-black uppercase min-w-[120px] text-slate-800 bg-slate-50/50">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            
            {/* 1. RECEITA - Mudei de bg-sky-200/50 para bg-sky-100 (Sólido) */}
            <ExpandableRow 
              label="RECEITA BRUTA" 
              mainValues={receitaBruta} 
              isBold 
              colorClass="text-slate-800"
              bgColor="bg-sky-100" 
              subRows={[
                { label: 'Combustível', values: recComb },
                { label: 'GNV', values: recGnv },
                { label: 'Produtos', values: recProd },
              ]}
            />

            {/* 2. CMV - Mudei de bg-orange-100/50 para bg-orange-50 (Sólido) */}
            <ExpandableRow 
              label="(-) CMV" 
              mainValues={cmvTotal} 
              isNegative 
              colorClass="text-slate-800"
              bgColor="bg-orange-50" 
              subRows={[
                { label: 'Líquido', values: cmvLiq },
                { label: 'GNV', values: cmvGnv },
                { label: 'Produto', values: cmvProd },
                { label: 'Ajuste CMV', values: cmvAjuste, isRedutor: true },
              ]}
            />

            {/* 3. MARGEM BRUTA - Mudei para cores sólidas */}
            <tr className="bg-sky-200 border-y border-sky-300">
               {/* Removido /90, agora é sólido */}
               <td className="p-3 text-sm font-black text-slate-900 sticky left-0 z-10 bg-sky-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                 MARGEM BRUTA
               </td>
               {margemBruta.map((v, i) => (
                 <td key={i} className="p-3 text-right text-sm font-black text-slate-900">
                   <div className="flex flex-col items-end">
                     <span>{formatCompact(v)}</span>
                     <span className="text-[10px] font-bold opacity-80">{margemBrutaPercent[i].toFixed(0)}%</span>
                   </div>
                 </td>
               ))}
            </tr>

            {/* 4. DESPESAS OPERACIONAIS - Mudei de bg-orange-200/50 para bg-orange-100 (Sólido) */}
            <ExpandableRow 
              label="DESPESAS OPERACIONAIS" 
              mainValues={despOperacionais} 
              isNegative 
              isBold
              colorClass="text-slate-900"
              bgColor="bg-orange-100"
              subRows={[
                { label: 'Light', values: dEnergia },
                { label: 'Manutenção', values: dManut },
                { label: 'Comerciais', values: dCom },
                { label: 'Logística', values: dLog },
                { label: 'Rateio Desp. Oper', values: dRateio },
                { label: 'Outras desp operacionais', values: dOutras },
                { label: 'Desp Consumo', values: dConsumo },
                { label: 'Prestação serviço', values: dServico },
              ]}
            />

            {/* 5. PESSOAL - Mudei de bg-orange-200/50 para bg-orange-100 (Sólido) */}
            <ExpandableRow 
              label="PESSOAL" 
              mainValues={despPessoal} 
              isNegative 
              isBold
              colorClass="text-slate-900"
              bgColor="bg-orange-100"
              subRows={[
                { label: 'Salários & Férias', values: dSalario },
                { label: 'Benefícios', values: dBenef },
                { label: 'Rescisão', values: dResc },
                { label: 'Acordo', values: dAcordo },
                { label: 'Comissao', values: dComissao },
                { label: 'Encargos', values: dEncargos },
                { label: 'Crédito de e-social', values: dCreditoEsocial, isRedutor: true },
                { label: 'Outros', values: dOutrosPessoal },
              ]}
            />

             {/* 6. MARGEM OPERACIONAL - Cores sólidas */}
             <tr className="bg-sky-100 border-y border-sky-300">
               {/* Removido /90, agora é sólido */}
               <td className="p-3 text-sm font-black text-slate-900 sticky left-0 z-10 bg-sky-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                 MARGEM OPERACIONAL
               </td>
               {margemOperacional.map((v, i) => (
                 <td key={i} className="p-3 text-right text-sm font-black text-slate-900">
                    <div className="flex flex-col items-end">
                      <span>{formatCompact(v)}</span>
                      <span className="text-[10px] font-bold opacity-80">{margemOperacionalPercent[i].toFixed(1)}%</span>
                    </div>
                 </td>
               ))}
            </tr>

            {/* 7. FINANCEIRO - Mudei de bg-orange-100/40 para bg-orange-50 (Sólido) */}
            <ExpandableRow 
              label="REC & DESP FINANCEIRAS" 
              mainValues={resultadoFinanceiro} 
              isBold
              colorClass={resultadoFinanceiro.some(x => x < 0) ? "text-red-700" : "text-slate-800"}
              bgColor="bg-orange-50"
              subRows={[
                { label: 'Receitas financeiras', values: finReceitas },
                { label: 'Tarifas Bancárias', values: finTarifas, isRedutor: true },
                { label: 'Taxas dos cartoes', values: finTaxas, isRedutor: true },
                { label: 'Desp Fin. De Antecipaçao', values: finAntecipacao, isRedutor: true },
                { label: 'Juros NATURGY', values: finJuros, isRedutor: true },
              ]}
            />

            {/* 8. NÃO OPERACIONAL - Mudei para sólido */}
            <ExpandableRow 
              label="REC & DESP NÃO OPERACIO" 
              mainValues={resultadoNaoOp} 
              isBold
              colorClass="text-slate-800"
              bgColor="bg-orange-50"
              subRows={[
                { label: 'Receitas não operacionais', values: naoOpRec },
                { label: 'Desp não operacionais', values: naoOpDesp, isRedutor: true },
              ]}
            />

            {/* 9. IMPOSTOS - Mudei para sólido */}
            <ExpandableRow 
              label="IMPOSTOS" 
              mainValues={impostosTotal} 
              isNegative
              isBold
              colorClass="text-slate-900"
              bgColor="bg-orange-50"
              
            />

            {/* 10. LUCRO LÍQUIDO - Já era sólido (bg-cyan-200), mantido */}
            <tr className="bg-cyan-200 border-t-2 border-cyan-300">
               <td className="p-3 text-sm font-black text-slate-900 sticky left-0 z-10 bg-cyan-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                 MARGEM LÍQUIDA
               </td>
               {lucroLiquido.map((v, i) => (
                 <td key={i} className="p-3 text-right text-sm font-black text-slate-900">
                   <div className="flex flex-col items-end">
                     <span>{formatMoney(v)}</span>
                     <span className="text-[10px] font-bold opacity-80">{lucroLiquidoPercent[i].toFixed(1)}%</span>
                   </div>
                 </td>
               ))}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
};