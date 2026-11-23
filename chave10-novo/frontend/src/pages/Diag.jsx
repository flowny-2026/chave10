/**
 * Página de diagnóstico de sessão — acessível em /diag
 * Mostra o estado do localStorage na tela do celular sem precisar de DevTools.
 * Remover após resolver o problema de sessão.
 */
import { useState } from 'react';

function decode(token) {
  try {
    const p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(p + '=='.slice(0, (4 - p.length % 4) % 4)));
  } catch { return null; }
}

export default function Diag() {
  const [resultado, setResultado] = useState(null);
  const [refreshResult, setRefreshResult] = useState(null);

  function verificar() {
    const token = localStorage.getItem('c10_token');
    const user  = localStorage.getItem('c10_user');
    const agora = Date.now();

    let info = { token: !!token, user: !!user };

    if (token) {
      const payload = decode(token);
      if (payload) {
        const expMs = payload.exp ? payload.exp * 1000 : null;
        info.exp = expMs ? new Date(expMs).toLocaleString('pt-BR') : 'sem exp';
        info.expirado = expMs ? expMs <= agora : false;
        info.restante = expMs ? Math.round((expMs - agora) / 86400000) + ' dias' : 'n/a';
        info.perfil = payload.perfil;
        info.id = payload.id;
        info.primeiros20 = token.slice(0, 20) + '...';
      } else {
        info.tokenDecodificado = 'FALHOU';
      }
    }

    if (user) {
      try { info.userName = JSON.parse(user).nome; } catch {}
    }

    setResultado(info);
  }

  async function testarRefresh() {
    const token = localStorage.getItem('c10_token');
    if (!token) { setRefreshResult('Sem token no localStorage'); return; }
    setRefreshResult('Aguardando...');
    try {
      const BASE = import.meta.env.VITE_API_URL || 'https://chave10-api.onrender.com/api';
      const res = await fetch(BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('c10_token', data.token);
        const p = decode(data.token);
        setRefreshResult('✅ Novo token salvo! Expira em: ' + (p?.exp ? new Date(p.exp * 1000).toLocaleString('pt-BR') : '?'));
      } else {
        setRefreshResult('❌ HTTP ' + res.status + ': ' + JSON.stringify(data));
      }
    } catch (e) {
      setRefreshResult('❌ Erro de rede: ' + e.message);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 13, maxWidth: 500 }}>
      <h2 style={{ fontSize: 18 }}>Diagnóstico de Sessão</h2>

      <button onClick={verificar} style={{ padding: '10px 20px', marginBottom: 16, fontSize: 14, borderRadius: 8, background: '#1E3A5F', color: '#fff', border: 'none', cursor: 'pointer' }}>
        1. Verificar localStorage
      </button>

      {resultado && (
        <pre style={{ background: '#0d1117', color: '#e6edf3', padding: 16, borderRadius: 8, marginBottom: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(resultado, null, 2)}
        </pre>
      )}

      <button onClick={testarRefresh} style={{ padding: '10px 20px', marginBottom: 16, fontSize: 14, borderRadius: 8, background: '#F97316', color: '#fff', border: 'none', cursor: 'pointer' }}>
        2. Testar /auth/refresh
      </button>

      {refreshResult && (
        <pre style={{ background: '#0d1117', color: '#e6edf3', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {refreshResult}
        </pre>
      )}

      <p style={{ marginTop: 20, color: '#666', fontSize: 11 }}>
        Acesse: chave10.tech/diag<br />
        Página temporária de diagnóstico.
      </p>
    </div>
  );
}
