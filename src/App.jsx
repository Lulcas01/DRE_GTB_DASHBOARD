import React, { useState } from 'react';
import FinanceDashboard from './FinanceDashboard';
import Login from './components/Login/Login'; // Certifique-se de criar este arquivo na pasta pages

function App() {
  // Estado simples de autenticação (depois podemos melhorar com Contexto)
  // Tenta ler do localStorage só pra manter a sessão visualmente se der F5 (opcional), 
  // mas a segurança real é o cookie.
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
     // Chama o backend para limpar o cookie
     await fetch('http://localhost:5000/api/auth/logout', { method: 'POST' });
     setUser(null);
  };

  // SE NÃO TIVER USUÁRIO -> MOSTRA TELA DE LOGIN
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // SE TIVER USUÁRIO -> MOSTRA O DASHBOARD
  return (
    <div>
        {/* Botãozinho de Sair temporário no topo */}
        <div className="fixed top-4 right-4 z-50">
            <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-xs font-bold shadow-lg"
            >
                Sair
            </button>
        </div>
        
        <FinanceDashboard />
    </div>
  );
}

export default App;