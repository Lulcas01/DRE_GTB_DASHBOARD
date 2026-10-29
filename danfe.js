// =====================================================================
//  LEITURA DO DANFE (PDF da NF-e)
//
//  Tira do texto do PDF: chave de acesso, número/série, CNPJ do emitente,
//  data de emissão, valor total da nota e os itens (descrição, unidade,
//  quantidade, valor unitário e valor total de cada um).
//
//  Funciona com os dois layouts de DANFE que aparecem nas notas:
//   A) "NCM CST CFOP UN QUANT V.UNIT V.TOTAL" na mesma linha (distribuidoras)
//   B) "CFOP 5405 4,0000" e na linha de baixo "CX 45,8400 183,36" (layout novo)
//  Número, série e CNPJ do emitente vêm da chave de acesso (exatos).
// =====================================================================

const numBR = (s) => {
  if (s === undefined || s === null) return null;
  const limpo = String(s).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
};
const dataISO = (dmy) => (dmy ? dmy.split("/").reverse().join("-") : null);

// Valor monetário/quantidade no formato brasileiro: 1.234,56 / 5.000,0000
const NUM = "\\d{1,3}(?:\\.\\d{3})*,\\d{2,10}";

const LAYOUT_A = new RegExp(
  `(\\d{8})\\s+(\\d{3,4})\\s+(\\d{4})\\s+([A-Za-z]{1,6}\\d{0,2})\\s+(${NUM})\\s+(${NUM})\\s+(${NUM})`,
  "g"
);
const LAYOUT_B = new RegExp(
  `CFOP\\s+(\\d{4})\\s+(${NUM})\\s+([A-Za-z]{1,6}\\d{0,2})\\s+(${NUM})\\s+(${NUM})`,
  "g"
);

function acharChave(texto, nomeArquivo) {
  const bloco = texto.match(/CHAVE DE ACESSO[\s\S]{0,40}?((?:\d[\s.]?){44})/i);
  let chave = bloco ? bloco[1].replace(/\D/g, "") : "";
  if (chave.length !== 44) {
    const doNome = String(nomeArquivo || "").replace(/\D/g, "");
    chave = doNome.length >= 44 ? doNome.slice(-44) : "";
  }
  if (chave.length !== 44) return null;
  return {
    chave,
    cnpjEmitente: chave.slice(6, 20),
    modelo: chave.slice(20, 22),
    serie: String(Number(chave.slice(22, 25))),
    numero: String(Number(chave.slice(25, 34))),
  };
}

function acharData(texto) {
  const m =
    texto.match(/DATA (?:DA|DE) EMISS[AÃ]O\s*[:\n ]\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    texto.match(/EMISS[AÃ]O:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    texto.match(/(\d{2}\/\d{2}\/\d{4})/);
  return m ? dataISO(m[1]) : null;
}

function acharValorTotal(texto) {
  const m =
    texto.match(new RegExp(`V(?:ALOR|\\.)\\s*TOTAL DA NOTA\\s*(?:R\\$)?\\s*(${NUM.replace(",\\d{2,10}", ",\\d{2}")})`, "i")) ||
    texto.match(new RegExp(`VALOR TOTAL:\\s*R\\$\\s*(${NUM})`, "i"));
  return m ? numBR(m[1]) : null;
}

function acharEmitente(texto) {
  const m = texto.match(/IDENTIFICA[CÇ][AÃ]O DO EMITENTE\s*\n\s*([^\n]+)/i) || texto.match(/RECEBEMOS DE\s+(.+?)\s+OS PRODUTOS/i);
  return m ? m[1].trim() : "";
}

// Descrição: a primeira linha "de verdade" do bloco do item (tira o código do produto)
function descricaoDoBloco(bloco) {
  const linhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const l of linhas) {
    if (/^(C[ÓO]DIGO|UNIT|TOTAL|DESC|ICMS|IPI|AL[ÍI]Q|VALOR|DADOS DOS PRODUTOS)/i.test(l)) continue;
    const semCodigo = l.replace(/^[A-Z0-9.\-]{1,20}\s+(?=[A-Z])/i, "");
    return semCodigo.replace(/^ONU\s*\d+,?\s*/i, "").slice(0, 120);
  }
  return "";
}

function acharItens(texto) {
  const ini = texto.search(/DADOS DOS PRODUTOS/i);
  if (ini < 0) return [];
  const fimRel = texto.slice(ini).search(/DADOS ADICIONAIS|C[ÁA]LCULO DO ISSQN/i);
  const parte = fimRel > 0 ? texto.slice(ini, ini + fimRel) : texto.slice(ini);
  const itens = [];

  const coletar = (re, montar) => {
    re.lastIndex = 0;
    let anterior = 0;
    let m;
    while ((m = re.exec(parte))) {
      const bloco = parte.slice(anterior, m.index);
      itens.push({ ...montar(m), descricao: descricaoDoBloco(bloco), _pos: m.index });
      anterior = m.index + m[0].length;
    }
  };
  coletar(LAYOUT_A, (m) => ({ ncm: m[1], cfop: m[3], unidade: m[4], quantidade: numBR(m[5]), valorUnitario: numBR(m[6]), valorTotal: numBR(m[7]) }));
  if (!itens.length) {
    coletar(LAYOUT_B, (m) => ({ cfop: m[1], unidade: m[3], quantidade: numBR(m[2]), valorUnitario: numBR(m[4]), valorTotal: numBR(m[5]) }));
  }
  return itens.sort((a, b) => a._pos - b._pos).map(({ _pos, ...resto }) => resto);
}

// Tipo de combustível do item. O NCM decide se é combustível
// (2710 = derivados de petróleo, 2711 = gás natural, 2207 = etanol); a descrição
// decide qual. Assim "PINO DO GNV" (peça) ou "ÓLEO LUBRIFICANTE" não entram.
export function tipoCombustivel(descricao, ncm) {
  const n = String(ncm || "");
  if (n && !/^(2710|2711|2207)/.test(n)) return null;
  if (/^2711/.test(n)) return "GNV";
  const t = String(descricao || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (/LUBRIFICANTE|\bGRAXA\b|\bARLA\b/.test(t)) return null;
  if (/GASOLINA[\s\S]{0,40}?\bADIT/.test(t) || t.includes("ADIT PETROBRAS")) return "ADITIVADA";
  if (/\bETANOL\b|\bALCOOL\b/.test(t)) return "ETANOL";
  if (/S-?10\b/.test(t)) return "S10";
  if (/S-?500\b/.test(t) || /\bDIESEL\b/.test(t)) return "DIESEL";
  if (/\bGASOLINA\b/.test(t)) return "COMUM";
  if (n && /GNV|GAS NATURAL|FORNECIMENTO DE GAS/.test(t)) return "GNV";
  return null;
}

// Lê o texto de um DANFE. Devolve null se não parece uma NF-e.
export function lerDanfe(texto, nomeArquivo = "") {
  if (!texto) return null;
  const chave = acharChave(texto, nomeArquivo);
  const itens = acharItens(texto).map((it) => ({ ...it, combustivel: tipoCombustivel(it.descricao, it.ncm) }));
  const valorTotal = acharValorTotal(texto);
  if (!chave && !itens.length && valorTotal === null) return null;
  return {
    ...(chave || {}),
    emitente: acharEmitente(texto),
    dataEmissao: acharData(texto),
    valorTotal,
    itens,
    combustiveis: [...new Set(itens.map((i) => i.combustivel).filter(Boolean))],
    quantidadeTotal: itens.reduce((a, i) => a + (i.quantidade || 0), 0),
  };
}
