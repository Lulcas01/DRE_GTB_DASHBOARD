import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();

// --- CONFIGURAÇÕES E SEGREDOS ---
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// Trava de Segurança: Se esquecer a senha no .env, o servidor nem liga.
if (!JWT_SECRET) {
    console.error("❌ ERRO FATAL: A variável JWT_SECRET não está no .env");
    process.exit(1);
}

// Configuração CORS para aceitar Cookies do Frontend
app.use(cors({
    origin: 'http://localhost:5173', // URL do seu React
    credentials: true // Permite o tráfego de cookies
}));

app.use(express.json());
app.use(cookieParser()); // Habilita leitura de cookies

// --- CONEXÃO COM O BANCO ---
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

// ======================================================
// ROTAS DE AUTENTICAÇÃO (AUTH)
// ======================================================

// 1. ROTA DE LOGIN (COM OPÇÃO DE "MANTER CONECTADO")
app.post('/api/auth/login', async (req, res) => {
    let client;
    try {
        // Recebe email, senha e a opção 'remember' (lembrar de mim)
        const { email, password, remember } = req.body;

        client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        
        // A. Busca usuário
        const user = await db.collection('users').findOne({ email });
        if (!user) return res.status(401).json({ error: 'Email não encontrado' });

        // B. Verifica Senha (Hash)
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });

        // C. Configura Duração da Sessão
        // Se marcou "Manter Conectado": 30 dias. Se não: 24 horas.
        const tokenDuration = remember ? '30d' : '24h';
        const cookieDuration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

        // D. Gera Token
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: tokenDuration });

        // E. Envia Cookie Seguro
        res.cookie('auth_token', token, {
            httpOnly: true, // Javascript não lê (Proteção XSS)
            secure: false,  // Localhost = false. Na produção (HTTPS) = true.
            sameSite: 'lax',
            maxAge: cookieDuration // Duração dinâmica (1 dia ou 30 dias)
        });

        console.log(`✅ Login realizado: ${user.email} (Manter conectado: ${remember ? 'SIM' : 'NÃO'})`);
        res.json({ message: 'Logado com sucesso', user: { name: user.name, email: user.email } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno no login' });
    } finally {
        if (client) client.close();
    }
});

// 2. ROTA DE LOGOUT (LIMPA O COOKIE)
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Deslogado com sucesso' });
});

// 3. ROTA DE VERIFICAÇÃO DE SESSÃO (PERSISTÊNCIA)
app.get('/api/auth/check', async (req, res) => {
    const token = req.cookies.auth_token;
    
    if (!token) {
        return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
        // Verifica se o token é válido e não expirou
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Retorna que está tudo ok para o React liberar a tela
        res.json({ 
            isAuthenticated: true, 
            user: { id: decoded.id, email: decoded.email || 'admin' } 
        });

    } catch (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
});

// ======================================================
// ROTAS DE DADOS (DASHBOARD)
// ======================================================

app.get('/api/dados', async (req, res) => {
    // TODO: Adicionar middleware de proteção aqui depois!
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

// --- INICIALIZAÇÃO ---
app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando a todo vapor em: http://localhost:${PORT}`);
});