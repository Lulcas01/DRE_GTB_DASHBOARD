import express from 'express';
//import { createRequire } from 'module';
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
// MIDDLEWARES
// ======================================================
app.use(cors({
    origin: ['http://localhost:5173', process.env.CLIENT_URL, 'http://localhost:3000', process.env.CLIENT_URL2, "https://pedidosgtb1.netlify.app"],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// ======================================================
// ROTAS DE AUTENTICAÇÃO (AUTH)
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

// ======================================================
// ROTAS DE DADOS (DASHBOARD)
// ======================================================
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

    const novaTransferencia = new Transferencia({
      ...req.body,
      ip,
      horaEnvio: horaAtual,
    });

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
    const { id } = req.params;
    const dadosAtualizados = req.body; 

    const loteAtualizado = await Transferencia.findByIdAndUpdate(
      id, 
      dadosAtualizados, 
      { new: true } 
    );

    if (!loteAtualizado) return res.status(404).json({ message: "Lote não encontrado." });
    res.json({ message: "✅ Lote atualizado com sucesso!", lote: loteAtualizado });
  } catch (error) {
    console.error("Erro ao atualizar transferência:", error);
    res.status(500).json({ message: "❌ Erro ao atualizar o lote." });
  }
});

app.delete("/api/transferencias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const loteEliminado = await Transferencia.findByIdAndDelete(id);

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
  motoristas: [
    { nome: String, placa: String }
  ]
});

const Configuracao = mongoose.model("Configuracao", configuracaoSchema);

app.get("/api/configuracoes", async (req, res) => {
  try {
    let config = await Configuracao.findOne({ identificador: "geral" });
    
    if (!config) {
      config = new Configuracao({
        identificador: "geral",
        postos : [
            "AEROTOWN", "AIMEE", "AMERICAS", "AMIGO-DA-RODOVIA", "AMOREIRAS", "AUTO-CLUBE",
            "BAMBAM", "BARRA-MANSA", "BRAZ-DE-PINA", "CAFUNDA", "CAMBOATA", "CAPITAO-ENG-NOVO",
            "CAPITAO-NA-POSSE", "CAXIAS-PARQUE", "COELHINHO", "COIMBRA", "DANIELE", "DIVINA",
            "DOM-HELDER", "ENZO", "ESPLANADA", "FARID1", "FARID2", "FARID4", "FICA CARREGADO", "GABINAL",
            "GARAGEM-MEIER", "GARDENIA", "GASTRON", "GUERREIROS", "IMBARIE", "IMPERADOR",
            "IMPERIAL2000", "ITAGUAI", "JACUI", "JOIA", "JR-DE-IGUACU", "LIGHT", "LM",
            "LOBO", "PLOPES", "LUANDA", "MARCIAL", "MATO-ALTO", "MAYARA", "MEGA-VERAO",
            "MERCADAO", "MERITI", "MW", "NEO-EXATA", "NOVO-RECREIO", "PARADA-DA-PRACA",
            "PEDAGIO", "PRE", "PROJAC", "QUEIMADOS-RIO", "RAJA", "REALENGO", "RIO-GRANDE",
            "RIVAL", "RONDONIA", "ROTOR", "SAO-PEDRO", "SERVAUTO", "SHEKINAH", "SUBURBANO",
            "TRABALHO-ABOLICAO", "TRABALHO-BICAO", "TRES-M", "VALDEVEZ", "VILA-VALQUEIRE",
            "VILAR", "VIP", "WM-DO-LOCAL"
        ],
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
      { identificador: "geral" },
      req.body,
      { new: true, upsert: true } 
    );
    res.json({ message: "✅ Configurações salvas com sucesso!", config: configAtualizada });
  } catch (error) {
    res.status(500).json({ message: "Erro ao salvar configurações." });
  }
});

// ======================================================
// ROTAS DE NOTAS FISCAIS (GED & UPLOAD DE ZIP)
// ======================================================
const upload = multer({ storage: multer.memoryStorage() });

const DICIONARIO_POSTOS = {
  "03545887000191": "AEROTOWN", "02236460000149": "AIMEE", "29035826000178": "AMÉRICAS",
  "09070975000160": "AMIGO DA RODOVIA", "33863036000158": "AMOREIRAS", "13211882000186": "AUTO CLUBE",
  "03325858000114": "BAM BAM", "32126491000108": "BARRA MANSA", "33459918000152": "BRAZ DE PINA",
  "11052769000170": "CAFUNDÁ", "28232643000180": "CAMBOATÁ", "07124110000104": "CAPITÃO ENG. NOVO",
  "03219097000116": "CAPITÃO NA POSSE", "27905921000150": "CAXIAS PARQUE", "42234286000110": "COELHINHO",
  "36444370000165": "COIMBRA", "39469010000106": "DANIELE", "04046635000180": "DIVINA",
  "04802584000170": "DOM HÉLDER", "20674619000199": "ENZO", "10649347000113": "ESPLANADA",
  "42543875000180": "FARID 1", "45349017000197": "FARID 2", "46386902000109": "FARID 4",
  "28497450000150": "GABINAL", "33288671000159": "GARAGEM MÉIER", "02464455000193": "GARDÊNIA",
  "05311835000186": "GASTRON", "17455879000169": "GUERREIROS", "05647310000116": "IMBARIÊ",
  "33084864000198": "IMPERADOR", "03447202000174": "IMPERIAL 2000", "26954424000189": "ITAGUAÍ",
  "03596816000118": "JACUÍ", "42199000000102": "JOÍA", "53968633000154": "JR DE IGUAÇU",
  "03475408000108": "LIGHT", "04919736000119": "LM", "33133414000148": "LOBO",
  "05834897000172": "PLOPES", "42256511000119": "LUANDA", "33596735000189": "MARCIAL",
  "18092041000110": "MATO ALTO", "02814354000103": "MAYARA", "03892955000199": "MEGA VERÃO",
  "51483542000101": "MERCADAO", "02339014000160": "MERITI", "02199272000198": "MW",
  "00476334000136": "NEO EXATA", "29185682000136": "NOVO RECREIO", "04919058000194": "PARADA DA PRAÇA",
  "01797812000172": "PEDÁGIO", "02802238000166": "PRÉ", "30408374000101": "PROJAC",
  "06112829000162": "QUEIMADOS RIO", "05402099000171": "RAJA", "05410269000160": "REALENGO",
  "09256366000109": "RIO GRANDE", "00859093000104": "RIVAL", "34351502000189": "RONDONIA",
  "42252874000186": "ROTOR", "33381724000181": "SÃO PEDRO", "10371066000141": "SERVAUTO",
  "42401018000145": "SHEKINAH", "33204280000109": "SUBURBANO", "24247481000100": "TRABALHO ABOLIÇÃO",
  "24434546000119": "TRABALHO BICAO", "10303896000131": "TRÊS M", "42236778000144": "VALDEVEZ",
  "51510209000136": "VILA VALQUEIRE", "05863434000139": "VILAR", "02454272000197": "VIP",
  "03995690000154": "WM DO LOCAL"
};
const FORNECEDORES_COMBUSTIVEL = [
  "VIBRA ENERGIA S.A",
  "FLAGLER COMBUSTIVEIS S/A",
  "SP INDUSTRIA E DISTRIBUIDORA DE PETROLEO LTDA",
  "CIA DISTRIBUIDORA DE GAS DO RIO DE JANEIRO",
  "PARANAPANEMA DISTRIBUIDORA DE COMBUSTIVEIS LTDA",
  "SANTOS FRANCA COMERCIO DE COMBUSTIVEIS LTDA",
  "TOBRAS DISTRIBUIDORA DE COMBUSTIVEIS LTDA",
  "URCA COMERCIALIZADORA DE GAS NATURAL S/A",
  "RODOPETRO DISTRIBUIDORA DE PETROLEO LTDA",
"RDP ENERGIA LTDA",
"SAINT-TROPEZ FUNDO DE INVESTIMENTO EM DIREITOS CREDITORIOS",
"CARINTHIA DISTRIBUIDORA S.A.",
"76 OIL DISTRIBUIDORA DE COMBUSTIVEIS S/A",
"RUFF CJ DISTRIBUIDORA DE PETROLEO LTDA",
"MINUANO PETROLEO LTDA",
"NEXTA DISTRIBUIDORA LTDA",
"RAIZEN S.A.",
"TOTALENERGIES DISTRIBUIDORA BRASIL",
"ECONOMY DISTRIBUIDORA DE PETROLEO LTDA",
"USIQUIMICA DO BRASIL LTDA",


];
const PALAVRAS_COMBUSTIVEL = ["GASOLINA", "ETANOL", "DIESEL", "S10", "S500", "GNV", "GC", "GAS"];
function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toUpperCase();
}


function identificarProduto(texto) {
  // 1️⃣ DIESEL S10 (Procuramos S10 primeiro para não confundir com o Diesel comum)
  if (texto.includes("S10")) return "S10";

  // 2️⃣ GASOLINA ADITIVADA (Tem que vir antes da Comum, por causa do texto "Gasolina Comum Aditivada")
  if (texto.includes("ADITIVADA") || texto.includes("ADIT PETROBRAS")) return "ADITIVADA";

  // 3️⃣ GASOLINA COMUM
  if (texto.includes("GASOLINA COMUM") || texto.includes("GASOLINA C COMUM")) return "COMUM";

  // 4️⃣ ETANOL
  if (texto.includes("ETANOL")) return "ETANOL";

  // 5️⃣ DIESEL S500 (Se chegou até aqui e tem S500 ou DIESEL, é o comum/S500)
  if (texto.includes("S500") || texto.includes("DIESEL")) return "DIESEL";

  // Se não bater com nada disso, deixa como Outros
  return "Outros"; 
}
function identificarCategoriaCombustivel(texto) {
  // 1️⃣ verifica se é combustível
  const ehCombustivel = PALAVRAS_COMBUSTIVEL.some(p =>
    texto.includes(p)
  );

  if (!ehCombustivel) {
    return "Outros";
  }

  // 2️⃣ tenta achar fornecedor
  for (const fornecedor of FORNECEDORES_COMBUSTIVEL) {
    const regex = new RegExp(`\\b${fornecedor}\\b`, "i");
    if (regex.test(texto)) {
      return fornecedor.toUpperCase();
    }
  }

  // 3️⃣ fallback
  return "Combustível";
}

function agruparNotas(arquivos) {
  const estrutura = {};

  for (const arq of arquivos) {
    const posto = arq.metadata?.posto || "NAO_IDENTIFICADO";
    const data = arq.metadata?.dataEmissao || "SEM_DATA";
    const categoria = arq.metadata?.categoria || "Outros";

    // cria posto
    if (!estrutura[posto]) {
      estrutura[posto] = {};
    }

    // cria data
    if (!estrutura[posto][data]) {
      estrutura[posto][data] = {
        combustiveis: {},
        outros: []
      };
    }

    const ehCombustivel =
      categoria !== "Outros" &&
      categoria !== "Combustível";

    // 🔥 COMBUSTÍVEL POR FORNECEDOR
    if (ehCombustivel) {
      if (!estrutura[posto][data].combustiveis[categoria]) {
        estrutura[posto][data].combustiveis[categoria] = [];
      }

      estrutura[posto][data].combustiveis[categoria].push(arq);
    } else if (categoria === "Combustível") {
      // combustível sem fornecedor identificado
      if (!estrutura[posto][data].combustiveis["NAO_IDENTIFICADO"]) {
        estrutura[posto][data].combustiveis["NAO_IDENTIFICADO"] = [];
      }

      estrutura[posto][data].combustiveis["NAO_IDENTIFICADO"].push(arq);
    } else {
      // 📦 OUTROS
      estrutura[posto][data].outros.push(arq);
    }
  }

  return estrutura;
}

// ROTA: Processar Upload de ZIP
app.post('/api/notas/upload', upload.single('arquivoZip'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'notasFiscais' });

    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    
    let notasProcessadas = [];

    for (const entry of zipEntries) {
  if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.pdf')) {

    const pdfBuffer = entry.getData();

    const uint8ArrayData = new Uint8Array(pdfBuffer);
    const parser = new PDFParse(uint8ArrayData); 
    const resultado = await parser.getText();
    
    // 2. Extrai o texto e FORÇA a limpeza pesada
    let textoCru = normalizarTexto(resultado.text);
    
    // 👇 O SEGREDO ESTÁ AQUI: Remove quebras de linha e espaços duplos
    textoCru = textoCru.replace(/\s+/g, ' '); 

    const dateMatch = textoCru.match(/(\d{2}\/\d{2}\/\d{4})/);
    let dataEmissao = dateMatch ? dateMatch[1] : "DATA_DESCONHECIDA";
    
    if (dataEmissao !== "DATA_DESCONHECIDA") {
      const [d, m, y] = dataEmissao.split('/');
      dataEmissao = `${y}-${m}-${d}`; 
    }

    const textoSoNumeros = textoCru.replace(/\D/g, ''); 
    let postoIdentificado = "NAO_IDENTIFICADO";
    
    for (const cnpj of Object.keys(DICIONARIO_POSTOS)) {
      if (textoSoNumeros.includes(cnpj)) {
        postoIdentificado = DICIONARIO_POSTOS[cnpj];
        break;
      }
    }

    const categoria = identificarCategoriaCombustivel(textoCru);
    const produto = identificarProduto(textoCru);
    
    // 👇 O ESPIÃO VAI ESCREVER NO SEU TERMINAL AGORA
    console.log(`🔎 Arquivo: ${entry.entryName} | Posto: ${postoIdentificado} | Produto Achado: ${produto}`);

    const filename = `${postoIdentificado}_${dataEmissao}_${entry.entryName}`;
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        posto: postoIdentificado,
        dataEmissao: dataEmissao,
        categoria: categoria,
        produto: produto,
        nomeOriginal: entry.entryName
      }
    });

    uploadStream.end(pdfBuffer);
    
    notasProcessadas.push({
      nome: filename,
      posto: postoIdentificado,
      data: dataEmissao,
      categoria: categoria
    });
  }
}

    res.status(200).json({ 
      mensagem: "ZIP processado com sucesso!", 
      total: notasProcessadas.length,
      notas: notasProcessadas 
    });

  } catch (error) {
    console.error("Erro ao processar ZIP:", error);
    res.status(500).json({ error: "Erro interno ao processar o arquivo." });
  }
});

// ROTA: Listar todas as notas
app.get('/api/notas', async (req, res) => {
  try {
    const { posto, data, fornecedor } = req.query;

    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'notasFiscais' });

    const filtro = {};

    if (posto) filtro["metadata.posto"] = posto;
    if (data) filtro["metadata.dataEmissao"] = data;
    if (fornecedor) filtro["metadata.categoria"] = fornecedor;

    const arquivos = await bucket.find(filtro).toArray();

    res.json(arquivos);
  } catch (error) {
    console.error("Erro ao listar notas:", error);
    res.status(500).json({ error: "Erro ao buscar notas fiscais." });
  }
});


// ROTA: Visualizar ou baixar o PDF
app.get('/api/notas/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'notasFiscais' });

    const objectId = new ObjectId(req.params.id); // <-- Consertado aqui também!
    
    res.set('Content-Type', 'application/pdf');
    
    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream.pipe(res);
    
    downloadStream.on('error', () => {
      res.status(404).send("Arquivo não encontrado.");
    });
  } catch (error) {
    console.error("Erro ao baixar nota:", error);
    res.status(500).json({ error: "Erro interno ao baixar arquivo." });
  }
});

app.put('/api/notas/:id/baixar', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const objectId = new ObjectId(req.params.id);
    
    // Atualiza o documento no banco colocando a flag 'baixado: true' no metadata
    await db.collection('notasFiscais.files').updateOne(
      { _id: objectId },
      { $set: { "metadata.baixado": true } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao marcar nota como baixada:", error);
    res.status(500).json({ error: "Erro interno." });
  }
});

// 🔥 ROTA SECRETA: RESETAR TODOS OS DOWNLOADS 🔥
app.get('/api/notas/reset/todas', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // Procura TODOS os arquivos e muda o baixado para falso
    const resultado = await db.collection('notasFiscais.files').updateMany(
      {}, // Filtro vazio = pega todos!
      { $set: { "metadata.baixado": false } }
    );
    
    res.json({ 
      mensagem: "Mágica feita! Todas as notas voltaram a ser NOVAS.",
      notasAfetadas: resultado.modifiedCount 
    });
  } catch (error) {
    console.error("Erro ao resetar notas:", error);
    res.status(500).json({ error: "Erro interno." });
  }
});

const FORNECEDORES_ALVO = [
 "Ambev S.A. - F. Nova Rio.",
"Rio de Janeiro Refrescos Ltda.",
"L.A.V. DRESSLER CIA. LTDA.",
"BARRALUB BARRA MANSA OIL LTDA.",
"AC ARAUJO DISTR DE AUTO PECA."
];

// ======================================================
// 2. DICIONÁRIOS (BASEADOS NO SEU CSV)
// ======================================================
const RESPONSAVEIS_CONTAS = {
  "AMOREIRAS INDUSTRIA E COMERCIO LTDA": "SANDRA",
  "AUTO POSTO COIMBRA DA VILA SAO LUIZ LTDA": "SANDRA",
  "AUTO POSTO DE SERVICOS RIVAL DE GUA E LTDA": "JUCILENE",
  "AUTO POSTO DO TRABALHO BICAO LTDA": "SANDRA",
  "AUTO POSTO E SERVICO BAM BAM LTDA": "CARINA",
  "AUTO POSTO FARID 4 LTDA": "CARINA",
  "AUTO POSTO FARID DE IGUACU LTDA": "SANDRA",
  "AUTO POSTO JR DE IGUACU LTDA": "CLAUDIA",
  "AUTO POSTO NOVO AMERICAS LTDA": "CLAUDIA",
  "AUTO POSTO NOVO PEDAGIO LTDA": "CARINA",
  "AUTO POSTO NOVO RECREIO LTDA": "JUCILENE",
  "AUTO POSTO QUEIMADOS RIO LTDA": "CARINA",
  "AUTO POSTO UNIVERSIDADE REALENGO LTDA": "JUCILENE",
  "AUTO POSTO VALDEVEZ LTDA": "BEATRIZ",
  "AUTO POSTO VILAR DOS TELES LTDA": "CARINA",
  "AUTO POSTO VITORIA DE IMBARIE LTDA": "JUCILENE",
  "CAXIAS PARQUE AUTO POSTO": "SANDRA",
  "CENTRO DE ABASTECIMENTO GASTRON CAXIAS LTDA": "BEATRIZ",
  "ENZO QUEIMADOS LTDA": "BEATRIZ",
  "ESPLANADA DE BANGU POSTO DE GASOLINA LTDA": "JUCILENE",
  "FLEMING CENTRO DE COMERCIO E SERVICOS LTDA": "CLAUDIA",
  "FLEMING - CENTRO DE COMERCIO E SERVICOS LTDA": "CLAUDIA",
  "GUERREIROS DE CAXIAS POSTO DE GASOLINA LTDA": "JUCILENE",
  "ITAGUAI AUTO CENTER LTDA": "CARINA",
  "LM E JB AUTO POSTO LTDA": "JUCILENE",
  "LM & JB AUTO POSTO LTDA": "JUCILENE",
  "NEO EXATA COMERCIO E DISTR DE COMBUSTIVEIS LTDA": "CARINA",
  "NEO EXATA COMERCIO DISTRIBUIDORA DE COMBUSTIVEIS LTDA": "CARINA",
  "POSTO COELHINHO LTDA": "SANDRA",
  "POSTO DE ABASTECIMENTO AIMEE LTDA": "JUCILENE",
  "POSTO DE ABASTECIMENTO IMPERIAL 2000 LTDA": "BEATRIZ",
  "POSTO DE COMBUSTIVEIS CAPITAO ENGENHO NOVO LTDA": "JUCILENE",
  "POSTO DE GASOLINA BRAZ DE PINA LTDA": "BEATRIZ",
  "POSTO DE GASOLINA DANIELE DE NOVA IGUACU LTDA": "CARINA",
  "POSTO DE GASOLINA DANIELE DE NOVA IGUACU": "CARINA",
  "POSTO DE GASOLINA DO CAPITAO NA POSSE LTDA": "BEATRIZ",
  "POSTO DE GASOLINA IMPERADOR LTDA": "BEATRIZ",
  "POSTO DE GASOLINA JOIA DE VIZEU LTDA": "CARINA",
  "POSTO DE GASOLINA LUANDA LTDA": "JUCILENE",
  "POSTO DE GASOLINA LUANDA LIMITADA": "JUCILENE",
  "POSTO DE GNV SERVAUTO II 2007 LTDA": "CLAUDIA",
  "POSTO DE GNV SERVAUTO II LTDA": "CLAUDIA",
  "POSTO DE GNV SERVAUTO": "CLAUDIA",
  "POSTO DE LUBRIFICACAO MARCIAL LTDA": "SANDRA",
  "POSTO DE SERVICO CAMBOATA LTDA": "CARINA",
  "POSTO E GARAGEM DOM HELDER CAMARA LTDA": "JUCILENE",
  "POSTO JACUI LTDA": "BEATRIZ",
  "POSTO LIGHT HIGHWAY LTDA": "SANDRA",
  "POSTO MEGA VERAO LTDA": "JUCILENE",
  "POSTO SERVICO VIP DE SAO JOAO MERITI LTDA ME": "JUCILENE",
  "POSTO SERVICO VIP DE SAO JOAO DE MERITI LTDA": "JUCILENE",
  "SIC PROJAC COMBUSTIVEL LTDA": "CLAUDIA",
  "SIC PROJAC COMBUST VEIS LTDA": "CLAUDIA",
  "AUTO POSTO DE ABASTECIMENTO DO PRE": "SANDRA",
  "POSTO DE COMBUSTIVEL TRES M DE CAMPO GRANDE LTDA": "SANDRA",
  "POSTO DE COMBUSTIVEL TRES M DE CAMPO GRA": "SANDRA",
  "POSTO DE GASOLINA CAFUNDA LTDA EPP": "CARINA",
  "AUTO POSTO QUINTA DO RIO GRANDE LTDA": "CARINA",
  "POSTO PERFEITO DE BARRA MANSA LTDA": "CLAUDIA",
  "POSTO LOBO JUNIOR LTDA": "SANDRA",
  "POSTO DE LUBRIFICACAO SAO PEDRO LTDA": "BEATRIZ",
  "SHEKINAH DE CAMPO GRANDE LIMITADA": "BEATRIZ",
  "POSTO DIVINA LUZ DE ANCHIETA LTDA": "BEATRIZ",
  "AUTO POSTO FARID II LTDA": "JUCILENE",
  "AUTO CENTER MAYARA LTDA": "CARINA",
  "POSTO E GARAGEM RAJA DE CASCADURA L": "BEATRIZ",
  "AUTO POSTO DO TRABALHO ABOLICAO LTD": "JUCILENE",
  "POSTO DE GASOLINA AUTO CLUBE DE MER TDA": "SANDRA",
  "MERCADAO DE MADUREIRA COMERCIO DE C TIVEIS LTDA": "BEATRIZ",
  "POSTO DE GASOLINA FLOR DO MATO ALTO": "CARINA",
  "AMIGO DA RODOVIA AUTO POSTO LTDA": "CARINA",
  "AUTO POSTO GARDENIA AZUL LTDA": "BEATRIZ",
  "GABINAL COMERCIO DE COMBUSTIVEIS LT": "CARINA",
  "GARAGEM MEIER LTDA": "CLAUDIA",
  "P. LOPES GNV POSTO DE SERVICOS LTDA": "SANDRA",
  "ROTOR PRODUTOS DE PETROLEO LTDA": "JUCILENE",
  "VILA VALQUEIRE COMERCIO DE COMBUSTI LTDA": "BEATRIZ",
  "VITORIA DE IMBARIE LTDA": "JUCILENE",
  "NOSSO POSTO DE GASOLINA SUBURBANO L": "SANDRA",
  "POSTO MERITI 1 LTDA EPP": "SANDRA",
  "POSTO MERITI 1 LTDA": "SANDRA",
  "AUTO POSTO E SERVICOS BAM BAM LTDA": "CARINA",
  "AUTO POSTO VALDEVEZ LTDA EPP": "BEATRIZ",
  "CAXIAS PARQUE AUTO POSTO LTDA": "SANDRA"
};

const TRADUTOR_POSTOS = {
  "AMOREIRAS INDUSTRIA E COMERCIO LTDA": "AMOREIRAS",
  "AUTO POSTO COIMBRA DA VILA SAO LUIZ LTDA": "COIMBRA",
  "AUTO POSTO DE SERVICOS RIVAL DE GUA E LTDA": "RIVAL",
  "AUTO POSTO DO TRABALHO BICAO LTDA": "TRABALHO BICAO",
  "AUTO POSTO E SERVICO BAM BAM LTDA": "BAM BAM",
  "AUTO POSTO FARID 4 LTDA": "FARID 4",
  "AUTO POSTO FARID DE IGUACU LTDA": "FARID 1",
  "AUTO POSTO JR DE IGUACU LTDA": "JR DE IGUAÇU",
  "AUTO POSTO NOVO AMERICAS LTDA": "AMÉRICAS",
  "AUTO POSTO NOVO PEDAGIO LTDA": "PEDÁGIO",
  "AUTO POSTO NOVO RECREIO LTDA": "NOVO RECREIO",
  "AUTO POSTO QUEIMADOS RIO LTDA": "QUEIMADOS RIO",
  "AUTO POSTO UNIVERSIDADE REALENGO LTDA": "REALENGO",
  "AUTO POSTO VALDEVEZ LTDA": "VALDEVEZ",
  "AUTO POSTO VILAR DOS TELES LTDA": "VILAR",
  "AUTO POSTO VITORIA DE IMBARIE LTDA": "IMBARIÊ",
  "CAXIAS PARQUE AUTO POSTO": "CAXIAS PARQUE",
  "CENTRO DE ABASTECIMENTO GASTRON CAXIAS LTDA": "GASTRON",
  "ENZO QUEIMADOS LTDA": "ENZO",
  "ESPLANADA DE BANGU POSTO DE GASOLINA LTDA": "ESPLANADA",
  "FLEMING CENTRO DE COMERCIO E SERVICOS LTDA": "FLEMING",
  "FLEMING - CENTRO DE COMERCIO E SERVICOS LTDA": "FLEMING",
  "GUERREIROS DE CAXIAS POSTO DE GASOLINA LTDA": "GUERREIROS",
  "ITAGUAI AUTO CENTER LTDA": "ITAGUAÍ",
  "LM E JB AUTO POSTO LTDA": "LM",
  "LM & JB AUTO POSTO LTDA": "LM",
  "NEO EXATA COMERCIO E DISTR DE COMBUSTIVEIS LTDA": "NEO EXATA",
  "NEO EXATA COMERCIO DISTRIBUIDORA DE COMBUSTIVEIS LTDA": "NEO EXATA",
  "POSTO COELHINHO LTDA": "COELHINHO",
  "POSTO DE ABASTECIMENTO AIMEE LTDA": "AIMEE",
  "POSTO DE ABASTECIMENTO IMPERIAL 2000 LTDA": "IMPERIAL 2000",
  "POSTO DE COMBUSTIVEIS CAPITAO ENGENHO NOVO LTDA": "CAPITÃO ENG. NOVO",
  "POSTO DE GASOLINA BRAZ DE PINA LTDA": "BRAZ DE PINA",
  "POSTO DE GASOLINA DANIELE DE NOVA IGUACU LTDA": "DANIELE",
  "POSTO DE GASOLINA DANIELE DE NOVA IGUACU": "DANIELE",
  "POSTO DE GASOLINA DO CAPITAO NA POSSE LTDA": "CAPITÃO NA POSSE",
  "POSTO DE GASOLINA IMPERADOR LTDA": "IMPERADOR",
  "POSTO DE GASOLINA JOIA DE VIZEU LTDA": "JOÍA",
  "POSTO DE GASOLINA LUANDA LTDA": "LUANDA",
  "POSTO DE GASOLINA LUANDA LIMITADA": "LUANDA",
  "POSTO DE GNV SERVAUTO II 2007 LTDA": "SERVAUTO",
  "POSTO DE GNV SERVAUTO II LTDA": "SERVAUTO",
  "POSTO DE GNV SERVAUTO": "SERVAUTO",
  "POSTO DE LUBRIFICACAO MARCIAL LTDA": "MARCIAL",
  "POSTO DE SERVICO CAMBOATA LTDA": "CAMBOATÁ",
  "POSTO E GARAGEM DOM HELDER CAMARA LTDA": "DOM HÉLDER",
  "POSTO JACUI LTDA": "JACUÍ",
  "POSTO LIGHT HIGHWAY LTDA": "LIGHT",
  "POSTO MEGA VERAO LTDA": "MEGA VERÃO",
  "POSTO SERVICO VIP DE SAO JOAO MERITI LTDA ME": "VIP",
  "POSTO SERVICO VIP DE SAO JOAO DE MERITI LTDA": "VIP",
  "SIC PROJAC COMBUSTIVEL LTDA": "PROJAC",
  "SIC PROJAC COMBUST VEIS LTDA": "PROJAC",
  "AUTO POSTO DE ABASTECIMENTO DO PRE": "PRÉ",
  "POSTO DE COMBUSTIVEL TRES M DE CAMPO GRANDE LTDA": "TRÊS M",
  "POSTO DE COMBUSTIVEL TRES M DE CAMPO GRA": "TRÊS M",
  "POSTO DE GASOLINA CAFUNDA LTDA EPP": "CAFUNDÁ",
  "AUTO POSTO QUINTA DO RIO GRANDE LTDA": "RIO GRANDE",
  "POSTO PERFEITO DE BARRA MANSA LTDA": "BARRA MANSA",
  "POSTO LOBO JUNIOR LTDA": "LOBO",
  "POSTO DE LUBRIFICACAO SAO PEDRO LTDA": "SÃO PEDRO",
  "SHEKINAH DE CAMPO GRANDE LIMITADA": "SHEKINAH",
  "POSTO DIVINA LUZ DE ANCHIETA LTDA": "DIVINA",
  "AUTO POSTO FARID II LTDA": "FARID 2",
  "AUTO CENTER MAYARA LTDA": "MAYARA",
  "POSTO E GARAGEM RAJA DE CASCADURA L": "RAJA",
  "AUTO POSTO DO TRABALHO ABOLICAO LTD": "TRABALHO ABOLIÇÃO",
  "POSTO DE GASOLINA AUTO CLUBE DE MER TDA": "AUTO CLUBE",
  "MERCADAO DE MADUREIRA COMERCIO DE C TIVEIS LTDA": "MERCADAO",
  "POSTO DE GASOLINA FLOR DO MATO ALTO": "MATO ALTO",
  "AMIGO DA RODOVIA AUTO POSTO LTDA": "AMIGO DA RODOVIA",
  "AUTO POSTO GARDENIA AZUL LTDA": "GARDÊNIA",
  "GABINAL COMERCIO DE COMBUSTIVEIS LT": "GABINAL",
  "GARAGEM MEIER LTDA": "GARAGEM MÉIER",
  "P. LOPES GNV POSTO DE SERVICOS LTDA": "PLOPES",
  "ROTOR PRODUTOS DE PETROLEO LTDA": "ROTOR",
  "VILA VALQUEIRE COMERCIO DE COMBUSTI LTDA": "VILA VALQUEIRE",
  "VITORIA DE IMBARIE LTDA": "IMBARIÊ",
  "NOSSO POSTO DE GASOLINA SUBURBANO L": "SUBURBANO",
  "POSTO MERITI 1 LTDA EPP": "MERITI",
  "POSTO MERITI 1 LTDA": "MERITI",
  "AUTO POSTO E SERVICOS BAM BAM LTDA": "BAM BAM",
  "AUTO POSTO VALDEVEZ LTDA EPP": "VALDEVEZ",
  "CAXIAS PARQUE AUTO POSTO LTDA": "CAXIAS PARQUE"
};

//function normalizarTexto(texto) {
 // return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : "";
//}

function identificarResponsavel(nomeEmpresaCrua) {
  const empresaNorm = normalizarTexto(nomeEmpresaCrua);
  for (const [key, responsavel] of Object.entries(RESPONSAVEIS_CONTAS)) {
    if (empresaNorm.includes(normalizarTexto(key)) || normalizarTexto(key).includes(empresaNorm)) {
      return responsavel;
    }
  }
  return "NAO_ATRIBUIDO";
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());


// ======================================================
// ROTA: UPLOAD DE ZIP (CONTAS A PAGAR)
// ======================================================
app.post('/api/contas/upload', upload.single('arquivoZip'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'contasAPagar' }); 
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    let notasProcessadas = [];
    let notasIgnoradas = 0; // Contador só para você saber no log quantos foram barrados

    for (const entry of zipEntries) {
      if (!entry.isDirectory) {
        const isPdf = entry.entryName.toLowerCase().endsWith('.pdf');
        const isXml = entry.entryName.toLowerCase().endsWith('.xml');

        if (isPdf || isXml) {
          let dataEmissao = "DATA_DESCONHECIDA";
          let empresaCrua = "EMPRESA_DESCONHECIDA";
          let fornecedor = "FORNECEDOR_DESCONHECIDO";
          let ehFornecedorAlvo = false; // 🚦 NOSSA FLAG DE BLOQUEIO

          const fileBuffer = entry.getData();

          if (isXml) {
            const xmlStr = fileBuffer.toString('utf8');
            
            // 🎯 LÓGICA DE FORNECEDOR (XML)
            const emitMatch = xmlStr.match(/<emit>[\s\S]*?<xNome>(.*?)<\/xNome>/);
            if (emitMatch) {
              const fornecedorXML = normalizarTexto(emitMatch[1]);
              fornecedor = fornecedorXML; // Padrão: Usa o que achou no XML

              // Verifica se está na lista permitida
              for (const f of FORNECEDORES_ALVO) {
                if (fornecedorXML.includes(normalizarTexto(f))) {
                  fornecedor = f;
                  ehFornecedorAlvo = true; // Liberado!
                  break;
                }
              }
            }

            const destMatch = xmlStr.match(/<dest>[\s\S]*?<xNome>(.*?)<\/xNome>/);
            if (destMatch) empresaCrua = normalizarTexto(destMatch[1]);

            const dateMatch = xmlStr.match(/<dhEmi>(\d{4}-\d{2}-\d{2})T/);
            if (dateMatch) dataEmissao = dateMatch[1];
            
          } else if (isPdf) {
            const parser = new PDFParse(new Uint8Array(fileBuffer)); 
            const resultado = await parser.getText();
            const textoCru = normalizarTexto(resultado.text).replace(/\s+/g, ' '); 

            const dateMatch = textoCru.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
              const [d, m, y] = dateMatch[1].split('/');
              dataEmissao = `${y}-${m}-${d}`; 
            }
            
            // 🎯 LÓGICA DE FORNECEDOR (PDF)
            for (const f of FORNECEDORES_ALVO) {
              if (textoCru.includes(normalizarTexto(f))) {
                fornecedor = f;
                ehFornecedorAlvo = true; // Liberado!
                break;
              }
            }
            
            for (const key of Object.keys(RESPONSAVEIS_CONTAS)) {
              if (textoCru.includes(normalizarTexto(key))) {
                empresaCrua = key;
                break;
              }
            }
          }

          // 🛑 A BARREIRA: Se não achou na nossa lista alvo, ignora o arquivo
          if (!ehFornecedorAlvo) {
            console.log(`🚫 Ignorado (Fornecedor não é alvo): ${entry.entryName}`);
            notasIgnoradas++;
            continue; // Pula para o próximo arquivo do ZIP, não faz upload
          }

          const responsavel = identificarResponsavel(empresaCrua);
          const empresaFormatada = TRADUTOR_POSTOS[empresaCrua] || empresaCrua; 

          const nomeOriginalBase = entry.entryName.replace(/\.[^/.]+$/, "");
          const filename = `${responsavel}_${dataEmissao}_${entry.entryName}`;
          
          const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
              empresa: empresaFormatada, 
              fornecedor: fornecedor, 
              dataEmissao: dataEmissao,
              responsavel: responsavel,
              tipoArquivo: isPdf ? 'PDF' : 'XML',
              nomeOriginalBase: nomeOriginalBase
            }
          });

          uploadStream.end(fileBuffer);
          
          notasProcessadas.push({
            nome: filename, empresa: empresaFormatada, fornecedor, responsavel, tipo: isPdf ? 'PDF' : 'XML'
          });
        }
      }
    }
    
    console.log(`✅ ZIP processado. ${notasProcessadas.length} notas salvas, ${notasIgnoradas} barradas.`);
    res.status(200).json({ mensagem: "ZIP processado com sucesso!", total: notasProcessadas.length });
  } catch (error) {
    console.error("Erro no processamento:", error);
    res.status(500).json({ error: "Erro interno ao processar o arquivo." });
  }
});

// ======================================================
// ROTAS DE BUSCA E DOWNLOAD
// ======================================================
app.get('/api/contas', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'contasAPagar' });
    const arquivos = await bucket.find({}).toArray();
    res.json(arquivos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar notas." });
  }
});

app.get('/api/contas/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'contasAPagar' });
    const objectId = new ObjectId(req.params.id); 
    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream.pipe(res);
    downloadStream.on('error', () => res.status(404).send("Arquivo não encontrado."));
  } catch (error) {
    res.status(500).json({ error: "Erro interno." });
  }
});


app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr de forma unificada na porta ${PORT}`);
});