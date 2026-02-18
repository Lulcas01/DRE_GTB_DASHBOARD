import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose'; // <-- Mongoose importado aqui
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

// Travas de Segurança
if (!JWT_SECRET || !MONGO_URI) {
    console.error("❌ ERRO FATAL: Faltam variáveis no arquivo .env (JWT_SECRET ou MONGO_URI)");
    process.exit(1);
}

// ======================================================
// CONEXÃO COM O MONGOOSE (Para as Transferências)
// ======================================================
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas via Mongoose"))
  .catch((err) => console.error("❌ Erro ao conectar no MongoDB via Mongoose:", err));

// Esquema e Modelo do Mongoose
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
    origin: ['http://localhost:5173', process.env.CLIENT_URL,'http://localhost:3000'],
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
    res.json({ message: 'Deslogado com sucesso' });
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
// ROTAS DE TRANSFERÊNCIAS (MONGOOSE)
// ======================================================
app.post("/api/transferencias", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour12: false });

    const novaTransferencia = new Transferencia({
      ...req.body,
      ip,
      horaEnvio: horaAtual,
    });

    await novaTransferencia.save();
    res.status(201).json({ message: "✅ Transferência salva com sucesso!" });
  } catch (error) {
    console.error("Erro ao salvar transferência:", error);
    res.status(500).json({ message: "❌ Erro ao salvar a transferência." });
  }
});

app.get("/api/transferencias", async (req, res) => {
  try {
    const todas = await Transferencia.find();
    res.json(todas);
  } catch (error) {
    console.error("Erro ao buscar transferências:", error);
    res.status(500).json({ message: "Erro ao buscar transferências." });
  }
});

// ======================================================
// INICIALIZAÇÃO DO SERVIDOR
// ======================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando unificado na porta ${PORT}`);
});