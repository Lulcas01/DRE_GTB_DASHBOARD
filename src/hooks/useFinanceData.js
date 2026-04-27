import { useState, useEffect, useMemo } from 'react';
import { MESES } from '../utils/constants';

// Função para descobrir os últimos 6 meses fechados a partir de hoje
const obterUltimos6Meses = () => {
    const dataAtual = new Date();
    let mesAtual = dataAtual.getMonth(); // 0 (Jan) a 11 (Dez)
    let anoAtual = dataAtual.getFullYear();
    
    const ultimos6 = [];
    for (let i = 1; i <= 6; i++) { // Começa do 1 para pular o mês atual (incompleto)
        let m = mesAtual - i;
        let a = anoAtual;
        if (m < 0) { // Se voltou para antes de Janeiro, vai pro ano passado
            m += 12;
            a -= 1;
        }
        ultimos6.push({ name: MESES[m], ano: String(a) });
    }
    return ultimos6;
};

export function useFinanceData(filtroPosto, filtroMes, filtroAno) {
  const [dadosBrutos, setDadosBrutos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. BUSCA DADOS DA API
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    fetch(`${API_URL}/api/dados`, { credentials: 'include' })
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

  // 2. BASE DE DADOS (Aqui a gente fura a regra do ano se for "Ultimos6")
 const dadosBase = useMemo(() => {
    if (!dadosBrutos.length) return [];
    
    if (filtroMes === 'Ultimos6') {
        const alvos = obterUltimos6Meses();

        return dadosBrutos.filter(d => {
            // Limpa espaços invisíveis que possam ter vindo do Excel
            const nomeLimpo = String(d.name || '').trim().toUpperCase();
            const anoDoc = String(d.ano || '2025');
            
            return alvos.some(a => a.name === nomeLimpo && a.ano === anoDoc);
        });
    }
    
    // Comportamento Normal: Filtra só pelo ano do select
    return dadosBrutos.filter(d => String(d.ano || '2025') === String(filtroAno));
  }, [dadosBrutos, filtroAno, filtroMes]);

  // 3. Calcula a Lista de Postos
  const listaPostos = useMemo(() => {
    if (!dadosBase.length) return [];
    const nomesUnicos = [...new Set(dadosBase.map(d => d.posto_nome))];
    return nomesUnicos.map(nome => ({ id: nome, nome: nome }));
  }, [dadosBase]);

  // 4. Filtra por Posto e Mês Exato
  const dadosFiltrados = useMemo(() => {
    let filtrado = dadosBase;
    
    // Se for um mês específico (Ex: "JAN"), filtra. Se for Anual ou Ultimos6, deixa passar tudo.
    if (filtroMes !== 'Anual' && filtroMes !== 'Ultimos6') {
        filtrado = filtrado.filter(d => d.name === filtroMes);
    }

    if (filtroPosto === 'TODOS') return filtrado.filter(d => d.posto_id !== 'GTB');
    return filtrado.filter(d => d.posto_id === filtroPosto);
  }, [dadosBase, filtroPosto, filtroMes]);

  // 5. Gráficos (Soma as filiais e ordena cronologicamente!)
  const dadosGraficoTempo = useMemo(() => {
    let dadosFinais = [];

    if (filtroPosto !== 'TODOS') {
        dadosFinais = [...dadosFiltrados];
    } else {
        const agrupado = {};
        dadosFiltrados.forEach(d => {
            const key = `${d.name}-${d.ano || '2025'}`; // Evita juntar JAN 2025 com JAN 2026
            if (!agrupado[key]) {
                agrupado[key] = { name: d.name, ano: d.ano || '2025', receita_bruta: 0, lucro_liquido: 0, despesas_totais: 0 };
            }
            Object.keys(d).forEach(k => {
                if (typeof d[k] === 'number') agrupado[key][k] = (agrupado[key][k] || 0) + d[k];
            });
        });
        
        dadosFinais = Object.values(agrupado).filter(d => d.receita_bruta !== 0 || d.despesas_totais !== 0);
    }

    // A MÁGICA DA ORDENAÇÃO: Garante que 2025 vem antes de 2026, resolvendo o "Ultimos6"
    return dadosFinais.sort((a, b) => {
        const anoA = parseInt(a.ano || 2025);
        const anoB = parseInt(b.ano || 2025);
        if (anoA !== anoB) return anoA - anoB; // Ordena por ano primeiro
        return MESES.indexOf(a.name) - MESES.indexOf(b.name); // Depois por mês
    });

  }, [dadosFiltrados, filtroPosto]);

  // 6. Totais dos Cards Superiores
  const totais = useMemo(() => {
    const dadosParaSoma = (filtroMes === 'Anual' || filtroMes === 'Ultimos6') ? dadosFiltrados : dadosFiltrados.filter(d => d.name === filtroMes);
    
    return dadosParaSoma.reduce((acc, curr) => {
        const novoAcc = { ...acc };
        Object.keys(curr).forEach(key => {
            if (typeof curr[key] === 'number') novoAcc[key] = (novoAcc[key] || 0) + curr[key];
        });
        
        const cmvItem = (curr.cmv_liquido || 0) + (curr.cmv_gnv || 0) + (curr.cmv_produto || 0) + (curr.cmv_ajuste || 0);
        const cmvFinal = cmvItem !== 0 ? Math.abs(cmvItem) : (curr.cmv_total || 0);

        novoAcc.receita = (novoAcc.receita || 0) + (curr.receita_bruta || 0);
        novoAcc.cmv = (novoAcc.cmv || 0) + cmvFinal;
        novoAcc.despesas = (novoAcc.despesas || 0) + (curr.despesas_totais || 0);
        novoAcc.lucro = (novoAcc.lucro || 0) + (curr.lucro_liquido || 0);
        
        return novoAcc;
    }, { receita: 0, cmv: 0, despesas: 0, lucro: 0 });
  }, [dadosFiltrados, filtroMes]);

  // 7. Rankings de Postos
  const rankingPostos = useMemo(() => {
    if (!listaPostos.length) return {};

    const baseRank = listaPostos.filter(p => p.id !== 'GTB').map(p => {
        // Pega do dadosBase, que já está com o filtro certo (Seja Anual, Ultimos6 ou Mes Especifico)
        const dadosDoPosto = dadosBase.filter(d => d.posto_nome === p.nome && (filtroMes === 'Anual' || filtroMes === 'Ultimos6' || d.name === filtroMes));
        
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

        return {
          nome: p.nome,
          receita: r,
          lucro: l,
          cmv: c,
          pessoal: Math.abs(pes),
          energia: luz,
          despesa: desp,
          margem_pct: margemBrutaPct
        };
      });

    return {
      porLucroAbsoluto: [...baseRank].sort((a, b) => b.lucro - a.lucro),
      porMargemPct: [...baseRank].filter(p => p.receita > 1000 && p.margem_pct < 99).sort((a, b) => b.margem_pct - a.margem_pct),
      porPessoal: [...baseRank].sort((a, b) => b.pessoal - a.pessoal),
      porEnergia: [...baseRank].sort((a, b) => b.energia - a.energia),
      dadosCompletos: baseRank
    };
  }, [filtroMes, dadosBase, listaPostos]);

  return { dadosGraficoTempo, totais, rankingPostos, listaPostos, loading, dadosBrutos: dadosBase };
}