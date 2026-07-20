const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Funções auxiliares para persistência robusta em mobile
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
    // Nota: cookie removido — token JWT nunca deve ficar em cookie JS-acessível
  } catch (error) {
    console.error(`Erro ao salvar ${key}:`, error);
  }
}

function getFromStorage(key) {
  try {
    let value = localStorage.getItem(key);
    if (value) return value;

    value = sessionStorage.getItem(key);
    if (value) {
      localStorage.setItem(key, value);
      return value;
    }

    return null;
  } catch (error) {
    console.error(`Erro ao recuperar ${key}:`, error);
    return null;
  }
}

function getToken() {
  return getFromStorage('c10_token');
}

function saveToken(token) {
  saveToStorage('c10_token', token);
}

function saveUser(user) {
  saveToStorage('c10_user', typeof user === 'string' ? user : JSON.stringify(user));
}

async function req(method, url, body, customToken) {
  const token = customToken || getToken();
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

const get  = (url)        => req('GET',    url);
const post = (url, body)  => req('POST',   url, body);
const put  = (url, body)  => req('PUT',    url, body);
const patch= (url, body)  => req('PATCH',  url, body);
const del  = (url)        => req('DELETE', url);

export const api = {
  get,
  post,
  put,
  patch,
  del,
  auth: {
    login: (email, senha) => post('/auth/login', { email, senha }),
    googleLogin: (credential) => post('/auth/google', { credential }),
    register: (data) => post('/auth/register', data),
    googleRegister: (credential) => post('/auth/google-register', { credential }),
    completeOficina: (token, data) => req('POST', '/auth/complete-oficina', data, token),
    me: () => get('/auth/me'), // busca dados atualizados do usuário logado
  },
  admin: {
    dashboard: ()                    => get('/admin/dashboard'),
    trocarSenha: (senha_atual, senha_nova) => post('/admin/trocar-senha', { senha_atual, senha_nova }),
    oficinas:  {
      list:    (status)              => get('/admin/oficinas' + (status ? '?status='+status : '')),
      create:  (data)                => post('/admin/oficinas', data),
      update:  (id, data)            => put('/admin/oficinas/'+id, data),
      setStatus:(id, status)         => patch('/admin/oficinas/'+id+'/status', { status }),
      remove:  (id)                  => del('/admin/oficinas/'+id),
      usuarios:(id)                  => get('/admin/oficinas/'+id+'/usuarios'),
      detalhes:(id)                  => get('/admin/oficinas/'+id+'/detalhes'),
    },
    vencendo:  ()                    => get('/admin/vencendo'),
    renovarLote:(data)               => post('/admin/renovar-lote', data),
    usuarios: {
      create:  (data)                => post('/admin/usuarios', data),
      pendentes: ()                  => get('/admin/usuarios-pendentes'),
      desvincular: (id)              => patch('/admin/usuarios/'+id+'/desvincular', {}),
      remove:  (id)                  => del('/admin/usuarios/'+id),
      redefinirSenha: (id, nova_senha) => req('PATCH', '/admin/usuarios/'+id+'/redefinir-senha', { nova_senha }),
    },
    pagamentos: {
      list:    (oficina_id)          => get('/admin/pagamentos' + (oficina_id ? '?oficina_id='+oficina_id : '')),
      create:  (data)                => post('/admin/pagamentos', data),
    },
  },
  app: {
    dashboard: ()                    => get('/app/dashboard'),
    config: {
      get:     ()                    => get('/app/config'),
      save:    (data)                => put('/app/config', data),
    },
    clientes: {
      list:    (q)                   => get('/app/clientes' + (q ? '?q='+encodeURIComponent(q) : '')),
      create:  (data)                => post('/app/clientes', data),
      update:  (id, data)            => put('/app/clientes/'+id, data),
      remove:  (id)                  => del('/app/clientes/'+id),
    },
    veiculos: {
      list:    (cliente_id)          => get('/app/veiculos' + (cliente_id ? '?cliente_id='+cliente_id : '')),
      create:  (data)                => post('/app/veiculos', data),
      update:  (id, data)            => put('/app/veiculos/'+id, data),
      remove:  (id)                  => del('/app/veiculos/'+id),
    },
    os: {
      list:    (status)              => get('/app/os' + (status ? '?status='+status : '')),
      create:  (data)                => post('/app/os', data),
      update:  (id, data)            => put('/app/os/'+id, data),
      setStatus:(id, status)         => patch('/app/os/'+id+'/status', { status }),
      remove:  (id)                  => del('/app/os/'+id),
      pagamento:(id, data)           => post('/app/os/'+id+'/pagamento', data),
      pagamentos:(id)                => get('/app/os/'+id+'/pagamentos'),
      fotos: {
        list:   (osId)              => get('/app/os/'+osId+'/fotos'),
        get:    (osId, fotoId)      => get('/app/os/'+osId+'/fotos/'+fotoId),
        upload: (osId, fotos)       => post('/app/os/'+osId+'/fotos', { fotos }),
        remove: (osId, fotoId)      => del('/app/os/'+osId+'/fotos/'+fotoId),
      },
    },
    orcamentos: {
      list:    ()                    => get('/app/orcamentos'),
      create:  (data)                => post('/app/orcamentos', data),
      update:  (id, data)            => put('/app/orcamentos/'+id, data),
      setStatus:(id, status)         => patch('/app/orcamentos/'+id+'/status', { status }),
      remove:  (id)                  => del('/app/orcamentos/'+id),
    },
    agenda: {
      list:    (data)                => get('/app/agenda' + (data ? '?data='+data : '')),
      create:  (data)                => post('/app/agenda', data),
      remove:  (id)                  => del('/app/agenda/'+id),
    },
    lembretes: {
      list:    ()                    => get('/app/lembretes'),
      create:  (data)                => post('/app/lembretes', data),
      update:  (id, data)            => put('/app/lembretes/'+id, data),
      remove:  (id)                  => del('/app/lembretes/'+id),
    },
    estoque: {
      list:    (categoria)           => get('/app/estoque' + (categoria ? '?categoria='+categoria : '')),
      create:  (data)                => post('/app/estoque', data),
      update:  (id, data)            => put('/app/estoque/'+id, data),
      remove:  (id)                  => del('/app/estoque/'+id),
    },
    despesas: {
      list:    (inicio, fim)         => get('/app/despesas' + (inicio||fim ? '?'+(inicio?'inicio='+inicio:'')+(inicio&&fim?'&':'')+(fim?'fim='+fim:'') : '')),
      create:  (data)                => post('/app/despesas', data),
      update:  (id, data)            => put('/app/despesas/'+id, data),
      remove:  (id)                  => del('/app/despesas/'+id),
    },
    parcelasReceber: {
      list:    ()                    => get('/app/parcelas-receber'),
      marcarRecebido: (id)           => patch('/app/parcelas-receber/'+id+'/recebido', {}),
    },
    pagamentosOS: {
      list:    ()                    => get('/app/pagamentos-os'),
    },
  },
};

// Exportar funções de storage para uso em outras partes da aplicação
export { saveToken, saveUser, getToken, getFromStorage, saveToStorage };
