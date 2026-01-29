import { useState, useEffect, useMemo } from 'react';
import { MESES } from '../utils/constants';

export function useFinanceData(filtroPosto, filtroMes) {
  const [dadosBrutos, setDadosBrutos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. BUSCA DADOS DA API (CORRIGIDO PARA PRODUÇÃO)
  useEffect(() => {
    // Pega a URL do Render (se estiver na nuvem) ou localhost (se estiver no seu PC)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    fetch(`${API_URL}/api/dados`, { credentials: 'include' }) // Adicionei credentials para passar o cookie se precisar
      .then(res => res.json())
      .then(data => {
        setDadosBrutos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar API:", err);
        setLoading(false);
      });
  }, []);

  // 2. Calcula a Lista de Postos (Dinamicamente baseada nos dados)
  const listaPostos = useMemo(() => {
    if (!dadosBrutos.length) return [];
    const nomesUnicos = [...new Set(dadosBrutos.map(d => d.posto_nome))];
    return nomesUnicos.map(nome => ({ id: nome, nome: nome }));
  }, [dadosBrutos]);

  // 3. Filtra dados (Igual antes, mas usando 'dadosBrutos')
  const dadosFiltrados = useMemo(() => {
    if (!dadosBrutos.length) return [];
    if (filtroPosto === 'TODOS') return dadosBrutos.filter(d => d.posto_id !== 'GTB');
    return dadosBrutos.filter(d => d.posto_id === filtroPosto);
  }, [filtroPosto, dadosBrutos]);

  // 4. Gráficos
  const dadosGraficoTempo = useMemo(() => {
    if (filtroPosto !== 'TODOS') return dadosFiltrados;
    const agrupado = {};
    MESES.forEach(m => {
        agrupado[m] = { name: m, receita_bruta: 0, lucro_liquido: 0, despesas_totais: 0 };
    });
    dadosFiltrados.forEach(d => {
      if (agrupado[d.name]) {
        Object.keys(d).forEach(key => {
            if (typeof d[key] === 'number') agrupado[d.name][key] = (agrupado[d.name][key] || 0) + d[key];
        });
      }
    });
    return Object.values(agrupado).filter(d => d.receita_bruta !== 0 || d.despesas_totais !== 0);
  }, [dadosFiltrados, filtroPosto]);

  // 5. Totais (Com a correção do CMV e Pessoal)
  const totais = useMemo(() => {
    const dadosParaSoma = filtroMes === 'Anual' ? dadosFiltrados : dadosFiltrados.filter(d => d.name === filtroMes);
    
    return dadosParaSoma.reduce((acc, curr) => {
        const novoAcc = { ...acc };
        Object.keys(curr).forEach(key => {
            if (typeof curr[key] === 'number') novoAcc[key] = (novoAcc[key] || 0) + curr[key];
        });
        
        // CMV Real (Soma das partes)
        const cmvItem = (curr.cmv_liquido || 0) + (curr.cmv_gnv || 0) + (curr.cmv_produto || 0) + (curr.cmv_ajuste || 0);
        const cmvFinal = cmvItem !== 0 ? Math.abs(cmvItem) : (curr.cmv_total || 0);

        novoAcc.receita = (novoAcc.receita || 0) + (curr.receita_bruta || 0);
        novoAcc.cmv = (novoAcc.cmv || 0) + cmvFinal;
        novoAcc.despesas = (novoAcc.despesas || 0) + (curr.despesas_totais || 0);
        novoAcc.lucro = (novoAcc.lucro || 0) + (curr.lucro_liquido || 0);
        
        // Detalhes Receita
        novoAcc.rec_combustivel = (novoAcc.rec_combustivel || 0) + (curr.rec_combustivel || 0);
        novoAcc.rec_gnv = (novoAcc.rec_gnv || 0) + (curr.rec_gnv || 0);
        novoAcc.rec_produtos = (novoAcc.rec_produtos || 0) + (curr.rec_produtos || 0);

        return novoAcc;
    }, { receita: 0, cmv: 0, despesas: 0, lucro: 0 });
  }, [dadosFiltrados, filtroMes]);

  // 6. Rankings
  const rankingPostos = useMemo(() => {
    if (!listaPostos.length) return {};

    const dadosBase = listaPostos.filter(p => p.id !== 'GTB').map(p => {
        // Usa dadosBrutos aqui para filtrar corretamente por posto
        const dadosDoPosto = dadosBrutos.filter(d => d.posto_nome === p.nome && (filtroMes === 'Anual' || d.name === filtroMes));
        
        const sum = (key) => dadosDoPosto.reduce((s, i) => s + (i[key] || 0), 0);

        const r = sum('receita_bruta');
        const l = sum('lucro_liquido');
        const luz = sum('energia');
        const desp = sum('despesas_totais');

        const c = dadosDoPosto.reduce((s, i) => {
            const val = (i.cmv_liquido || 0) + (i.cmv_gnv || 0) + (i.cmv_produto || 0) + (i.cmv_ajuste || 0);
            return s + (val !== 0 ? Math.abs(val) : (i.cmv_total || 0));
        }, 0);
        
        const pes = sum('salarios') + sum('beneficios') + sum('rescisao') + sum('acordo') + sum('comissao') + sum('pausa_esocial') + sum('outros_pessoal') + sum('encargos_folha') + sum('credito_esocial');

        const margemBrutaPct = r ? ((r - c) / r) * 100 : 0;
        const pontoEquilibrio = margemBrutaPct > 0 ? desp / (margemBrutaPct / 100) : 0;

        return {
          nome: p.nome,
          receita: r,
          lucro: l,
          cmv: c,
          pessoal: Math.abs(pes),
          energia: luz,
          despesa: desp,
          margem_pct: margemBrutaPct,
          ponto_equilibrio: pontoEquilibrio,
          eficiencia_pessoal: pes ? r / pes : 0,
        };
      });

    return {
      porLucroAbsoluto: [...dadosBase].sort((a, b) => b.lucro - a.lucro),
      porCMV: [...dadosBase].sort((a, b) => b.cmv - a.cmv),
      porPessoal: [...dadosBase].sort((a, b) => b.pessoal - a.pessoal),
      porEnergia: [...dadosBase].sort((a, b) => b.energia - a.energia),
      porMargemPct: [...dadosBase].filter(p => p.receita > 1000 && p.margem_pct < 99).sort((a, b) => b.margem_pct - a.margem_pct),
      porDespesaTotal: [...dadosBase].sort((a, b) => b.despesa - a.despesa),
      dadosCompletos: dadosBase
    };
  }, [filtroMes, dadosBrutos, listaPostos]);

  // RETORNO ATUALIZADO (Inclui a lista de postos e estado de loading)
  return { 
    dadosGraficoTempo, 
    totais, 
    rankingPostos, 
    listaPostos, // Agora retornamos a lista calculada
    loading,
    dadosBrutos
  };
}