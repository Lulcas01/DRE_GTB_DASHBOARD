import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
// CONEXÃO COM O MONGOOSE (Para as Transferências)
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
// MIDDLEWARES (CORS Atualizado com a porta 3000)
// ======================================================


app.use(cors({
    origin: ['http://localhost:5173', process.env.CLIENT_URL,'http://localhost:3000',process.env.CLIENT_URL2],
    credentials: true // Permite o tráfego de cookies
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
// ROTAS DE TRANSFERÊNCIAS (CRIAR, LER, ATUALIZAR, APAGAR)
// ======================================================

// 1. CRIAR (POST) - Guarda um novo lote de transferências
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

// 2. LER (GET) - Devolve todos os lotes para mostrar no Histórico
app.get("/api/transferencias", async (req, res) => {
  try {
    const todas = await Transferencia.find().sort({ _id: -1 }); // O sort({_id: -1}) traz os mais recentes primeiro
    res.json(todas);
  } catch (error) {
    console.error("Erro ao buscar transferências:", error);
    res.status(500).json({ message: "Erro ao buscar transferências." });
  }
});

// 3. ATUALIZAR (PUT) - Edita um lote existente pelo seu ID
app.put("/api/transferencias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const dadosAtualizados = req.body; // Recebe os novos dados do frontend

    // Procura o lote pelo ID e atualiza-o com os novos dados
    const loteAtualizado = await Transferencia.findByIdAndUpdate(
      id, 
      dadosAtualizados, 
      { new: true } // Garante que devolve o objeto já atualizado
    );

    if (!loteAtualizado) {
      return res.status(404).json({ message: "Lote não encontrado." });
    }

    res.json({ message: "✅ Lote atualizado com sucesso!", lote: loteAtualizado });
  } catch (error) {
    console.error("Erro ao atualizar transferência:", error);
    res.status(500).json({ message: "❌ Erro ao atualizar o lote." });
  }
});

// 4. APAGAR (DELETE) - Elimina um lote pelo seu ID
app.delete("/api/transferencias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const loteEliminado = await Transferencia.findByIdAndDelete(id);

    if (!loteEliminado) {
      return res.status(404).json({ message: "Lote não encontrado." });
    }

    res.json({ message: "✅ Lote eliminado com sucesso!" });
  } catch (error) {
    console.error("Erro ao eliminar transferência:", error);
    res.status(500).json({ message: "❌ Erro ao eliminar o lote." });
  }
});


// ======================================================
// ESQUEMA DE CONFIGURAÇÕES (Postos, Motoristas, etc)
// ======================================================
const configuracaoSchema = new mongoose.Schema({
  identificador: { type: String, default: "geral" }, // Usaremos um único documento para guardar tudo
  postos: [String],
  combustiveis: [String],
  pedidos: [String],
  motoristas: [
    { nome: String, placa: String }
  ]
});

const Configuracao = mongoose.model("Configuracao", configuracaoSchema);

// ROTA GET: Busca as configurações (se não existir, cria uma padrão)
app.get("/api/configuracoes", async (req, res) => {
  try {
    let config = await Configuracao.findOne({ identificador: "geral" });
    
    // Se for a primeira vez rodando, ele cria a lista inicial para você não começar do zero
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
          // Nossos
          { nome: "RODRIGO NEVES DA SILVA", placa: "LUR9G02" },
          { nome: "DOMICIO DA SILVA DINIZ", placa: "RJW9C90" },
          { nome: "RICARDO CLEBER ARAUJO DE SOUZA", placa: "KXE8104" },
          { nome: "Carlos Eduardo Paiva ferreira da Silva", placa: "SQV8G31" },
          { nome: "Felipe Sales", placa: "LLN6690" }, // Cavalo (Carreta vazia)
          { nome: "Osmar", placa: "LLG9678" }, // Cavalo (Carreta vazia)
          { nome: "LEONARDO LIMA DA SILVA", placa: "SRT9I87" },
          { nome: "DANILO DE SOUZA SIVA MENEZES", placa: "TTL8B60" },
          { nome: "João", placa: "SQV5B97" },
          { nome: "Fernando de Franca Galdino", placa: "LLM5453" }, // Cavalo (Carreta vazia)
          { nome: "JEFFERSON ALVES GUINDANE", placa: "LUT3922" }, // Cavalo (Carreta vazia)
          { nome: "Rogerio Pereira SEVERINO", placa: "TTY6J47" },
          { nome: "ALEXANDRE DE OLIVEIRA MOREIRA", placa: "RJP0H60" },
          // Alugados
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

// ROTA PUT: Atualiza as configurações
app.put("/api/configuracoes", async (req, res) => {
  try {
    const configAtualizada = await Configuracao.findOneAndUpdate(
      { identificador: "geral" },
      req.body,
      { new: true, upsert: true } // upsert cria se não existir
    );
    res.json({ message: "✅ Configurações salvas com sucesso!", config: configAtualizada });
  } catch (error) {
    res.status(500).json({ message: "Erro ao salvar configurações." });
  }
});

// ======================================================
// INICIALIZAÇÃO DO SERVIDOR
// ======================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr de forma unificada na porta ${PORT}`);
});