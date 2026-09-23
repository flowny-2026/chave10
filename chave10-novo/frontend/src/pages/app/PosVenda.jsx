import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useSegmento } from '../../hooks/useSegmento';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  date: iso => { if (!iso) return '-'; const s = String(iso).slice(0, 10); const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; },
};

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>{msg}</div>;
}

// Nome da oficina para assinar as mensagens
function getOficinaNome() {
  try { return JSON.parse(localStorage.getItem('c10_oficina'))?.nome || 'nossa oficina'; }
  catch { return 'nossa oficina'; }
}

// Abre o WhatsApp com a mensagem pronta (semi-automático)
function abrirWhatsApp(telefone, msg) {
  const tel = (telefone || '').replace(/\D/g, '');
  if (!tel) return false;
  const telFull = tel.startsWith('55') ? tel : '55' + tel;
  window.open(`https://wa.me/${telFull}?text=${encodeURIComponent(msg)}`, '_blank');
  return true;
}

function primeiroNome(nome) {
  return (nome || 'cliente').trim().split(/\s+/)[0];
}

function nomeVeiculo(item, t) {
  const marca = item.veiculo_marca || '';
  const modelo = item.veiculo_modelo || '';
  const junto = `${marca} ${modelo}`.trim();
  return junto || `seu ${t.veiculo.toLowerCase()}`;
}

export default function AppPosVenda() {
  const t = useSegmento();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [enviados, setEnviados] = useState({}); // marca visual "enviado" por item

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }

  useEffect(() => {
    api.app.posVenda.list()
      .then(setData)
      .catch(() => showToast('Erro ao carregar a central de pós-venda', 'error'))
      .finally(() => setLoading(false));
  }, []);

  function enviar(chaveItem, telefone, msg) {
    if (!abrirWhatsApp(telefone, msg)) {
      showToast('Cliente sem telefone válido', 'error');
      return;
    }
    setEnviados(prev => ({ ...prev, [chaveItem]: true }));
    showToast('WhatsApp aberto!');
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div className="spinner" />
    </div>
  );

  const oficina = getOficinaNome();
  const posOS = data?.posOS || [];
  const revisoes = data?.revisoes || [];
  const orcamentos = data?.orcamentos || [];
  const aniversarios = data?.aniversarios || [];
  const totalItens = posOS.length + revisoes.length + orcamentos.length + aniversarios.length;

  // ── Geradores de mensagem ────────────────────────────────
  const msgPosOS = (o) =>
    `Olá ${primeiroNome(o.cliente_nome)}! 👋\n\nAqui é da ${oficina}. Passando para saber como está o *${nomeVeiculo(o, t)}* após o serviço que fizemos. Está tudo funcionando bem? 🔧\n\nQualquer dúvida ou necessidade, é só chamar. Obrigado pela confiança! 😊`;

  const msgRevisao = (r) =>
    `Olá ${primeiroNome(r.cliente_nome)}! 👋\n\nAqui é da ${oficina}. Passando para lembrar que o *${nomeVeiculo(r, t)}* está com ${r.descricao ? `*${r.descricao}*` : 'uma manutenção'} prevista${r.data_previsao ? ` para *${fmt.date(r.data_previsao)}*` : ''}.\n\nQuer agendar? É só responder por aqui. 📅`;

  const msgOrcamento = (o) =>
    `Olá ${primeiroNome(o.cliente_nome)}! 👋\n\nAqui é da ${oficina}. Tudo bem? Passando para saber se você teve a chance de analisar o orçamento ${o.numero ? `*${o.numero}* ` : ''}do *${nomeVeiculo(o, t)}*${o.total ? ` (total: *${fmt.currency(o.total)}*)` : ''}.\n\nEstamos à disposição para tirar qualquer dúvida e seguir com o serviço quando quiser! 🔧`;

  const msgAniversario = (a) =>
    `Olá ${primeiroNome(a.cliente_nome)}! 🎉\n\nA equipe da ${oficina} passa para desejar um *feliz aniversário*! 🥳\n\nQue seu dia seja especial. Conte sempre com a gente. 🚗💙`;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Central de Pós-venda</div>
          <div className="page-subtitle">
            {totalItens > 0
              ? `${totalItens} contato(s) sugerido(s) para hoje`
              : 'Nenhum contato pendente no momento'}
          </div>
        </div>
      </div>

      {totalItens === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-icon">✅</div>
            <p>Tudo em dia! Não há follow-ups pendentes agora.</p>
            <small style={{ color: 'var(--gray-400)', display: 'block', marginTop: 6 }}>
              As sugestões aparecem automaticamente conforme OS são finalizadas, orçamentos ficam parados, revisões se aproximam e aniversários chegam.
            </small>
          </div>
        </div>
      )}

      {/* ── PÓS-VENDA APÓS OS ──────────────────────────────── */}
      {posOS.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">🔧 Pós-venda — serviços recentes ({posOS.length})</div>
          </div>
          <div className="pv-list">
            {posOS.map(o => {
              const chave = 'os-' + o.id;
              return (
                <PvRow
                  key={chave}
                  nome={o.cliente_nome}
                  sub={`${nomeVeiculo(o, t)}${o.placa ? ' · ' + o.placa : ''} · finalizado em ${fmt.date(o.data)}`}
                  enviado={enviados[chave]}
                  onEnviar={() => enviar(chave, o.cliente_telefone, msgPosOS(o))}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── LEMBRETE DE REVISÃO / RETORNO ──────────────────── */}
      {revisoes.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">📅 Lembretes de revisão / retorno ({revisoes.length})</div>
          </div>
          <div className="pv-list">
            {revisoes.map(r => {
              const chave = 'rev-' + r.id;
              return (
                <PvRow
                  key={chave}
                  nome={r.cliente_nome}
                  sub={`${nomeVeiculo(r, t)}${r.placa ? ' · ' + r.placa : ''} · ${r.descricao || 'revisão'}${r.data_previsao ? ' · ' + fmt.date(r.data_previsao) : ''}`}
                  enviado={enviados[chave]}
                  onEnviar={() => enviar(chave, r.cliente_telefone, msgRevisao(r))}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── ORÇAMENTO PARADO ───────────────────────────────── */}
      {orcamentos.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">📋 Orçamentos parados ({orcamentos.length})</div>
          </div>
          <div className="pv-list">
            {orcamentos.map(o => {
              const chave = 'orc-' + o.id;
              return (
                <PvRow
                  key={chave}
                  nome={o.cliente_nome}
                  sub={`${o.numero || 'Orçamento'} · ${nomeVeiculo(o, t)}${o.total ? ' · ' + fmt.currency(o.total) : ''} · criado em ${fmt.date(o.criado_em)}`}
                  enviado={enviados[chave]}
                  onEnviar={() => enviar(chave, o.cliente_telefone, msgOrcamento(o))}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── ANIVERSARIANTES ────────────────────────────────── */}
      {aniversarios.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">🎂 Aniversariantes da semana ({aniversarios.length})</div>
          </div>
          <div className="pv-list">
            {aniversarios.map(a => {
              const chave = 'niver-' + a.cliente_id;
              return (
                <PvRow
                  key={chave}
                  nome={a.cliente_nome}
                  sub={`Aniversário em ${fmt.date(a.data_nascimento).slice(0, 5)}`}
                  enviado={enviados[chave]}
                  onEnviar={() => enviar(chave, a.cliente_telefone, msgAniversario(a))}
                />
              );
            })}
          </div>
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} />

      <style>{`
        .pv-list { display: flex; flex-direction: column; }
        .pv-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--gray-100);
        }
        .pv-row:last-child { border-bottom: none; }
        .pv-info { min-width: 0; flex: 1; }
        .pv-nome { font-size: var(--font-sm); font-weight: 600; color: var(--gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pv-sub { font-size: var(--font-xs); color: var(--gray-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
      `}</style>
    </div>
  );
}

// Linha reutilizável de contato
function PvRow({ nome, sub, enviado, onEnviar }) {
  return (
    <div className="pv-row">
      <div className="pv-info">
        <div className="pv-nome">{nome || 'Cliente'}</div>
        <div className="pv-sub">{sub}</div>
      </div>
      <button
        className={`btn btn-sm ${enviado ? 'btn-outline' : 'btn-success'}`}
        onClick={onEnviar}
        style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        {enviado ? '✓ Enviado' : '💬 WhatsApp'}
      </button>
    </div>
  );
}
