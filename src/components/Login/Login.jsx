import React, { useState } from 'react';
import { Lock, Mail, Loader2, ShieldCheck, CheckSquare, Square } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false); // NOVO ESTADO
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // ENVIANDO O REMEMBER:
        body: JSON.stringify({ email, password, remember }), 
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao entrar');
      if (onLoginSuccess) onLoginSuccess(data.user);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
          <p className="text-slate-500 text-sm mt-1">Painel Financeiro GTB Seguro</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold mb-6 border border-red-100 flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Inputs de Email e Senha (iguais ao anterior) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
                placeholder="ex: email@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* --- NOVO CHECKBOX "MANTER CONECTADO" --- */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRemember(!remember)}>
             <div className={`text-blue-600 transition-all ${remember ? 'scale-110' : 'text-slate-300'}`}>
                {remember ? <CheckSquare size={20} /> : <Square size={20} />}
             </div>
             <span className="text-sm text-slate-600 select-none">Manter conectado por 30 dias</span>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Acessar Sistema'}
          </button>
        </form>
        
        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
          <Lock size={10} /> Conexão segura
        </p>
      </div>
    </div>
  );
}