import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { api } from '../api';

// Colunas que o sistema aceita
const CAMPOS_SISTEMA = ['nome', 'telefone', 'email', 'endereco', 'obs'];
const CAMPOS_LABEL   = { nome: 'Nome *', telefone: 'Telefone', email: 'Email', endereco: 'Endereço', obs: 'Observação' };

// Tenta adivinhar o campo do sistema a partir do nome da coluna do arquivo
function adivinharCampo(coluna) {
  const c = coluna.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/nome|cliente|razao|razão|proprietario|proprietário/.test(c)) return 'nome';
  if (/tel|fone|celular|whats|contato|phone/.test(c)) return 'telefone';
  if (/email|e-mail|mail/.test(c)) return 'email';
  if (/end|rua|logradouro|bairro|cidade|cep|address/.test(c)) return 'endereco';
  if (/obs|nota|anotacao|anotação|comment/.test(c)) return 'obs';
  return '';
}

function lerArquivo(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: r => resolve({ colunas: r.meta.fields || [], linhas: r.data }),
        error: reject,
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const colunas = data.length > 0 ? Object.keys(data[0]) : [];
          resolve({ colunas, linhas: data });
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Formato não suportado. Use CSV, XLS ou XLSX.'));
    }
  });
}

export default function ImportarClientes({ onImportado }) {
  const [etapa, setEtapa]       = useState('idle'); // idle | mapeando | preview | importando | done
  const [colunas, setColunas]   = useState([]);
  const [linhas, setLinhas]     = useState([]);
  const [mapa, setMapa]         = useState({});     // { coluna_arquivo: campo_sistema }
  const [preview, setPreview]   = useState([]);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro]         = useState('');
  const inputRef = useRef();

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setErro('');
    try {
      const { colunas: cols, linhas: rows } = await lerArquivo(file);
      if (!cols.length) { setErro('Arquivo vazio ou sem cabeçalho.'); return; }
      setColunas(cols);
      setLinhas(rows);
      // Mapeamento automático
      const mapaAuto = {};
      cols.forEach(c => { const campo = adivinharCampo(c); if (campo) mapaAuto[c] = campo; });
      setMapa(mapaAuto);
      setEtapa('mapeando');
    } catch (err) {
      setErro(err.message || 'Erro ao ler arquivo.');
    }
    e.target.value = '';
  }

  function gerarPreview() {
    // Verifica se "nome" está mapeado
    const temNome = Object.values(mapa).includes('nome');
    if (!temNome) { setErro('Mapeie pelo menos a coluna "Nome" para continuar.'); return; }
    setErro('');

    const registros = linhas.slice(0, 5).map(linha => {
      const reg = {};
      Object.entries(mapa).forEach(([col, campo]) => { if (campo) reg[campo] = String(linha[col] || '').trim(); });
      return reg;
    });
    setPreview(registros);
    setEtapa('preview');
  }

  async function importar() {
    setEtapa('importando');
    let ok = 0, falhas = 0;

    for (const linha of linhas) {
      const reg = {};
      Object.entries(mapa).forEach(([col, campo]) => { if (campo) reg[campo] = String(linha[col] || '').trim(); });
      if (!reg.nome) { falhas++; continue; }
      try {
        await api.app.clientes.create(reg);
        ok++;
      } catch { falhas++; }
    }

    setResultado({ ok, falhas, total: linhas.length });
    setEtapa('done');
    if (ok > 0 && onImportado) onImportado();
  }

  function resetar() {
    setEtapa('idle'); setColunas([]); setLinhas([]); setMapa({});
    setPreview([]); setResultado(null); setErro('');
  }

  // ── RENDER ──────────────────────────────────────────────────

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-header">
        <div className="card-title">📥 Importar clientes</div>
        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>CSV, XLS ou XLSX exportado de qualquer software</span>
      </div>

      {/* ETAPA: idle */}
      {etapa === 'idle' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16, lineHeight: 1.6 }}>
            Exporte seus clientes do software atual em <strong>CSV ou Excel</strong> e faça o upload aqui.
            O sistema detecta automaticamente as colunas e você confirma antes de importar.
          </p>

          {/* Dica de softwares */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--gray-700)' }}>Como exportar do seu software:</strong><br />
            • <strong>AutoManager / Mecânico Pro:</strong> Cadastros → Clientes → Exportar → CSV<br />
            • <strong>Oficina Fácil / GestãoOS:</strong> Relatórios → Clientes → Exportar Excel<br />
            • <strong>Planilha Excel/Google Sheets:</strong> Arquivo → Baixar como → CSV<br />
            • <strong>Qualquer outro:</strong> procure "exportar" ou "relatório" no menu
          </div>

          <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', gap: 8 }}>
            📂 Selecionar arquivo
            <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: 'none' }} onChange={handleFile} />
          </label>

          {erro && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>{erro}</p>}
        </div>
      )}

      {/* ETAPA: mapeando colunas */}
      {etapa === 'mapeando' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16 }}>
            <strong>{linhas.length} registros</strong> encontrados. Associe as colunas do arquivo aos campos do sistema:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 20 }}>
            {colunas.map(col => (
              <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col}>
                  {col}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                <select
                  value={mapa[col] || ''}
                  onChange={e => setMapa(m => ({ ...m, [col]: e.target.value }))}
                  style={{ flex: 1, fontSize: 12, padding: '5px 8px' }}
                >
                  <option value="">— ignorar —</option>
                  {CAMPOS_SISTEMA.map(f => (
                    <option key={f} value={f}>{CAMPOS_LABEL[f]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {erro && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={resetar}>Cancelar</button>
            <button className="btn btn-primary" onClick={gerarPreview}>Ver prévia →</button>
          </div>
        </div>
      )}

      {/* ETAPA: preview */}
      {etapa === 'preview' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>
            Prévia dos primeiros {preview.length} registros (de {linhas.length} total):
          </p>

          <div className="table-wrapper" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  {Object.values(mapa).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map(campo => (
                    <th key={campo}>{CAMPOS_LABEL[campo]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((reg, i) => (
                  <tr key={i}>
                    {Object.values(mapa).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map(campo => (
                      <td key={campo} style={{ fontSize: 12 }}>{reg[campo] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1D4ED8', marginBottom: 20 }}>
            ℹ️ Serão importados <strong>{linhas.length} clientes</strong>. Registros sem nome serão ignorados.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setEtapa('mapeando')}>← Voltar</button>
            <button className="btn btn-primary" onClick={importar}>✅ Confirmar importação</button>
          </div>
        </div>
      )}

      {/* ETAPA: importando */}
      {etapa === 'importando' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
          <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>Importando clientes, aguarde...</p>
        </div>
      )}

      {/* ETAPA: done */}
      {etapa === 'done' && resultado && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{resultado.falhas === 0 ? '🎉' : '⚠️'}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
            Importação concluída!
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>{resultado.ok}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>importados</div>
            </div>
            {resultado.falhas > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--danger)' }}>{resultado.falhas}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>ignorados</div>
              </div>
            )}
          </div>
          <button className="btn btn-outline" onClick={resetar}>Importar outro arquivo</button>
        </div>
      )}
    </div>
  );
}
