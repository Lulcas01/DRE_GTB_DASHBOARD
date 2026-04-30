import express from 'express';
import cors from 'cors';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { PDFParse } from 'pdf-parse';

dotenv.config();

const app = express();

// ======================================================
// CONFIGURAÇÕES E SEGREDOS
// ======================================================
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const MONGO_URI = process.env.MONGO_URI; 
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

if (!JWT_SECRET || !MONGO_URI) {
    console.error("❌ ERRO FATAL: Faltam variáveis no ficheiro .env (JWT_SECRET ou MONGO_URI)");
    process.exit(1);
}

// ======================================================
// CONEXÃO COM O MONGOOSE
// ======================================================
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas via Mongoose"))
  .catch((err) => console.error("❌ Erro ao conectar no MongoDB via Mongoose:", err));

const transferenciaSchema = new mongoose.Schema({
  data: String,
  ip: String,
  horaEnvio: String,
  transferencias: [
    {
      origem: String,
      motorista: String,
      placa: String, 
      qde: String,
      combustivel: String,
      emissao: String,
      destino: String,
      caida: String,
      pedidos: String,
    },
  ],
});

const Transferencia = mongoose.model("Transferencia", transferenciaSchema);

// ======================================================
// DICIONÁRIOS UNIFICADOS
// ======================================================

const MAPA_POSTOS_CNPJ = {
  "03545887000191": "AEROTOWN",
  "02236460000149": "AIMEE",
  "29035826000178": "AMÉRICAS",
  "09070975000160": "AMIGO DA RODOVIA",
  "33863036000158": "AMOREIRAS",
  "13211882000186": "AUTO CLUBE",
  "03325858000114": "BAM BAM",
  "32126491000108": "BARRA MANSA",
  "33459918000152": "BRAZ DE PINA",
  "11052769000170": "CAFUNDÁ",
  "28232643000180": "CAMBOATÁ",
  "07124110000104": "CAPITÃO ENG. NOVO",
  "03219097000116": "CAPITÃO NA POSSE",
  "27905921000150": "CAXIAS PARQUE",
  "42234286000110": "COELHINHO",
  "36444370000165": "COIMBRA",
  "39469010000106": "DANIELE",
  "04046635000180": "DIVINA",
  "04802584000170": "DOM HÉLDER",
  "20674619000199": "ENZO",
  "10649347000113": "ESPLANADA",
  "42543875000180": "FARID 1",
  "45349017000197": "FARID 2",
  "46386902000109": "FARID 4",
  "28497450000150": "GABINAL",
  "33288671000159": "GARAGEM MÉIER",
  "02464455000193": "GARDÊNIA",
  "05311835000186": "GASTRON",
  "17455879000169": "GUERREIROS",
  "05647310000116": "IMBARIÊ",
  "33084864000198": "IMPERADOR",
  "03447202000174": "IMPERIAL 2000",
  "26954424000189": "ITAGUAÍ",
  "03596816000118": "JACUÍ",
  "42199000000102": "JOÍA",
  "53968633000154": "JR DE IGUAÇU",
  "03475408000108": "LIGHT",
  "04919736000119": "LM",
  "33133414000148": "LOBO",
  "05834897000172": "PLOPES",
  "42256511000119": "LUANDA",
  "33596735000189": "MARCIAL",
  "18092041000110": "MATO ALTO",
  "02814354000103": "MAYARA",
  "03892955000199": "MEGA VERÃO",
  "51483542000101": "MERCADAO",
  "02339014000160": "MERITI",
  "02199272000198": "MW",
  "00476334000136": "NEO EXATA",
  "29185682000136": "NOVO RECREIO",
  "04919058000194": "PARADA DA PRAÇA",
  "01797812000172": "PEDÁGIO",
  "02802238000166": "PRÉ",
  "30408374000101": "PROJAC",
  "06112829000162": "QUEIMADOS RIO",
  "05402099000171": "RAJA",
  "05410269000160": "REALENGO",
  "09256366000109": "RIO GRANDE",
  "00859093000104": "RIVAL",
  "34351502000189": "RONDONIA",
  "42252874000186": "ROTOR",
  "33381724000181": "SÃO PEDRO",
  "10371066000141": "SERVAUTO",
  "42401018000145": "SHEKINAH",
  "33204280000109": "SUBURBANO",
  "24247481000100": "TRABALHO ABOLIÇÃO",
  "24434546000119": "TRABALHO BICAO",
  "10303896000131": "TRÊS M",
  "42236778000144": "VALDEVEZ",
  "51510209000136": "VILA VALQUEIRE",
  "05863434000139": "VILAR",
  "02454272000197": "VIP",
  "03995690000154": "WM DO LOCAL"
};

const MAPA_FORNECEDORES_CNPJ = {
  "34274233009584": "VIBRA ENERGIA S.A",
  "10775497000254": "FLAGLER COMBUSTIVEIS S/A",
  "01387400001993": "SP INDUSTRIA E DISTRIBUIDORA DE PETROLEO LTDA",
  "33938119000169": "CIA DISTRIBUIDORA DE GAS DO RIO DE JANEIRO",
  "05411176000311": "PARANAPANEMA DISTRIBUIDORA DE COMBUSTIVEIS LTDA",
  "21559337000103": "SANTOS FRANCA COMERCIO DE COMBUSTIVEIS LTDA",
  "05759383000108": "TOBRAS DISTRIBUIDORA DE COMBUSTIVEIS LTDA",
  "32704431000125": "URCA COMERCIALIZADORA DE GAS NATURAL S/A",
  "05068412000187": "RODOPETRO DISTRIBUIDORA DE PETROLEO LTDA",
  "00209895000926": "RDP ENERGIA LTDA",
  "42321262000106": "SAINT-TROPEZ FUNDO DE INVESTIMENTO EM DIREITOS CREDITORIOS",
  "41967089000147": "CARINTHIA DISTRIBUIDORA S.A.",
  "11989750000154": "76 OIL DISTRIBUIDORA DE COMBUSTIVEIS S/A",
  "00756149000871": "RUFF CJ DISTRIBUIDORA DE PETROLEO LTDA",
  "06031802000145": "MINUANO PETROLEO LTDA",
  "71770689000424": "NEXTA DISTRIBUIDORA LTDA",
  "33453598017794": "RAIZEN S.A.",
  "02461767000143": "TOTALENERGIES DISTRIBUIDORA BRASIL",
  "33823764000136": "ECONOMY DISTRIBUIDORA DE PETROLEO LTDA",
  "60755519000101": "USIQUIMICA DO BRASIL LTDA"
};

const RESPONSAVEIS_CONTAS = {
  "AMOREIRAS": "SANDRA",
  "COIMBRA": "SANDRA",
  "RIVAL": "JUCILENE",
  "TRABALHO BICAO": "SANDRA",
  "BAM BAM": "CARINA",
  "FARID 4": "CARINA",
  "FARID 1": "SANDRA",
  "JR DE IGUAÇU": "CLAUDIA",
  "AMÉRICAS": "CLAUDIA",
  "PEDÁGIO": "CARINA",
  "NOVO RECREIO": "JUCILENE",
  "QUEIMADOS RIO": "CARINA",
  "REALENGO": "JUCILENE",
  "VALDEVEZ": "BEATRIZ",
  "VILAR": "CARINA",
  "IMBARIÊ": "JUCILENE",
  "CAXIAS PARQUE": "SANDRA",
  "GASTRON": "BEATRIZ",
  "ENZO": "BEATRIZ",
  "ESPLANADA": "JUCILENE",
  "FLEMING": "CLAUDIA", 
  "GUERREIROS": "JUCILENE",
  "ITAGUAÍ": "CARINA",
  "LM": "JUCILENE",
  "NEO EXATA": "CARINA",
  "COELHINHO": "SANDRA",
  "AIMEE": "JUCILENE",
  "IMPERIAL 2000": "BEATRIZ",
  "CAPITÃO ENG. NOVO": "JUCILENE",
  "BRAZ DE PINA": "BEATRIZ",
  "DANIELE": "CARINA",
  "CAPITÃO NA POSSE": "BEATRIZ",
  "IMPERADOR": "BEATRIZ",
  "JOÍA": "CARINA",
  "LUANDA": "JUCILENE",
  "SERVAUTO": "CLAUDIA",
  "MARCIAL": "SANDRA",
  "CAMBOATÁ": "CARINA",
  "DOM HÉLDER": "JUCILENE",
  "JACUÍ": "BEATRIZ",
  "LIGHT": "SANDRA",
  "MEGA VERÃO": "JUCILENE",
  "VIP": "JUCILENE",
  "PROJAC": "CLAUDIA",
  "PRÉ": "SANDRA",
  "TRÊS M": "SANDRA",
  "CAFUNDÁ": "CARINA",
  "RIO GRANDE": "CARINA",
  "BARRA MANSA": "CLAUDIA",
  "LOBO": "SANDRA",
  "SÃO PEDRO": "BEATRIZ",
  "SHEKINAH": "BEATRIZ",
  "DIVINA": "BEATRIZ",
  "FARID 2": "JUCILENE",
  "MAYARA": "CARINA",
  "RAJA": "BEATRIZ",
  "TRABALHO ABOLIÇÃO": "JUCILENE",
  "AUTO CLUBE": "SANDRA",
  "MERCADAO": "BEATRIZ",
  "MATO ALTO": "CARINA",
  "AMIGO DA RODOVIA": "CARINA",
  "GARDÊNIA": "BEATRIZ",
  "GABINAL": "CARINA",
  "GARAGEM MÉIER": "CLAUDIA",
  "PLOPES": "SANDRA",
  "ROTOR": "JUCILENE",
  "VILA VALQUEIRE": "BEATRIZ",
  "SUBURBANO": "SANDRA",
  "MERITI": "SANDRA",
  "WM DO LOCAL": "SANDRA"
};

const FORNECEDORES_COMBUSTIVEL = [
  "VIBRA ENERGIA S.A", "FLAGLER COMBUSTIVEIS S/A", "SP INDUSTRIA E DISTRIBUIDORA DE PETROLEO LTDA",
  "CIA DISTRIBUIDORA DE GAS DO RIO DE JANEIRO", "PARANAPANEMA DISTRIBUIDORA DE COMBUSTIVEIS LTDA",
  "SANTOS FRANCA COMERCIO DE COMBUSTIVEIS LTDA", "TOBRAS DISTRIBUIDORA DE COMBUSTIVEIS LTDA",
  "URCA COMERCIALIZADORA DE GAS NATURAL S/A", "RODOPETRO DISTRIBUIDORA DE PETROLEO LTDA",
  "RDP ENERGIA LTDA", "SAINT-TROPEZ FUNDO DE INVESTIMENTO EM DIREITOS CREDITORIOS",
  "CARINTHIA DISTRIBUIDORA S.A.", "76 OIL DISTRIBUIDORA DE COMBUSTIVEIS S/A",
  "RUFF CJ DISTRIBUIDORA DE PETROLEO LTDA", "MINUANO PETROLEO LTDA", "NEXTA DISTRIBUIDORA LTDA",
  "RAIZEN S.A.", "TOTALENERGIES DISTRIBUIDORA BRASIL", "ECONOMY DISTRIBUIDORA DE PETROLEO LTDA",
  "USIQUIMICA DO BRASIL LTDA"
];

// O Novo Mapa de Fornecedores Flexíveis para Contas a Pagar
const MAPA_FORNECEDORES = [
  {
    alvo: "Ambev S.A. - F. Nova Rio.",
    palavrasChave: ["AMBEV"] 
  },
  {
    alvo: "Rio de Janeiro Refrescos Ltda.",
    palavrasChave: ["RIO DE JANEIRO REFRESCOS", "COCA COLA", "COCA-COLA"] 
  },
  {
    alvo: "L.A.V. DRESSLER CIA. LTDA.",
    palavrasChave: ["DRESSLER"] 
  },
  {
    alvo: "BARRALUB BARRA MANSA OIL LTDA.",
    palavrasChave: ["BARRALUB"] 
  },
  {
    alvo: "AC ARAUJO DISTR DE AUTO PECA.",
    palavrasChave: ["AC ARAUJO"] 
  }
];

const PALAVRAS_COMBUSTIVEL = ["GASOLINA", "ETANOL", "DIESEL", "S10", "S500", "GNV", "GC", "GAS"];

// ======================================================
// FUNÇÕES AUXILIARES E LÓGICA DE IDENTIFICAÇÃO
// ======================================================
function normalizarTexto(texto) {
  return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : "";
}

function identificarPostoEfetivo(textoCru) {
  const textoLimpo = normalizarTexto(textoCru);
  const apenasNumeros = textoCru ? textoCru.replace(/\D/g, '') : '';

  for (const [cnpj, apelido] of Object.entries(MAPA_POSTOS_CNPJ)) {
    if (apenasNumeros.includes(cnpj)) return { apelido, encontrou: true };
  }

  for (const apelido of Object.keys(RESPONSAVEIS_CONTAS)) {
    if (textoLimpo.includes(normalizarTexto(apelido))) return { apelido, encontrou: true };
  }

  return { apelido: "NAO_IDENTIFICADO", encontrou: false };
}

function identificarFornecedorFlexivel(textoCru) {
  const textoLimpo = normalizarTexto(textoCru);
  
  for (const fornecedor of MAPA_FORNECEDORES) {
    for (const palavra of fornecedor.palavrasChave) {
      if (textoLimpo.includes(normalizarTexto(palavra))) {
        return { alvo: fornecedor.alvo, encontrou: true };
      }
    }
  }
  return { alvo: "FORNECEDOR_DESCONHECIDO", encontrou: false };
}

function identificarResponsavel(apelidoPosto) {
  return RESPONSAVEIS_CONTAS[apelidoPosto] || "NAO_ATRIBUIDO";
}

function identificarProduto(texto) {
  // 1. Busca por descrições completas e mais exatas (maior prioridade)
  if (texto.includes("ETANOL HIDRATADO") || texto.includes("ETANOL COMUM")) return "ETANOL";
  if (texto.includes("DIESEL B S10") || texto.includes("OLEO DIESEL S10") || texto.includes("DIESEL S10") || texto.includes("DIESEL S-10")) return "S10";
  if (texto.includes("DIESEL B S500") || texto.includes("OLEO DIESEL S500") || texto.includes("DIESEL S500") || texto.includes("DIESEL S-500")) return "DIESEL";
  if (texto.includes("GASOLINA C COMUM") || texto.includes("GASOLINA COMUM")) return "COMUM";
  if (texto.includes("GASOLINA ADITIVADA") || texto.includes("ADIT PETROBRAS")) return "ADITIVADA";

  // 2. Fallback usando Regex com "Word Boundaries" (\b)
  // Isso garante que o sistema só encontre a palavra exata e solta, 
  // evitando que um texto como "CAS100" seja lido como "S10".
  if (/\bETANOL\b/.test(texto)) return "ETANOL";
  if (/\bS10\b/.test(texto)) return "S10";
  if (/\bS500\b/.test(texto)) return "DIESEL";
  if (/\bGASOLINA\b/.test(texto)) return "COMUM";

  return "Outros"; 
}

function identificarCategoriaCombustivel(textoCru) {
  const ehCombustivel = PALAVRAS_COMBUSTIVEL.some(p => textoCru.includes(p));
  if (!ehCombustivel) return "Outros";

  const apenasNumeros = textoCru ? textoCru.replace(/\D/g, '') : '';
  const textoLimpo = normalizarTexto(textoCru);

  // 1º Tenta por CNPJ (Identificação exata)
  for (const [cnpj, nomeFornecedor] of Object.entries(MAPA_FORNECEDORES_CNPJ)) {
    if (apenasNumeros.includes(cnpj)) {
      return nomeFornecedor.toUpperCase();
    }
  }

  // 2º Fallback por Nome (Se o CNPJ não estiver no mapa)
  for (const fornecedor of FORNECEDORES_COMBUSTIVEL) {
    const regex = new RegExp(`\\b${normalizarTexto(fornecedor)}\\b`, "i");
    if (regex.test(textoLimpo)) {
      return fornecedor.toUpperCase();
    }
  }

  return "Combustível";
}

// ======================================================
// MIDDLEWARES DE ROTAS
// ======================================================
app.use(cors({
    origin: ['http://localhost:5173', process.env.CLIENT_URL, 'http://localhost:3000', process.env.CLIENT_URL2, "https://pedidosgtb1.netlify.app",process.env.CLIENT_URL3,"https://dashboardgtb.netlify.app"],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
const upload = multer({ storage: multer.memoryStorage() });

// ======================================================
// ROTAS DE AUTENTICAÇÃO E DADOS
// ======================================================
app.post('/api/auth/login', async (req, res) => {
    let client;
    try {
        const { email, password, remember } = req.body;
        client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        
        const user = await db.collection('users').findOne({ email });
        if (!user) return res.status(401).json({ error: 'Email não encontrado' });

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });

        const tokenDuration = remember ? '30d' : '24h';
        const cookieDuration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: tokenDuration });

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: cookieDuration
        });

        console.log(`✅ Login realizado: ${user.email}`);
        res.json({ message: 'Logado com sucesso', user: { name: user.name, email: user.email } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno no login' });
    } finally {
        if (client) client.close();
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Sessão terminada com sucesso' });
});

app.get('/api/auth/check', async (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: 'Não autenticado' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ isAuthenticated: true, user: { id: decoded.id, email: decoded.email || 'admin' } });
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
});

app.get('/api/dados', async (req, res) => {
    let client;
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const dados = await db.collection(COLLECTION_NAME).find({}).project({_id: 0}).toArray();
        res.json(dados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar dados" });
    } finally {
        if (client) client.close();
    }
});

// ======================================================
// ROTAS DE TRANSFERÊNCIAS
// ======================================================
app.post("/api/transferencias", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const horaAtual = new Date().toLocaleTimeString("pt-PT", { hour12: false });
    const novaTransferencia = new Transferencia({ ...req.body, ip, horaEnvio: horaAtual });
    await novaTransferencia.save();
    res.status(201).json({ message: "✅ Transferência guardada com sucesso!" });
  } catch (error) {
    console.error("Erro ao guardar transferência:", error);
    res.status(500).json({ message: "❌ Erro ao guardar a transferência." });
  }
});

app.get("/api/transferencias", async (req, res) => {
  try {
    const todas = await Transferencia.find().sort({ _id: -1 }); 
    res.json(todas);
  } catch (error) {
    console.error("Erro ao buscar transferências:", error);
    res.status(500).json({ message: "Erro ao buscar transferências." });
  }
});

app.put("/api/transferencias/:id", async (req, res) => {
  try {
    const loteAtualizado = await Transferencia.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!loteAtualizado) return res.status(404).json({ message: "Lote não encontrado." });
    res.json({ message: "✅ Lote atualizado com sucesso!", lote: loteAtualizado });
  } catch (error) {
    console.error("Erro ao atualizar transferência:", error);
    res.status(500).json({ message: "❌ Erro ao atualizar o lote." });
  }
});

app.delete("/api/transferencias/:id", async (req, res) => {
  try {
    const loteEliminado = await Transferencia.findByIdAndDelete(req.params.id);
    if (!loteEliminado) return res.status(404).json({ message: "Lote não encontrado." });
    res.json({ message: "✅ Lote eliminado com sucesso!" });
  } catch (error) {
    console.error("Erro ao eliminar transferência:", error);
    res.status(500).json({ message: "❌ Erro ao eliminar o lote." });
  }
});

// ======================================================
// ESQUEMA DE CONFIGURAÇÕES
// ======================================================
const configuracaoSchema = new mongoose.Schema({
  identificador: { type: String, default: "geral" }, 
  postos: [String],
  combustiveis: [String],
  pedidos: [String],
  motoristas: [{ nome: String, placa: String }]
});

const Configuracao = mongoose.model("Configuracao", configuracaoSchema);

app.get("/api/configuracoes", async (req, res) => {
  try {
    let config = await Configuracao.findOne({ identificador: "geral" });
    if (!config) {
      config = new Configuracao({
        identificador: "geral",
        postos : Object.values(MAPA_POSTOS_CNPJ),
        combustiveis: ["GC", "GA", "ET", "S10", "S500"],
        pedidos: ["REFIT", "BR", "SHELL","SP","RDP","Terrana","Minuano"],
        motoristas: [
          { nome: "RODRIGO NEVES DA SILVA", placa: "LUR9G02" },
          { nome: "DOMICIO DA SILVA DINIZ", placa: "RJW9C90" },
          { nome: "RICARDO CLEBER ARAUJO DE SOUZA", placa: "KXE8104" },
          { nome: "Carlos Eduardo Paiva ferreira da Silva", placa: "SQV8G31" },
          { nome: "Felipe Sales", placa: "LLN6690" },
          { nome: "Osmar", placa: "LLG9678" },
          { nome: "LEONARDO LIMA DA SILVA", placa: "SRT9I87" },
          { nome: "DANILO DE SOUZA SIVA MENEZES", placa: "TTL8B60" },
          { nome: "João", placa: "SQV5B97" },
          { nome: "Fernando de Franca Galdino", placa: "LLM5453" },
          { nome: "JEFFERSON ALVES GUINDANE", placa: "LUT3922" },
          { nome: "Rogerio Pereira SEVERINO", placa: "TTY6J47" },
          { nome: "ALEXANDRE DE OLIVEIRA MOREIRA", placa: "RJP0H60" },
          { nome: "REGINALDO LOPES Da Silva", placa: "KQX8B54" },
          { nome: "Marcos", placa: "OUP6H05" },
          { nome: "Diogo Farias Gomes", placa: "SGI4J34" },
          { nome: "Allan Carlos de Oliveira Silva", placa: "BBJ5I33" },
          { nome: "Erivaldo", placa: "OKB2F75" },
          { nome: "JUBERLAN DE MELO", placa: "PUV2A96" },
          { nome: "Fernando Martins", placa: "LMF5C31" },
          { nome: "EVERSON DE SOUZA AGUIAR", placa: "KPK4C85" },
          { nome: "FABIO TENORIO DE OLIVEIRA", placa: "LLJ9B20" },
          { nome: "VALDINEY VIEIRA", placa: "DBC0J93" },
          { nome: "Thiago do Espirito Santo ribeiro", placa: "LNS8109" }
        ]
      });
      await config.save();
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar configurações." });
  }
});

app.put("/api/configuracoes", async (req, res) => {
  try {
    const configAtualizada = await Configuracao.findOneAndUpdate(
      { identificador: "geral" }, req.body, { new: true, upsert: true } 
    );
    res.json({ message: "✅ Configurações salvas com sucesso!", config: configAtualizada });
  } catch (error) {
    res.status(500).json({ message: "Erro ao salvar configurações." });
  }
});

// ======================================================
// ROTA: UPLOAD ZIP DE COMBUSTÍVEIS (NOTAS FISCAIS)
// ======================================================
app.post('/api/notas/upload', upload.single('arquivoZip'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'notasFiscais' });
    const zip = new AdmZip(req.file.buffer);
    let notasProcessadas = [];

    for (const entry of zip.getEntries()) {
      if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.pdf')) {
        const fileBuffer = entry.getData();
        const parser = new PDFParse(new Uint8Array(fileBuffer)); 
        const resultado = await parser.getText();
        
        let textoCru = normalizarTexto(resultado.text).replace(/\s+/g, ' '); 

        const dateMatch = textoCru.match(/(\d{2}\/\d{2}\/\d{4})/);
        let dataEmissao = dateMatch ? dateMatch[1].split('/').reverse().join('-') : "DATA_DESCONHECIDA";
        
        const identificacao = identificarPostoEfetivo(textoCru);
        const postoIdentificado = identificacao.apelido;

        const categoria = identificarCategoriaCombustivel(textoCru);
        const produto = identificarProduto(textoCru);
        
        console.log(`🔎 Arquivo Combustível: ${entry.entryName} | Posto: ${postoIdentificado} | Produto: ${produto}`);

        const filename = `${postoIdentificado}_${dataEmissao}_${entry.entryName}`;
        const uploadStream = bucket.openUploadStream(filename, {
          metadata: {
            posto: postoIdentificado, dataEmissao, categoria, produto, nomeOriginal: entry.entryName
          }
        });

        uploadStream.end(fileBuffer);
        notasProcessadas.push({ nome: filename, posto: postoIdentificado, data: dataEmissao, categoria });
      }
    }

    res.status(200).json({ mensagem: "ZIP processado com sucesso!", total: notasProcessadas.length, notas: notasProcessadas });
  } catch (error) {
    console.error("Erro ao processar ZIP:", error);
    res.status(500).json({ error: "Erro interno ao processar o arquivo." });
  }
});

// ======================================================
// ROTA: UPLOAD ZIP CONTAS A PAGAR (FORNECEDORES ALVO)
// ======================================================
app.post('/api/contas/upload', upload.single('arquivoZip'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'contasAPagar' }); 
    const zip = new AdmZip(req.file.buffer);
    let notasProcessadas = [];
    let notasIgnoradas = 0;

    for (const entry of zip.getEntries()) {
      if (!entry.isDirectory) {
        const isPdf = entry.entryName.toLowerCase().endsWith('.pdf');
        const isXml = entry.entryName.toLowerCase().endsWith('.xml');

        if (isPdf || isXml) {
          let dataEmissao = "DATA_DESCONHECIDA";
          let empresaCrua = "NAO_IDENTIFICADO";
          let fornecedor = "FORNECEDOR_DESCONHECIDO";
          let ehFornecedorAlvo = false; 

          const fileBuffer = entry.getData();

          if (isXml) {
            const xmlStr = fileBuffer.toString('utf8');
            
            // 1. Acha a empresa (Posto) no bloco destinatário
            const destBlockMatch = xmlStr.match(/<dest>[\s\S]*?<\/dest>/);
            const textoDestinatario = destBlockMatch ? destBlockMatch[0] : xmlStr;
            const identificacaoPosto = identificarPostoEfetivo(textoDestinatario);
            empresaCrua = identificacaoPosto.apelido;

            // 2. Acha o Fornecedor no bloco EMITENTE (Flexível)
            const emitBlockMatch = xmlStr.match(/<emit>[\s\S]*?<\/emit>/);
            if (emitBlockMatch) {
                const identificacaoFornecedor = identificarFornecedorFlexivel(emitBlockMatch[0]);
                if (identificacaoFornecedor.encontrou) {
                    fornecedor = identificacaoFornecedor.alvo;
                    ehFornecedorAlvo = true;
                }
            }

            const dateMatch = xmlStr.match(/<dhEmi>(\d{4}-\d{2}-\d{2})T/);
            if (dateMatch) dataEmissao = dateMatch[1];
            
          } else if (isPdf) {
            const parser = new PDFParse(new Uint8Array(fileBuffer)); 
            const resultado = await parser.getText();
            const textoCru = normalizarTexto(resultado.text).replace(/\s+/g, ' '); 

            const dateMatch = textoCru.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
              dataEmissao = dateMatch[1].split('/').reverse().join('-'); 
            }
            
            // 1. Acha o Fornecedor (Flexível)
            const identificacaoFornecedor = identificarFornecedorFlexivel(textoCru);
            if (identificacaoFornecedor.encontrou) {
                fornecedor = identificacaoFornecedor.alvo;
                ehFornecedorAlvo = true;
            }
            
            // 2. Acha a empresa (Posto)
            const identificacaoPosto = identificarPostoEfetivo(textoCru);
            empresaCrua = identificacaoPosto.apelido;
          }

          if (!ehFornecedorAlvo) {
            console.log(`🚫 Ignorado (Fornecedor não é alvo): ${entry.entryName}`);
            notasIgnoradas++;
            continue; 
          }

          const responsavel = identificarResponsavel(empresaCrua);
          const nomeOriginalBase = entry.entryName.replace(/\.[^/.]+$/, "");
          const filename = `${responsavel}_${dataEmissao}_${entry.entryName}`;
          
          const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
              empresa: empresaCrua,
              fornecedor: fornecedor, 
              dataEmissao: dataEmissao,
              responsavel: responsavel,
              tipoArquivo: isPdf ? 'PDF' : 'XML',
              nomeOriginalBase: nomeOriginalBase
            }
          });

          uploadStream.end(fileBuffer);
          notasProcessadas.push({
            nome: filename, empresa: empresaCrua, fornecedor, responsavel, tipo: isPdf ? 'PDF' : 'XML'
          });
        }
      }
    }
    
    console.log(`✅ ZIP processado. ${notasProcessadas.length} contas salvas, ${notasIgnoradas} barradas.`);
    res.status(200).json({ mensagem: "ZIP processado com sucesso!", total: notasProcessadas.length });
  } catch (error) {
    console.error("Erro no processamento:", error);
    res.status(500).json({ error: "Erro interno ao processar o arquivo." });
  }
});

// ======================================================
// ROTAS GENÉRICAS DE GRIDFS (LISTAR/BAIXAR)
// ======================================================
app.get('/api/notas', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'notasFiscais' });
    const { posto, data, fornecedor } = req.query;
    const filtro = {};
    if (posto) filtro["metadata.posto"] = posto;
    if (data) filtro["metadata.dataEmissao"] = data;
    if (fornecedor) filtro["metadata.categoria"] = fornecedor;
    const arquivos = await bucket.find(filtro).toArray();
    res.json(arquivos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar notas fiscais." });
  }
});

app.get('/api/notas/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'notasFiscais' });
    res.set('Content-Type', 'application/pdf');
    const downloadStream = bucket.openDownloadStream(new ObjectId(req.params.id));
    downloadStream.pipe(res);
    downloadStream.on('error', () => res.status(404).send("Arquivo não encontrado."));
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao baixar arquivo." });
  }
});

app.put('/api/notas/:id/baixar', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    await db.collection('notasFiscais.files').updateOne(
      { _id: new ObjectId(req.params.id) }, { $set: { "metadata.baixado": true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro interno." });
  }
});

app.get('/api/notas/reset/todas', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const resultado = await db.collection('notasFiscais.files').updateMany(
      {}, { $set: { "metadata.baixado": false } }
    );
    res.json({ mensagem: "Todas as notas voltaram a ser NOVAS.", notasAfetadas: resultado.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: "Erro interno." });
  }
});

app.get('/api/contas', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'contasAPagar' });
    const arquivos = await bucket.find({}).toArray();
    res.json(arquivos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar contas." });
  }
});

app.get('/api/contas/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'contasAPagar' });
    const downloadStream = bucket.openDownloadStream(new ObjectId(req.params.id));
    downloadStream.pipe(res);
    downloadStream.on('error', () => res.status(404).send("Arquivo não encontrado."));
  } catch (error) {
    res.status(500).json({ error: "Erro interno." });
  }
});


app.put('/api/contas/:id/baixar', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    await db.collection('contasAPagar.files').updateOne(
      { _id: new ObjectId(req.params.id) }, { $set: { "metadata.baixado": true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro interno." });
  }
});
// ======================================================
// ROTA TEMPORÁRIA: REPROCESSAR PRODUTOS (S10, ETANOL, ETC)
// ======================================================
app.get('/api/notas/admin/reprocessar', async (req, res) => {
  console.log("🚀 Iniciando reprocessamento para identificar fornecedores pelo CNPJ...");
  
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'notasFiscais' });
    
    // 1. Filtramos apenas o que está como "Combustível" genérico para ser mais rápido
    const arquivos = await db.collection('notasFiscais.files').find({ 
      "metadata.categoria": "Combustível" 
    }).toArray();

    let atualizadas = 0;
    let erros = 0;

    res.write(`Encontradas ${arquivos.length} notas para reprocessar...\n`);

    for (const arquivo of arquivos) {
      try {
        const downloadStream = bucket.openDownloadStream(arquivo._id);
        const chunks = [];
        for await (const chunk of downloadStream) { chunks.push(chunk); }
        const fileBuffer = Buffer.concat(chunks);

        const parser = new PDFParse(new Uint8Array(fileBuffer));
        const resultado = await parser.getText();
        const textoCru = normalizarTexto(resultado.text).replace(/\s+/g, ' ');

        // 2. Aplicamos as suas novas lógicas blindadas
        const novaCategoria = identificarCategoriaCombustivel(textoCru);
        const novoProduto = identificarProduto(textoCru);

        const alterouCategoria = novaCategoria !== arquivo.metadata.categoria;
        const alterouProduto = novoProduto !== arquivo.metadata.produto;

        // 3. Se algo mudou (especialmente a categoria), atualizamos o banco
        if (alterouCategoria || alterouProduto) {
          await db.collection('notasFiscais.files').updateOne(
            { _id: arquivo._id },
            { 
              $set: { 
                "metadata.categoria": novaCategoria,
                "metadata.produto": novoProduto
              } 
            }
          );
          console.log(`✅ Sucesso: ${arquivo.filename} | Novo Fornecedor: ${novaCategoria}`);
          atualizadas++;
        }
      } catch (err) {
        console.error(`❌ Erro no arquivo ${arquivo._id}:`, err);
        erros++;
      }
    }

    const msg = `\n✅ Processo concluído! Notas corrigidas: ${atualizadas}. Erros: ${erros}.`;
    console.log(msg);
    res.end(msg);

  } catch (error) {
    console.error("Erro geral no reprocessamento:", error);
    res.status(500).end("\nErro interno ao tentar reprocessar.");
  }
});

app.get('/api/admin/migrar-fleming', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const resultado = await db.collection('notasFiscais.files').updateMany(
      { "metadata.posto": "FLEMING" },
      { $set: { "metadata.posto": "AEROTOWN" } }
    );
    res.json({ mensagem: "Migração concluída!", atualizadas: resultado.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: "Erro na migração." });
  }
});

// ======================================================
// INICIALIZAÇÃO DO SERVIDOR
// ======================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr de forma unificada na porta ${PORT}`);
});